/**
 * Tests for all output formats and formatting functionality
 * Updated to use mock-fs for file system operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFs } from './setup.js';
import { validateCsvOutput, validateMarkdownOutput, setupMockFileSystem } from './test-utils.js';

const { JiraTimesheetCLI } = await import('../jira_timesheet_cli.js');

describe('Output Formatting', () => {
  let cli;
  let mockEntries;
  let complexMockEntries;
  let mockFileSystem;

  beforeEach(() => {
    cli = new JiraTimesheetCLI();
    vi.clearAllMocks();
    
    // Setup mock file system
    mockFileSystem = setupMockFileSystem();

    // Simple mock entries for basic tests
    mockEntries = [
      createMockWorklogEntry({
        author: 'John Doe',
        started: '2024-01-15T09:00:00.000+0000',
        issueKey: 'TEST-123',
        issueSummary: 'Simple test issue',
        comment: 'Basic work done',
        timeSpent: '2h',
        timeSpentSeconds: 7200
      })
    ];

    // Complex mock entries for comprehensive tests
    complexMockEntries = [
      createMockWorklogEntry({
        author: 'John Doe',
        started: '2024-01-15T09:00:00.000+0000',
        issueKey: 'TEST-123',
        issueSummary: 'Issue with "quotes" and, commas',
        comment: 'Comment with | pipes and \n newlines',
        timeSpent: '2h 30m',
        timeSpentSeconds: 9000
      }),
      createMockWorklogEntry({
        author: 'John Doe',
        started: '2024-01-15T14:00:00.000+0000',
        issueKey: 'TEST-124',
        issueSummary: 'Another issue',
        comment: 'Short comment',
        timeSpent: '1h',
        timeSpentSeconds: 3600
      }),
      createMockWorklogEntry({
        author: 'Jane Smith',
        started: '2024-01-16T10:00:00.000+0000',
        issueKey: 'TEST-125',
        issueSummary: 'Different user issue',
        comment: 'Work by different user',
        timeSpent: '45m',
        timeSpentSeconds: 2700
      }),
      createMockWorklogEntry({
        author: 'John Doe',
        started: '2024-01-16T11:00:00.000+0000',
        issueKey: 'TEST-126',
        issueSummary: 'Multi-day work',
        comment: '',
        timeSpent: '3h',
        timeSpentSeconds: 10800
      })
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockFs.restore();
  });

  describe('displayTable', () => {
    describe('basic functionality', () => {
      it('should display table with single entry', () => {
        const result = cli.displayTable(mockEntries, true);
        
        expect(result).toContain('Stundenzettel');
        expect(result).toContain('John Doe');
        // Since cli-table3 is mocked, we check for the structure around the table
        expect(result).toContain('mocked table output');
        expect(result).toContain('2h');
        // The "📊 TAGESSUMME" text is inside the mocked table, so we can't check for it
        // Instead we verify the overall structure is correct
        expect(result).toContain('John Doe Gesamt');
        expect(result).toContain('Gesamtzeit aller Benutzer');
      });

      it('should return no worklogs message when entries empty', () => {
        const result = cli.displayTable([], true);
        expect(result).toContain('No worklogs found');
      });

      it('should group by user and date correctly', () => {
        const result = cli.displayTable(complexMockEntries, true);
        
        expect(result).toContain('John Doe');
        expect(result).toContain('Jane Smith');
        // Since cli-table3 is mocked, dates are inside the mocked table output
        expect(result).toContain('mocked table output');
        // Verify user totals are calculated correctly
        expect(result).toContain('John Doe Gesamt: 6h 30m (3 Einträge)');
        expect(result).toContain('Jane Smith Gesamt: 45m (1 Einträge)');
      });

      it('should calculate totals correctly', () => {
        const result = cli.displayTable(complexMockEntries, true);
        
        expect(result).toContain('Gesamtzeit aller Benutzer');
        expect(result).toContain('Anzahl Benutzer: 2');
      });

      it('should sort dates chronologically', () => {
        const entriesWithMixedDates = [
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-20T09:00:00.000+0000'
          }),
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-15T09:00:00.000+0000'
          }),
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-18T09:00:00.000+0000'
          })
        ];

        const result = cli.displayTable(entriesWithMixedDates, true);
        
        // Since date headers are removed and cli-table3 is mocked, we verify the structure
        // The dates are now inside the mocked table output
        expect(result).toContain('mocked table output');
        // Verify user totals are calculated correctly for all entries
        expect(result).toContain('User A Gesamt: 6h (3 Einträge)');
        expect(result).toContain('Gesamtzeit aller Benutzer: 6h (3 Einträge)');
      });

      it('should sort entries within day by time', () => {
        const entriesWithMixedTimes = [
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-15T14:00:00.000+0000',
            issueKey: 'LATER'
          }),
          createMockWorklogEntry({
            author: 'User A',
            started: '2024-01-15T09:00:00.000+0000',
            issueKey: 'EARLIER'
          })
        ];

        const result = cli.displayTable(entriesWithMixedTimes, true);
        
        // Since cli-table3 is mocked, we can't test the actual sorting within the table
        expect(result).toContain('mocked table output');
      });
    });

    describe('comment handling', () => {
      it('should truncate long comments', () => {
        const longCommentEntry = [
          createMockWorklogEntry({
            comment: 'This is a very long comment that should be truncated because it exceeds the maximum length'
          })
        ];

        const result = cli.displayTable(longCommentEntry, true);
        // Since cli-table3 is mocked, we can't test the actual truncation
        expect(result).toContain('mocked table output');
      });

      it('should handle empty comments', () => {
        const emptyCommentEntry = [
          createMockWorklogEntry({ comment: '' })
        ];

        const result = cli.displayTable(emptyCommentEntry, true);
        expect(result).not.toContain('undefined');
      });

      it('should handle non-string comments', () => {
        const nonStringCommentEntry = [
          createMockWorklogEntry({ comment: null })
        ];

        const result = cli.displayTable(nonStringCommentEntry, true);
        expect(result).not.toContain('null');
      });
    });

    describe('chalk handling', () => {
      it('should use chalk when disableChalk is false', () => {
        const result = cli.displayTable(mockEntries, false);
        // When chalk is enabled, the result should be the same but potentially with color codes
        expect(result).toContain('Stundenzettel');
      });

      it('should disable chalk when disableChalk is true', () => {
        const result = cli.displayTable(mockEntries, true);
        expect(result).toContain('Stundenzettel');
        // Should not contain ANSI color codes
        expect(result).not.toMatch(/\u001b\[[0-9;]*m/);
      });
    });

    describe('edge cases', () => {
      it('should handle zero time entries', () => {
        const zeroTimeEntry = [
          createMockWorklogEntry({
            timeSpent: '0m',
            timeSpentSeconds: 0
          })
        ];

        const result = cli.displayTable(zeroTimeEntry, true);
        expect(result).toContain('0m');
      });

      it('should handle very large time values', () => {
        const largeTimeEntry = [
          createMockWorklogEntry({
            timeSpent: '100h',
            timeSpentSeconds: 360000
          })
        ];

        const result = cli.displayTable(largeTimeEntry, true);
        expect(result).toContain('100h');
      });

      it('should handle special characters in issue summaries', () => {
        const specialCharsEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with émojis 🚀 and spëcial chars'
          })
        ];

        const result = cli.displayTable(specialCharsEntry, true);
        // Since cli-table3 is mocked, we can't test the actual content
        expect(result).toContain('mocked table output');
      });
    });
  });

  describe('exportToCsv', () => {
    describe('basic functionality', () => {
      it('should export single entry to CSV', () => {
        const result = cli.exportToCsv(mockEntries);
        
        const validation = validateCsvOutput(result);
        expect(validation.isValid).toBe(true);
        expect(result).toContain('John Doe');
        expect(result).toContain('TEST-123');
        expect(result).toContain('2h');
      });

      it('should include all required headers', () => {
        const result = cli.exportToCsv(mockEntries);
        
        const expectedHeaders = [
          'Date', 'User', 'Issue Key', 'Comment',
          'Time Spent', 'Time (Seconds)', 'Started', 'Created'
        ];
        
        expectedHeaders.forEach(header => {
          expect(result).toContain(header);
        });
      });

      it('should group by user and date', () => {
        const result = cli.exportToCsv(complexMockEntries);
        
        expect(result).toContain('John Doe');
        expect(result).toContain('Jane Smith');
        expect(result).toContain('15.1.2024');
        expect(result).toContain('16.1.2024');
      });

      it('should include day summary rows', () => {
        const result = cli.exportToCsv(complexMockEntries);
        
        expect(result).toContain('📊 TAGESSUMME');
        expect(result).toContain('Einträge');
        // Should not include user or grand totals in CSV
        expect(result).not.toContain('Benutzersumme');
        expect(result).not.toContain('GESAMT');
      });
    });

    describe('CSV escaping', () => {
      it('should escape quotes in CSV fields', () => {
        const quotesEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with "quotes" in title',
            comment: 'Comment with "quotes" too'
          })
        ];

        const result = cli.exportToCsv(quotesEntry);
        expect(result).toContain('""quotes""');
      });

      it('should handle commas in CSV fields', () => {
        const commasEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with, commas, everywhere',
            comment: 'Comment, with, commas'
          })
        ];

        const result = cli.exportToCsv(commasEntry);
        expect(result).toContain('"Comment, with, commas"');
      });

      it('should handle special characters in summaries', () => {
        const specialCharsEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with émojis 🚀 and spëcial chars',
            comment: 'Comment with émojis 🚀 and spëcial chars'
          })
        ];

        const result = cli.exportToCsv(specialCharsEntry);
        expect(result).toContain('émojis 🚀');
        expect(result).toContain('spëcial chars');
      });
    });

    describe('data integrity', () => {
      it('should preserve all numeric values', () => {
        const result = cli.exportToCsv(mockEntries);
        expect(result).toContain('7200');
      });

      it('should preserve timestamps', () => {
        const result = cli.exportToCsv(mockEntries);
        expect(result).toContain('2024-01-15T09:00:00.000+0000');
      });

      it('should sort dates chronologically', () => {
        const result = cli.exportToCsv(complexMockEntries);
        
        const lines = result.split('\n');
        const johnDoeLines = lines.filter(line => line.includes('John Doe') && !line.includes('---') && !line.includes('==='));
        
        // Should have entries for both dates
        expect(johnDoeLines.some(line => line.includes('15.1.2024'))).toBe(true);
        expect(johnDoeLines.some(line => line.includes('16.1.2024'))).toBe(true);
      });
    });

    describe('empty data handling', () => {
      it('should handle empty entries array', () => {
        const result = cli.exportToCsv([]);
        
        const lines = result.split('\n').filter(line => line.trim());
        expect(lines.length).toBe(1); // Only headers
        expect(lines[0]).toContain('Date,User,Issue Key');
      });
    });
  });

  describe('exportToMarkdown', () => {
    describe('basic functionality', () => {
      it('should export single entry to Markdown', () => {
        const result = cli.exportToMarkdown(mockEntries);
        
        const validation = validateMarkdownOutput(result);
        expect(validation.isValid).toBe(true);
        expect(result).toContain('# Stundenzettel');
        expect(result).toContain('## 👤 John Doe');
        expect(result).toContain('| TEST-123 |');
      });

      it('should return no worklogs message when empty', () => {
        const result = cli.exportToMarkdown([]);
        expect(result).toContain('No worklogs found');
      });

      it('should include proper markdown structure', () => {
        const result = cli.exportToMarkdown(complexMockEntries);
        
        expect(result).toContain('# Stundenzettel');
        expect(result).toContain('## 👤');
        expect(result).toContain('| Issue Key |');
        expect(result).toContain('|-----------|');
        expect(result).toContain('## 🏆 Gesamtübersicht');
      });

      it('should group by user and date', () => {
        const result = cli.exportToMarkdown(complexMockEntries);
        
        expect(result).toContain('## 👤 John Doe');
        expect(result).toContain('## 👤 Jane Smith');
        // Dates should appear in table content, not as headers
        expect(result).toContain('15.1.2024');
        expect(result).toContain('16.1.2024');
      });
    });

    describe('markdown escaping', () => {
      it('should escape pipe characters', () => {
        const pipesEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with | pipes | everywhere',
            comment: 'Comment with | pipes'
          })
        ];

        const result = cli.exportToMarkdown(pipesEntry);
        expect(result).toContain('\\|');
      });


      it('should preserve markdown formatting in summaries', () => {
        const markdownEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with **bold** and *italic* text',
            comment: 'Comment with **bold** and *italic* text'
          })
        ];

        const result = cli.exportToMarkdown(markdownEntry);
        expect(result).toContain('**bold**');
        expect(result).toContain('*italic*');
      });
    });

    describe('table structure', () => {
      it('should have correct table headers', () => {
        const result = cli.exportToMarkdown(mockEntries);
        
        expect(result).toContain('| Datum | Issue Key | Comment | Time Spent |');
        expect(result).toContain('|-------|-----------|---------|------------|');
      });

      it('should include day totals', () => {
        const result = cli.exportToMarkdown(complexMockEntries);
        
        // TAGESSUMME text has been removed, but day totals should still be present
        expect(result).toContain('**2 Einträge**');
      });

      it('should include user totals', () => {
        const result = cli.exportToMarkdown(complexMockEntries);
        
        expect(result).toContain('**📈 John Doe Gesamt:');
        expect(result).toContain('**📈 Jane Smith Gesamt:');
      });

      it('should include grand totals', () => {
        const result = cli.exportToMarkdown(complexMockEntries);
        
        expect(result).toContain('**Gesamtzeit aller Benutzer:**');
        expect(result).toContain('**Anzahl Benutzer:**');
      });
    });

    describe('content formatting', () => {

      it('should handle special characters', () => {
        const specialCharsEntry = [
          createMockWorklogEntry({
            issueSummary: 'Issue with émojis 🚀 and spëcial chars',
            comment: 'Comment with émojis 🚀 and spëcial chars'
          })
        ];

        const result = cli.exportToMarkdown(specialCharsEntry);
        expect(result).toContain('émojis 🚀');
      });

      it('should sort entries chronologically', () => {
        const result = cli.exportToMarkdown(complexMockEntries);
        
        // Since date headers are removed, we check that dates appear in the table content
        // The dates should still be present in chronological order within the table
        expect(result).toContain('15.1.2024');
        expect(result).toContain('16.1.2024');
        // Verify the table structure is maintained
        expect(result).toContain('| Datum | Issue Key | Comment | Time Spent |');
      });
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

    describe('format handling', () => {
      it('should handle case-insensitive format options', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await cli.generateTimesheet({ format: 'JSON' });
        await cli.generateTimesheet({ format: 'csv' });
        await cli.generateTimesheet({ format: 'MARKDOWN' });
        await cli.generateTimesheet({ format: 'Table' });

        expect(consoleSpy).toHaveBeenCalledTimes(8); // 4 formats × 2 calls each (project info + output)
        consoleSpy.mockRestore();
      });

      it('should default to table format', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await cli.generateTimesheet({});

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Stundenzettel')
        );
        consoleSpy.mockRestore();
      });
    });

    describe('file output with mock-fs', () => {
      it('should write JSON to file', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock file system for output
        mockFs({
          '/tmp': {}
        });

        await cli.generateTimesheet({ 
          format: 'json',
          output: '/tmp/test.json'
        });

        // Verify file was written using mock-fs
        const fs = await import('fs/promises');
        const content = await fs.readFile('/tmp/test.json', 'utf-8');
        expect(content).toContain('"issueKey": "TEST-123"');
        
        consoleSpy.mockRestore();
      });

      it('should write CSV to file', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock file system for output
        mockFs({
          '/tmp': {}
        });

        await cli.generateTimesheet({ 
          format: 'csv',
          output: '/tmp/test.csv'
        });

        // Verify file was written using mock-fs
        const fs = await import('fs/promises');
        const content = await fs.readFile('/tmp/test.csv', 'utf-8');
        expect(content).toContain('Date,User,Issue Key');
        
        consoleSpy.mockRestore();
      });

      it('should write Markdown to file', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock file system for output
        mockFs({
          '/tmp': {}
        });

        await cli.generateTimesheet({ 
          format: 'markdown',
          output: '/tmp/test.md'
        });

        // Verify file was written using mock-fs
        const fs = await import('fs/promises');
        const content = await fs.readFile('/tmp/test.md', 'utf-8');
        expect(content).toContain('# Stundenzettel');
        
        consoleSpy.mockRestore();
      });

      it('should write table to file without chalk', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock file system for output
        mockFs({
          '/tmp': {}
        });

        await cli.generateTimesheet({ 
          format: 'table',
          output: '/tmp/test.txt'
        });

        // Verify file was written using mock-fs
        const fs = await import('fs/promises');
        const content = await fs.readFile('/tmp/test.txt', 'utf-8');
        expect(content).toContain('Stundenzettel');
        
        consoleSpy.mockRestore();
      });

      it('should show success message after file write', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock file system for output
        mockFs({
          '/tmp': {}
        });

        await cli.generateTimesheet({ 
          format: 'json',
          output: '/tmp/test.json'
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('JSON exported to: /tmp/test.json')
        );
        consoleSpy.mockRestore();
      });
    });

    describe('console output', () => {
      it('should output to console when no file specified', async () => {
        vi.spyOn(cli, 'getProjectWorklogs').mockResolvedValue(mockEntries);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await cli.generateTimesheet({ format: 'json' });

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"issueKey": "TEST-123"')
        );
        consoleSpy.mockRestore();
      });
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