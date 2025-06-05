/**
 * Test utilities and helper functions for Jira Timesheet CLI tests
 * Updated for MSW and mock-fs integration
 */

import { vi } from 'vitest';
import mockFs from 'mock-fs';

/**
 * Create mock Jira configuration
 */
export const createMockJiraConfig = (overrides = {}) => ({
  server: 'https://test.atlassian.net',
  login: 'test@example.com',
  project: {
    key: 'TEST'
  },
  ...overrides
});

/**
 * Create mock Jira issue response (for MSW handlers)
 */
export const createMockJiraIssueResponse = (overrides = {}) => ({
  issues: [
    {
      key: 'TEST-123',
      fields: {
        summary: 'Test issue summary'
      }
    },
    {
      key: 'TEST-124',
      fields: {
        summary: 'Another test issue'
      }
    }
  ],
  total: 2,
  maxResults: 50,
  startAt: 0,
  ...overrides
});

/**
 * Create mock Jira worklog response (for MSW handlers)
 */
export const createMockJiraWorklogResponse = (overrides = {}) => ({
  worklogs: [
    {
      id: '12345',
      timeSpent: '2h',
      timeSpentSeconds: 7200,
      comment: 'Working on feature implementation',
      started: '2024-01-15T09:00:00.000+0000',
      created: '2024-01-15T09:00:00.000+0000',
      updated: '2024-01-15T09:00:00.000+0000',
      author: {
        displayName: 'Test User',
        emailAddress: 'test@example.com',
        accountId: 'test-account-id'
      }
    },
    {
      id: '12346',
      timeSpent: '1h 30m',
      timeSpentSeconds: 5400,
      comment: 'Code review and testing',
      started: '2024-01-15T14:00:00.000+0000',
      created: '2024-01-15T14:00:00.000+0000',
      updated: '2024-01-15T14:00:00.000+0000',
      author: {
        displayName: 'Test User',
        emailAddress: 'test@example.com',
        accountId: 'test-account-id'
      }
    }
  ],
  total: 2,
  maxResults: 1048576,
  startAt: 0,
  ...overrides
});

/**
 * Create mock user info response (for MSW handlers)
 */
export const createMockUserResponse = (overrides = {}) => ({
  displayName: 'Test User',
  emailAddress: 'test@example.com',
  accountId: 'test-account-id',
  active: true,
  timeZone: 'Europe/Berlin',
  locale: 'de_DE',
  ...overrides
});

/**
 * Setup mock file system using mock-fs
 */
export const setupMockFileSystem = (fileStructure = {}) => {
  const defaultStructure = {
    '/mock/home': {
      '.config': {
        '.jira': {
          '.config.yml': `
server: https://test.atlassian.net
login: test@example.com
project:
  key: TEST
installation: cloud
auth_type: basic
          `.trim()
        }
      }
    },
    '/tmp': {},
    ...fileStructure
  };

  mockFs(defaultStructure);
  
  return {
    addFile: (path, content) => {
      mockFs.restore();
      mockFs({
        ...defaultStructure,
        [path]: content
      });
    },
    
    addDirectory: (path, contents = {}) => {
      mockFs.restore();
      mockFs({
        ...defaultStructure,
        [path]: contents
      });
    },
    
    restore: () => mockFs.restore()
  };
};

/**
 * Setup mock environment variables for tests
 */
export const setupMockEnvironment = () => {
  const originalEnv = { ...process.env };
  
  process.env.JIRA_API_TOKEN = 'test-api-token';
  process.env.NODE_ENV = 'test';
  
  return () => {
    process.env = originalEnv;
  };
};

/**
 * Mock console methods to capture output
 */
export const mockConsoleOutput = () => {
  const logs = [];
  const errors = [];
  const warns = [];
  
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
  };
  
  console.log = vi.fn((...args) => logs.push(args.join(' ')));
  console.error = vi.fn((...args) => errors.push(args.join(' ')));
  console.warn = vi.fn((...args) => warns.push(args.join(' ')));
  
  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
    }
  };
};

/**
 * Create date range for testing
 */
export const createDateRange = (startDate = '2024-01-15', endDate = '2024-01-16') => ({
  start: startDate,
  end: endDate,
  startISO: new Date(startDate).toISOString(),
  endISO: new Date(endDate).toISOString()
});

/**
 * Create mock command line options
 */
export const createMockOptions = (overrides = {}) => ({
  project: 'TEST',
  user: ['test@example.com'],
  start: '2024-01-15',
  end: '2024-01-16',
  format: 'table',
  output: null,
  config: null,
  ...overrides
});

/**
 * Validate CSV output format
 */
export const validateCsvOutput = (csvContent) => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  return {
    isValid: headers.includes('User') && headers.includes('Date') && headers.includes('Issue Key'),
    headers,
    dataRows: lines.slice(1),
    lineCount: lines.length
  };
};

/**
 * Validate Markdown output format
 */
export const validateMarkdownOutput = (markdownContent) => {
  const hasTitle = markdownContent.includes('# Stundenzettel');
  const hasUserSection = markdownContent.includes('## 👤');
  const hasTable = markdownContent.includes('| Issue Key |');
  
  return {
    isValid: hasTitle && hasUserSection && hasTable,
    hasTitle,
    hasUserSection,
    hasTable
  };
};

/**
 * Create test timeout wrapper
 */
export const withTimeout = (fn, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);
    
    Promise.resolve(fn())
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
};

/**
 * Create mock fetch response (legacy support for existing tests)
 * @deprecated Use MSW handlers instead
 */
export const createMockFetchResponse = (data, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Map(Object.entries(headers)),
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  blob: vi.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
});

/**
 * Create mock file system operations (legacy support)
 * @deprecated Use setupMockFileSystem with mock-fs instead
 */
export const mockFileSystem = () => {
  const files = new Map();
  
  return {
    addFile: (path, content) => files.set(path, content),
    removeFile: (path) => files.delete(path),
    getFile: (path) => files.get(path),
    hasFile: (path) => files.has(path),
    clear: () => files.clear(),
    
    // Mock fs.readFile
    mockReadFile: vi.fn((path) => {
      if (files.has(path)) {
        return Promise.resolve(files.get(path));
      }
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }),
    
    // Mock fs.writeFile
    mockWriteFile: vi.fn((path, content) => {
      files.set(path, content);
      return Promise.resolve();
    })
  };
};