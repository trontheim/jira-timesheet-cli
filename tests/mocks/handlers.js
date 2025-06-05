/**
 * MSW handlers for Jira API endpoints
 * Provides realistic HTTP request mocking for tests
 */

import { http, HttpResponse } from 'msw';

// Base URL for Jira API
const JIRA_BASE_URL = 'https://test.atlassian.net';

/**
 * Create mock user response for /rest/api/3/myself endpoint
 */
const createMockUserResponse = (overrides = {}) => ({
  accountId: '5b10ac8d82e05b22cc7d4ef5',
  displayName: 'Test User',
  emailAddress: 'test@example.com',
  active: true,
  timeZone: 'Europe/Berlin',
  locale: 'en_US',
  ...overrides
});

/**
 * Create mock search response for /rest/api/3/search endpoint
 */
const createMockSearchResponse = (issues = [], overrides = {}) => ({
  expand: 'names,schema',
  startAt: 0,
  maxResults: 50,
  total: issues.length,
  issues,
  ...overrides
});

/**
 * Create mock issue for search results
 */
const createMockIssue = (overrides = {}) => ({
  id: '10001',
  key: 'TEST-123',
  self: `${JIRA_BASE_URL}/rest/api/3/issue/10001`,
  fields: {
    summary: 'Test issue summary',
    status: {
      name: 'In Progress',
      statusCategory: {
        key: 'indeterminate'
      }
    },
    assignee: {
      displayName: 'Test User',
      emailAddress: 'test@example.com'
    },
    project: {
      key: 'TEST',
      name: 'Test Project'
    },
    created: '2024-01-15T09:00:00.000+0000',
    updated: '2024-01-15T10:00:00.000+0000'
  },
  ...overrides
});

/**
 * Create mock worklog response for /rest/api/3/issue/{issueKey}/worklog endpoint
 */
const createMockWorklogResponse = (worklogs = [], overrides = {}) => ({
  startAt: 0,
  maxResults: 1048576,
  total: worklogs.length,
  worklogs,
  ...overrides
});

/**
 * Create mock worklog entry
 */
const createMockWorklog = (overrides = {}) => ({
  self: `${JIRA_BASE_URL}/rest/api/3/issue/10001/worklog/10000`,
  id: '10000',
  issueId: '10001',
  author: {
    self: `${JIRA_BASE_URL}/rest/api/3/user?accountId=5b10ac8d82e05b22cc7d4ef5`,
    accountId: '5b10ac8d82e05b22cc7d4ef5',
    displayName: 'Test User',
    emailAddress: 'test@example.com',
    active: true
  },
  comment: 'Test worklog comment',
  created: '2024-01-15T09:00:00.000+0000',
  updated: '2024-01-15T09:00:00.000+0000',
  started: '2024-01-15T09:00:00.000+0000',
  timeSpent: '2h',
  timeSpentSeconds: 7200,
  ...overrides
});

/**
 * MSW request handlers for Jira API endpoints
 */
