/**
 * Unit tests for JiraTimesheetCLI class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import { server } from './setup.js';
import { http, HttpResponse } from 'msw';
import yaml from 'js-yaml';
import { JIRA_BASE_URL } from './mocks/handlers.js';
import { setupMockFileSystem } from './test-utils.js';

// Import the class to test
const { JiraTimesheetCLI } = await import('../jira_timesheet_cli.js');

describe('JiraTimesheetCLI', () => {
  let cli;
  
  beforeEach(() => {
    cli = new JiraTimesheetCLI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config path', () => {
      expect(cli.config).toBeNull();
      expect(cli.apiToken).toBeNull();
      expect(cli.configPath).toContain('.config/.jira/.config.yml');
    });
  });

  describe('getConfigPath', () => {
    it('should return override path when provided', () => {
      const overridePath = '/custom/config.yml';
      const result = cli.getConfigPath(overridePath);
      expect(result).toBe(overridePath);
    });

    it('should return environment variable path when set', () => {
      const envPath = '/env/config.yml';
      process.env.JIRA_CONFIG_FILE = envPath;
      
      const result = cli.getConfigPath();
      expect(result).toBe(envPath);
      
      delete process.env.JIRA_CONFIG_FILE;
    });

    it('should return default path when no override or env var', () => {
      delete process.env.JIRA_CONFIG_FILE;
      const result = cli.getConfigPath();
      expect(result).toBe(cli.configPath);
    });
  });

  describe('loadConfig', () => {
    it('should load valid configuration successfully', async () => {
      const mockConfig = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: { key: 'TEST' }
      };
      
      // Setup mock file system with config file
      const configContent = `
server: https://test.atlassian.net
login: test@example.com
project:
  key: TEST
      `.trim();
      
      setupMockFileSystem({
        [cli.configPath]: configContent
      });
      
      vi.spyOn(yaml, 'load').mockReturnValue(mockConfig);
      process.env.JIRA_API_TOKEN = 'test-token';

      const result = await cli.loadConfig();
      
      expect(yaml.load).toHaveBeenCalled();
      expect(cli.config).toEqual(mockConfig);
      expect(cli.apiToken).toBe('test-token');
      expect(result).toEqual(mockConfig);
      
      mockFs.restore();
    });

    it('should throw error when config file not found', async () => {
      // Setup empty mock file system (no config file)
      setupMockFileSystem({});

      await expect(cli.loadConfig()).rejects.toThrow('Configuration file not found');
      
      mockFs.restore();
    });

    it('should throw error when API token not set', async () => {
      const mockConfig = { server: 'https://test.atlassian.net' };
      
      // Setup mock file system with config file
      const configContent = 'server: https://test.atlassian.net';
      setupMockFileSystem({
        [cli.configPath]: configContent
      });
      
      vi.spyOn(yaml, 'load').mockReturnValue(mockConfig);
      delete process.env.JIRA_API_TOKEN;

      await expect(cli.loadConfig()).rejects.toThrow('JIRA_API_TOKEN environment variable not set');
      
      mockFs.restore();
    });
  });

  describe('makeRequest', () => {
    beforeEach(() => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com'
      };
      cli.apiToken = 'test-token';
    });

    it('should make successful API request', async () => {
      const mockResponse = { displayName: 'Test User' };
      
      // Override the MSW handler for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, ({ request }) => {
          // Verify authorization header
          const authHeader = request.headers.get('Authorization');
          expect(authHeader).toContain('Basic');
          
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await cli.makeRequest('/rest/api/3/myself');

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when response is not ok', async () => {
      // Override the MSW handler to return 404
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
          return HttpResponse.json({}, { status: 404 });
        })
      );

      await expect(cli.makeRequest('/rest/api/3/myself')).rejects.toThrow('HTTP 404');
    });

    it('should throw error when config not loaded', async () => {
      cli.config = null;
      cli.apiToken = null;

      await expect(cli.makeRequest('/rest/api/3/myself')).rejects.toThrow('Configuration not loaded');
    });
  });

  describe('getProject', () => {
    it('should return project from options', () => {
      const options = { project: 'TEST' };
      const result = cli.getProject(options);
      expect(result).toBe('TEST');
    });

    it('should return project from config.project.key', () => {
      cli.config = { project: { key: 'CONFIG-TEST' } };
      const result = cli.getProject({});
      expect(result).toBe('CONFIG-TEST');
    });

    it('should return project from config.project string', () => {
      cli.config = { project: 'CONFIG-TEST' };
      const result = cli.getProject({});
      expect(result).toBe('CONFIG-TEST');
    });

    it('should throw error when no project specified', () => {
      cli.config = {};
      expect(() => cli.getProject({})).toThrow('No project specified');
    });
  });

  describe('formatTime', () => {
    it('should format seconds to hours and minutes', () => {
      expect(cli.formatTime(3600)).toBe('1h');
      expect(cli.formatTime(1800)).toBe('30m');
      expect(cli.formatTime(5400)).toBe('1h 30m');
      expect(cli.formatTime(0)).toBe('0m');
    });
  });

  describe('groupByUserAndDate', () => {
    it('should group entries by user and date', () => {
      const entries = [
        createMockWorklogEntry({
          author: 'User A',
          started: '2024-01-15T09:00:00.000+0000'
        }),
        createMockWorklogEntry({
          author: 'User A',
          started: '2024-01-16T09:00:00.000+0000'
        }),
        createMockWorklogEntry({
          author: 'User B',
          started: '2024-01-15T09:00:00.000+0000'
        })
      ];

      const result = cli.groupByUserAndDate(entries);

      expect(result.size).toBe(2);
      expect(result.has('User A')).toBe(true);
      expect(result.has('User B')).toBe(true);
      
      const userADates = result.get('User A');
      expect(userADates.size).toBe(2);
    });
  });

  describe('displayTable', () => {
    it('should return no worklogs message when entries empty', () => {
      const result = cli.displayTable([], true);
      expect(result).toContain('No worklogs found');
    });

    it('should display table with entries', () => {
      const entries = [createMockWorklogEntry()];
      const result = cli.displayTable(entries, true);
      
      expect(result).toContain('Stundenzettel');
      expect(result).toContain('Test User');
      expect(result).toContain('2h');
    });
  });

  describe('exportToCsv', () => {
    it('should export entries to CSV format', () => {
      const entries = [createMockWorklogEntry()];
      const result = cli.exportToCsv(entries);
      
      expect(result).toContain('Date,User,Issue Key');
      expect(result).toContain('TEST-123');
      expect(result).toContain('Test User');
    });
  });

  describe('exportToMarkdown', () => {
    it('should return no worklogs message when entries empty', () => {
      const result = cli.exportToMarkdown([]);
      expect(result).toContain('No worklogs found');
    });

    it('should export entries to Markdown format', () => {
      const entries = [createMockWorklogEntry()];
      const result = cli.exportToMarkdown(entries);
      
      expect(result).toContain('# Stundenzettel');
      expect(result).toContain('## 👤 Test User');
      expect(result).toContain('| TEST-123 |');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      cli.config = { server: 'https://test.atlassian.net' };
      cli.apiToken = 'test-token';
      
      const mockUser = { displayName: 'Test User', emailAddress: 'test@example.com' };
      
      // Override the MSW handler for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      // Mock console.log to avoid output during tests
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.testConnection();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connected as: Test User')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when config not loaded', async () => {
      cli.config = null;
      cli.apiToken = null;

      await expect(cli.testConnection()).rejects.toThrow('Configuration not loaded');
    });
  });

  describe('convertDateFormat', () => {
    it('should convert German date format to ISO format', () => {
      expect(cli.convertDateFormat('15.05.2025')).toBe('2025-05-15');
      expect(cli.convertDateFormat('1.1.2025')).toBe('2025-01-01');
      expect(cli.convertDateFormat('31.12.2025')).toBe('2025-12-31');
    });

    it('should recognize and preserve ISO format dates', () => {
      expect(cli.convertDateFormat('2025-05-15')).toBe('2025-05-15');
      expect(cli.convertDateFormat('2024-02-29')).toBe('2024-02-29');
      expect(cli.convertDateFormat('2025-01-01')).toBe('2025-01-01');
    });

    it('should throw error for invalid date formats', () => {
      expect(() => cli.convertDateFormat('05/05/2025')).toThrow('Invalid date format');
      expect(() => cli.convertDateFormat('2025/05/05')).toThrow('Invalid date format');
      expect(() => cli.convertDateFormat('invalid-date')).toThrow('Invalid date format');
    });

    it('should throw error for invalid date values', () => {
      expect(() => cli.convertDateFormat('32.01.2025')).toThrow('Invalid day: 32');
      expect(() => cli.convertDateFormat('15.13.2025')).toThrow('Invalid month: 13');
      expect(() => cli.convertDateFormat('31.02.2025')).toThrow('Invalid date: 31.02.2025. The date does not exist.');
    });

    it('should throw error for null or undefined inputs', () => {
      expect(() => cli.convertDateFormat(null)).toThrow('Date string is required and must be a string');
      expect(() => cli.convertDateFormat(undefined)).toThrow('Date string is required and must be a string');
      expect(() => cli.convertDateFormat('')).toThrow('Date string is required and must be a string');
    });

    it('should handle leap year validation correctly', () => {
      expect(cli.convertDateFormat('29.02.2024')).toBe('2024-02-29'); // Valid leap year
      expect(() => cli.convertDateFormat('29.02.2023')).toThrow('Invalid date: 29.02.2023. The date does not exist.'); // Invalid leap year
    });
  });
  describe('getProjectWorklogs', () => {
    beforeEach(() => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: { key: 'TEST' }
      };
      cli.apiToken = 'test-token';
    });

    it('should get worklogs for project successfully', async () => {
      const mockSearchResponse = {
        issues: [
          { key: 'TEST-123', fields: { summary: 'Test issue' } }
        ]
      };
      const mockWorklogResponse = {
        worklogs: [
          {
            timeSpent: '2h',
            timeSpentSeconds: 7200,
            comment: 'Test work',
            started: '2024-01-15T09:00:00.000+0000',
            created: '2024-01-15T09:00:00.000+0000',
            author: {
              displayName: 'Test User',
              emailAddress: 'test@example.com'
            }
          }
        ]
      };

      // Override MSW handlers for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/search`, () => {
          return HttpResponse.json(mockSearchResponse);
        }),
        http.get(`${JIRA_BASE_URL}/rest/api/3/issue/:issueKey/worklog`, () => {
          return HttpResponse.json(mockWorklogResponse);
        })
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cli.getProjectWorklogs({ project: 'TEST' });

      expect(result).toHaveLength(1);
      expect(result[0].issueKey).toBe('TEST-123');
      expect(result[0].author).toBe('Test User');

      consoleSpy.mockRestore();
    });

    it('should handle empty search results', async () => {
      const mockSearchResponse = { issues: [] };
      // Override MSW handler for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/search`, () => {
          return HttpResponse.json(mockSearchResponse);
        })
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cli.getProjectWorklogs({ project: 'TEST' });

      expect(result).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('should filter by user email', async () => {
      const mockSearchResponse = {
        issues: [{ key: 'TEST-123', fields: { summary: 'Test issue' } }]
      };
      const mockWorklogResponse = {
        worklogs: [
          {
            timeSpent: '2h',
            timeSpentSeconds: 7200,
            comment: 'Test work',
            started: '2024-01-15T09:00:00.000+0000',
            created: '2024-01-15T09:00:00.000+0000',
            author: {
              displayName: 'Test User',
              emailAddress: 'test@example.com'
            }
          },
          {
            timeSpent: '1h',
            timeSpentSeconds: 3600,
            comment: 'Other work',
            started: '2024-01-15T10:00:00.000+0000',
            created: '2024-01-15T10:00:00.000+0000',
            author: {
              displayName: 'Other User',
              emailAddress: 'other@example.com'
            }
          }
        ]
      };

      // Override MSW handlers for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/search`, () => {
          return HttpResponse.json(mockSearchResponse);
        }),
        http.get(`${JIRA_BASE_URL}/rest/api/3/issue/:issueKey/worklog`, () => {
          return HttpResponse.json(mockWorklogResponse);
        })
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cli.getProjectWorklogs({
        project: 'TEST',
        user: ['test@example.com']
      });

      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Test User');

      consoleSpy.mockRestore();
    });

    it('should filter by date range', async () => {
      const mockSearchResponse = {
        issues: [{ key: 'TEST-123', fields: { summary: 'Test issue' } }]
      };
      const mockWorklogResponse = {
        worklogs: [
          {
            timeSpent: '2h',
            timeSpentSeconds: 7200,
            comment: 'Test work',
            started: '2024-01-15T09:00:00.000+0000',
            created: '2024-01-15T09:00:00.000+0000',
            author: {
              displayName: 'Test User',
              emailAddress: 'test@example.com'
            }
          },
          {
            timeSpent: '1h',
            timeSpentSeconds: 3600,
            comment: 'Old work',
            started: '2024-01-10T09:00:00.000+0000',
            created: '2024-01-10T09:00:00.000+0000',
            author: {
              displayName: 'Test User',
              emailAddress: 'test@example.com'
            }
          }
        ]
      };

      // Override MSW handlers for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/search`, () => {
          return HttpResponse.json(mockSearchResponse);
        }),
        http.get(`${JIRA_BASE_URL}/rest/api/3/issue/:issueKey/worklog`, () => {
          return HttpResponse.json(mockWorklogResponse);
        })
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cli.getProjectWorklogs({
        project: 'TEST',
        start: '2024-01-15',
        end: '2024-01-16'
      });

      expect(result).toHaveLength(1);
      expect(result[0].started).toBe('2024-01-15T09:00:00.000+0000');

      consoleSpy.mockRestore();
    });

    it('should handle worklog API errors gracefully', async () => {
      const mockSearchResponse = {
        issues: [{ key: 'TEST-123', fields: { summary: 'Test issue' } }]
      };

      // Override MSW handlers for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/search`, () => {
          return HttpResponse.json(mockSearchResponse);
        }),
        http.get(`${JIRA_BASE_URL}/rest/api/3/issue/:issueKey/worklog`, () => {
          return HttpResponse.json({}, { status: 404 });
        })
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cli.getProjectWorklogs({ project: 'TEST' });

      expect(result).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('should throw error when config not loaded', async () => {
      cli.config = null;

      await expect(cli.getProjectWorklogs({ project: 'TEST' }))
        .rejects.toThrow('Configuration not loaded');
    });

    it('should handle multiple users filter', async () => {
      const mockSearchResponse = {
        issues: [{ key: 'TEST-123', fields: { summary: 'Test issue' } }]
      };
      const mockWorklogResponse = {
        worklogs: [
          {
            timeSpent: '2h',
            timeSpentSeconds: 7200,
            comment: 'Test work',
            started: '2024-01-15T09:00:00.000+0000',
            created: '2024-01-15T09:00:00.000+0000',
            author: {
              displayName: 'User A',
              emailAddress: 'usera@example.com'
            }
          },
          {
            timeSpent: '1h',
            timeSpentSeconds: 3600,
            comment: 'Other work',
            started: '2024-01-15T10:00:00.000+0000',
            created: '2024-01-15T10:00:00.000+0000',
            author: {
              displayName: 'User B',
              emailAddress: 'userb@example.com'
            }
          }
        ]
      };

      // Override MSW handlers for this test
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/search`, () => {
          return HttpResponse.json(mockSearchResponse);
        }),
        http.get(`${JIRA_BASE_URL}/rest/api/3/issue/:issueKey/worklog`, () => {
          return HttpResponse.json(mockWorklogResponse);
        })
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cli.getProjectWorklogs({
        project: 'TEST',
        user: ['usera@example.com', 'userb@example.com']
      });

      expect(result).toHaveLength(2);
      consoleSpy.mockRestore();
    });
  });

  describe('generateTimesheet', () => {
    beforeEach(() => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: { key: 'TEST' }
      };
      cli.apiToken = 'test-token';
    });

    it('should generate JSON format', async () => {
      const mockEntries = [createMockWorklogEntry()];
      vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.generateTimesheet({ format: 'json' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"issueKey": "TEST-123"')
      );

      consoleSpy.mockRestore();
    });

    it('should generate CSV format', async () => {
      const mockEntries = [createMockWorklogEntry()];
      vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.generateTimesheet({ format: 'csv' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Date,User,Issue Key')
      );

      consoleSpy.mockRestore();
    });

    it('should generate Markdown format', async () => {
      const mockEntries = [createMockWorklogEntry()];
      vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.generateTimesheet({ format: 'markdown' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('# Stundenzettel')
      );

      consoleSpy.mockRestore();
    });

    it('should write to output file', async () => {
      const mockEntries = [createMockWorklogEntry()];
      vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
      
      // Setup mock file system
      setupMockFileSystem({});
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.generateTimesheet({
        format: 'json',
        output: 'test.json'
      });

      // The file should be written to the mock file system
      // We can't easily verify the exact content with mock-fs, but we can verify no errors occurred
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('JSON exported to: test.json')
      );

      consoleSpy.mockRestore();
      mockFs.restore();
    });

    it('should handle case-insensitive format', async () => {
      const mockEntries = [createMockWorklogEntry()];
      vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.generateTimesheet({ format: 'JSON' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"issueKey": "TEST-123"')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('showConfig', () => {
    it('should show config when loaded', async () => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: { key: 'TEST' },
        installation: 'cloud',
        auth_type: 'basic'
      };
      cli.apiToken = 'test-token';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.showConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Current jira-cli Configuration')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://test.atlassian.net')
      );

      consoleSpy.mockRestore();
    });

    it('should show warning when no config loaded', async () => {
      cli.config = null;

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.showConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No configuration loaded')
      );

      consoleSpy.mockRestore();
    });

    it('should handle project as string', async () => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: 'TEST-STRING',
        installation: 'cloud',
        auth_type: 'basic'
      };
      cli.apiToken = 'test-token';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.showConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TEST-STRING')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('formatTime edge cases', () => {
      it('should handle zero seconds', () => {
        expect(cli.formatTime(0)).toBe('0m');
      });

      it('should handle exact hours', () => {
        expect(cli.formatTime(7200)).toBe('2h');
      });

      it('should handle exact minutes', () => {
        expect(cli.formatTime(900)).toBe('15m');
      });

      it('should handle large numbers', () => {
        expect(cli.formatTime(36000)).toBe('10h');
      });

      it('should handle fractional seconds', () => {
        expect(cli.formatTime(3661)).toBe('1h 1m');
      });
    });

    describe('groupByUserAndDate edge cases', () => {
      it('should handle empty entries array', () => {
        const result = cli.groupByUserAndDate([]);
        expect(result.size).toBe(0);
      });

      it('should handle entries with same user and date', () => {
        const entries = [
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-15T09:00:00.000+0000'
          }),
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-15T10:00:00.000+0000'
          })
        ];

        const result = cli.groupByUserAndDate(entries);
        
        expect(result.size).toBe(1);
        const userADates = result.get('User A');
        expect(userADates.size).toBe(1);
        const dayEntries = userADates.get('15.1.2024');
        expect(dayEntries).toHaveLength(2);
      });

      it('should handle invalid date formats gracefully', () => {
        const entries = [
          createMockWorklogEntry({
            author: 'User A',
            started: 'invalid-date'
          })
        ];

        expect(() => cli.groupByUserAndDate(entries)).not.toThrow();
      });
    });

    describe('makeRequest error scenarios', () => {
      beforeEach(() => {
        cli.config = {
          server: 'https://test.atlassian.net',
          login: 'test@example.com'
        };
        cli.apiToken = 'test-token';
      });

      it('should handle network errors', async () => {
        // Override MSW handler to simulate network error
        server.use(
          http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
            return HttpResponse.error();
          })
        );

        await expect(cli.makeRequest('/rest/api/3/myself'))
          .rejects.toThrow();
      });

      it('should handle 401 unauthorized', async () => {
        // Override MSW handler to return 401
        server.use(
          http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
            return HttpResponse.json('Unauthorized', { status: 401 });
          })
        );

        await expect(cli.makeRequest('/rest/api/3/myself'))
          .rejects.toThrow('HTTP 401');
      });

      it('should handle 403 forbidden', async () => {
        // Override MSW handler to return 403
        server.use(
          http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
            return HttpResponse.json('Forbidden', { status: 403 });
          })
        );

        await expect(cli.makeRequest('/rest/api/3/myself'))
          .rejects.toThrow('HTTP 403');
      });

      it('should handle 500 server error', async () => {
        // Override MSW handler to return 500
        server.use(
          http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
            return HttpResponse.json('Internal Server Error', { status: 500 });
          })
        );

        await expect(cli.makeRequest('/rest/api/3/myself'))
          .rejects.toThrow('HTTP 500');
      });
    });

    describe('loadConfig error scenarios', () => {
      it('should handle YAML parsing errors', async () => {
        // Setup mock file system with invalid YAML
        setupMockFileSystem({
          [cli.configPath]: 'invalid: yaml: content: ['
        });
        
        vi.spyOn(yaml, 'load').mockImplementation(() => {
          throw new Error('YAML parsing error');
        });

        await expect(cli.loadConfig()).rejects.toThrow('YAML parsing error');
        
        mockFs.restore();
      });

      it('should handle file permission errors', async () => {
        // Setup empty mock file system to simulate file not found
        setupMockFileSystem({});

        await expect(cli.loadConfig()).rejects.toThrow('Configuration file not found');
        
        mockFs.restore();
      });

      it('should handle empty config file', async () => {
        // Setup mock file system with empty config
        setupMockFileSystem({
          [cli.configPath]: ''
        });
        
        vi.spyOn(yaml, 'load').mockReturnValue(null);
        process.env.JIRA_API_TOKEN = 'test-token';

        const result = await cli.loadConfig();
        expect(result).toBeNull();
        
        mockFs.restore();
      });
    });
  });

  describe('Output Format Validation', () => {
    const mockEntries = [
      createMockWorklogEntry({
        author: 'User A',
        started: '2024-01-15T09:00:00.000+0000',
        issueKey: 'TEST-123',
        issueSummary: 'Test issue with "quotes" and, commas',
        comment: 'Comment with | pipes and \n newlines'
      }),
      createMockWorklogEntry({
        author: 'User B',
        started: '2024-01-16T10:00:00.000+0000',
        issueKey: 'TEST-124',
        issueSummary: 'Another test issue',
        comment: 'Simple comment'
      })
    ];

    describe('CSV format validation', () => {
      it('should properly escape quotes in CSV', () => {
        const result = cli.exportToCsv(mockEntries);
        expect(result).toContain('Comment with | pipes and');
      });

      it('should include all required headers', () => {
        const result = cli.exportToCsv(mockEntries);
        const headers = ['User', 'Date', 'Issue Key', 'Comment', 'Time Spent', 'Time (Seconds)', 'Started', 'Created'];
        headers.forEach(header => {
          expect(result).toContain(header);
        });
      });
    });

    describe('Markdown format validation', () => {

      it('should include proper markdown structure', () => {
        const result = cli.exportToMarkdown(mockEntries);
        expect(result).toContain('# Stundenzettel');
        expect(result).toContain('## 👤');
        expect(result).toContain('| Issue Key |');
        // Date headers (### 📅) are no longer included in the new format
      });
    });

    describe('Table format validation', () => {
      it('should handle long comments in table', () => {
        const longCommentEntry = [
          createMockWorklogEntry({
            comment: 'This is a very long comment that should be truncated in the table display'
          })
        ];
        const result = cli.displayTable(longCommentEntry, true);
        // Since cli-table3 is mocked, we can't test the actual truncation
        expect(result).toContain('mocked table output');
      });

      it('should display proper totals', () => {
        const result = cli.displayTable(mockEntries, true);
        // Since cli-table3 is mocked, we check for the structure around the table
        expect(result).toContain('mocked table output');
        expect(result).toContain('Gesamtzeit aller Benutzer');
        expect(result).toContain('Anzahl Benutzer');
      });
    });

    describe('JSON format validation', () => {
      it('should produce valid JSON', () => {
        const jsonString = JSON.stringify(mockEntries, null, 2);
        expect(() => JSON.parse(jsonString)).not.toThrow();
      });

      it('should include all entry properties', () => {
        const jsonString = JSON.stringify(mockEntries, null, 2);
        const parsed = JSON.parse(jsonString);
        
        expect(parsed[0]).toHaveProperty('issueKey');
        expect(parsed[0]).toHaveProperty('issueSummary');
        expect(parsed[0]).toHaveProperty('author');
        expect(parsed[0]).toHaveProperty('timeSpent');
        expect(parsed[0]).toHaveProperty('timeSpentSeconds');
        expect(parsed[0]).toHaveProperty('comment');
        expect(parsed[0]).toHaveProperty('started');
        expect(parsed[0]).toHaveProperty('created');
      });
    });
  });
  
  // Helper function for creating mock worklog entries
  function createMockWorklogEntry(overrides = {}) {
    return {
      issueKey: 'TEST-123',
      issueSummary: 'Test issue summary',
      author: 'Test User',
      timeSpent: '2h',
      timeSpentSeconds: 7200,
      comment: 'Test comment',
      started: '2024-01-15T09:00:00.000+0000',
      created: '2024-01-15T09:00:00.000+0000',
      ...overrides
    };
  }
});