export const handlers = [
  // GET /rest/api/3/myself - User information endpoint
  http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    // Check for valid Basic Auth header
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Decode and validate credentials
    const encodedCredentials = authHeader.replace('Basic ', '');
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString();
    
    // Check for valid test credentials
    if (!decodedCredentials.includes('test@example.com') || !decodedCredentials.includes('test-api-token')) {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json(createMockUserResponse());
  }),

  // GET /rest/api/3/search - Issue search endpoint
  http.get(`${JIRA_BASE_URL}/rest/api/3/search`, ({ request }) => {
    const url = new URL(request.url);
    const jql = url.searchParams.get('jql');
    const maxResults = parseInt(url.searchParams.get('maxResults') || '50');
    const startAt = parseInt(url.searchParams.get('startAt') || '0');

    // Check for valid Basic Auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create mock issues based on JQL query
    let mockIssues = [];
    
    if (jql && jql.includes('project')) {
      // Extract project key from JQL
      const projectMatch = jql.match(/project\s*[=]\s*["]?([A-Z]+)["]?/i);
      const projectKey = projectMatch ? projectMatch[1] : 'TEST';
      
      // Check if JQL contains user filters - if so, only return results if users match
      const userFilterMatch = jql.match(/worklogAuthor\s+IN\s*\(([^)]+)\)/i);
      if (userFilterMatch) {
        const userList = userFilterMatch[1];
        // Only return issues if the JQL contains valid user emails
        if (userList.includes('valid@example.com') ||
            userList.includes('another@example.com') ||
            userList.includes('trimmed@example.com') ||
            userList.includes('included@example.com')) {
          mockIssues = [
            createMockIssue({
              key: `${projectKey}-123`,
              fields: {
                ...createMockIssue().fields,
                project: {
                  key: projectKey,
                  name: `${projectKey} Project`
                }
              }
            })
          ];
        }
      } else {
        // Create sample issues for the project
        mockIssues = [
          createMockIssue({
            key: `${projectKey}-123`,
            fields: {
              ...createMockIssue().fields,
              project: {
                key: projectKey,
                name: `${projectKey} Project`
              }
            }
          }),
          createMockIssue({
            key: `${projectKey}-124`,
            id: '10002',
            fields: {
              ...createMockIssue().fields,
              summary: 'Another test issue',
              project: {
                key: projectKey,
                name: `${projectKey} Project`
              }
            }
          })
        ];
      }
    }

    // Apply pagination
    const paginatedIssues = mockIssues.slice(startAt, startAt + maxResults);

    return HttpResponse.json(createMockSearchResponse(paginatedIssues, {
      startAt,
      maxResults,
      total: mockIssues.length
    }));
  }),

  // GET /rest/api/3/issue/{issueKey}/worklog - Worklog endpoint
  http.get(`${JIRA_BASE_URL}/rest/api/3/issue/:issueKey/worklog`, ({ params, request }) => {
    const { issueKey } = params;
    const url = new URL(request.url);
    const startedAfter = url.searchParams.get('startedAfter');
    const startedBefore = url.searchParams.get('startedBefore');

    // Check for valid Basic Auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if issue exists (basic validation)
    if (!issueKey || !issueKey.match(/^[A-Z]+-\d+$/)) {
      return HttpResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Create mock worklogs based on issue key
    let mockWorklogs = [];
    
    if (issueKey === 'TEST-123') {
      mockWorklogs = [
        createMockWorklog({
          started: '2024-01-15T09:00:00.000+0000',
          comment: 'Morning work on feature implementation',
          author: {
            ...createMockWorklog().author,
            emailAddress: 'test@example.com'
          }
        }),
        createMockWorklog({
          id: '10001',
          started: '2024-01-15T14:00:00.000+0000',
          timeSpent: '3h',
          timeSpentSeconds: 10800,
          comment: 'Afternoon debugging session',
          author: {
            ...createMockWorklog().author,
            emailAddress: 'test@example.com'
          }
        }),
        createMockWorklog({
          id: '10002',
          started: '2024-01-16T10:00:00.000+0000',
          timeSpent: '1h 30m',
          timeSpentSeconds: 5400,
          comment: 'Code review and testing',
          author: {
            ...createMockWorklog().author,
            emailAddress: 'test@example.com'
          }
        })
      ];
    } else if (issueKey === 'TEST-124') {
      mockWorklogs = [
        createMockWorklog({
          id: '10003',
          started: '2024-01-15T10:00:00.000+0000',
          timeSpent: '2h',
          timeSpentSeconds: 7200,
          comment: 'Earlier',
          author: {
            ...createMockWorklog().author,
            emailAddress: 'test@example.com'
          }
        }),
        createMockWorklog({
          id: '10004',
          started: '2024-01-15T14:00:00.000+0000',
          timeSpent: '3h',
          timeSpentSeconds: 10800,
          comment: 'Later',
          author: {
            ...createMockWorklog().author,
            emailAddress: 'test@example.com'
          }
        })
      ];
    }

    // Filter by date range if provided
    if (startedAfter) {
      const afterDate = new Date(startedAfter);
      mockWorklogs = mockWorklogs.filter(worklog =>
        new Date(worklog.started) >= afterDate
      );
    }

    if (startedBefore) {
      const beforeDate = new Date(startedBefore);
      mockWorklogs = mockWorklogs.filter(worklog =>
        new Date(worklog.started) <= beforeDate
      );
    }

    return HttpResponse.json(createMockWorklogResponse(mockWorklogs));
  }),

  // Error simulation handlers for testing error scenarios
  http.get(`${JIRA_BASE_URL}/rest/api/3/error/400`, () => {
    return HttpResponse.json(
      { error: 'Bad Request' },
      { status: 400 }
    );
  }),

  http.get(`${JIRA_BASE_URL}/rest/api/3/error/403`, () => {
    return HttpResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }),

  http.get(`${JIRA_BASE_URL}/rest/api/3/error/404`, () => {
    return HttpResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }),

  http.get(`${JIRA_BASE_URL}/rest/api/3/error/429`, () => {
    return HttpResponse.json(
      { error: 'Too Many Requests' },
      { status: 429 }
    );
  }),

  http.get(`${JIRA_BASE_URL}/rest/api/3/error/500`, () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  http.get(`${JIRA_BASE_URL}/rest/api/3/error/502`, () => {
    return HttpResponse.json(
      { error: 'Bad Gateway' },
      { status: 502 }
    );
  }),

  http.get(`${JIRA_BASE_URL}/rest/api/3/error/503`, () => {
    return HttpResponse.json(
      { error: 'Service Unavailable' },
      { status: 503 }
    );
  })
];

// Export utility functions for tests
export {
  createMockUserResponse,
  createMockSearchResponse,
  createMockIssue,
  createMockWorklogResponse,
  createMockWorklog,
  JIRA_BASE_URL
};