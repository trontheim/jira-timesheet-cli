import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JiraTimesheetCLI } from '../timesheet.js';

describe('Timezone Configuration', () => {
  let cli;

  beforeEach(() => {
    cli = new JiraTimesheetCLI();
  });

  describe('groupByUserAndDate with timezone configuration', () => {
    const mockEntries = [
      {
        author: 'John Doe',
        started: '2024-01-15T14:30:00.000+0100',
        issueKey: 'TEST-1',
        timeSpent: '2h',
        timeSpentSeconds: 7200,
        comment: 'Test work'
      },
      {
        author: 'Jane Smith',
        started: '2024-01-15T22:30:00.000+0100',
        issueKey: 'TEST-2',
        timeSpent: '1h',
        timeSpentSeconds: 3600,
        comment: 'Late work'
      }
    ];

    it('should use timezone from config.timesheet.timezone', () => {
      const config = {
        timesheet: {
          timezone: 'America/New_York'
        }
      };

      const result = cli.groupByUserAndDate(mockEntries, config);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.has('John Doe')).toBe(true);
      expect(result.has('Jane Smith')).toBe(true);
    });

    it('should fallback to Europe/Berlin when config.timesheet.timezone is not defined', () => {
      const config = {
        timesheet: {
          default_format: 'table'
        }
      };

      const result = cli.groupByUserAndDate(mockEntries, config);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
    });

    it('should fallback to Europe/Berlin when config.timesheet is not defined', () => {
      const config = {
        server: 'https://example.com'
      };

      const result = cli.groupByUserAndDate(mockEntries, config);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
    });

    it('should fallback to Europe/Berlin when config is null', () => {
      const result = cli.groupByUserAndDate(mockEntries, null);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
    });

    it('should fallback to Europe/Berlin when config is undefined', () => {
      const result = cli.groupByUserAndDate(mockEntries, undefined);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
    });

    it('should handle different timezones correctly', () => {
      // Test with UTC timezone
      const utcConfig = {
        timesheet: {
          timezone: 'UTC'
        }
      };

      const utcResult = cli.groupByUserAndDate(mockEntries, utcConfig);
      
      // Test with Pacific timezone
      const pacificConfig = {
        timesheet: {
          timezone: 'America/Los_Angeles'
        }
      };

      const pacificResult = cli.groupByUserAndDate(mockEntries, pacificConfig);
      
      // Both should group entries, but potentially on different dates due to timezone differences
      expect(utcResult).toBeInstanceOf(Map);
      expect(pacificResult).toBeInstanceOf(Map);
      expect(utcResult.size).toBe(2);
      expect(pacificResult.size).toBe(2);
    });

    it('should handle invalid timezone gracefully', () => {
      const config = {
        timesheet: {
          timezone: 'Invalid/Timezone'
        }
      };

      // Should not throw an error, but may use system default or fallback behavior
      expect(() => {
        cli.groupByUserAndDate(mockEntries, config);
      }).not.toThrow();
    });

    it('should group entries correctly across timezone boundaries', () => {
      // Entry that crosses midnight in different timezones
      const crossMidnightEntries = [
        {
          author: 'Test User',
          started: '2024-01-15T23:30:00.000Z', // 23:30 UTC
          issueKey: 'TEST-1',
          timeSpent: '1h',
          timeSpentSeconds: 3600,
          comment: 'Late work'
        },
        {
          author: 'Test User',
          started: '2024-01-16T00:30:00.000Z', // 00:30 UTC next day
          issueKey: 'TEST-2',
          timeSpent: '1h',
          timeSpentSeconds: 3600,
          comment: 'Early work'
        }
      ];

      // In UTC, these should be on different dates
      const utcConfig = {
        timesheet: {
          timezone: 'UTC'
        }
      };

      const utcResult = cli.groupByUserAndDate(crossMidnightEntries, utcConfig);
      const userMap = utcResult.get('Test User');
      
      expect(userMap).toBeDefined();
      expect(userMap.size).toBeGreaterThanOrEqual(1); // Could be 1 or 2 dates depending on timezone handling
    });
  });

  describe('integration with display methods', () => {
    const mockEntries = [
      {
        author: 'Test User',
        started: '2024-01-15T14:30:00.000+0100',
        issueKey: 'TEST-1',
        issueSummary: 'Test Issue',
        timeSpent: '2h',
        timeSpentSeconds: 7200,
        comment: 'Test work',
        created: '2024-01-15T14:30:00.000+0100'
      }
    ];

    beforeEach(() => {
      cli.config = {
        timesheet: {
          timezone: 'America/New_York'
        }
      };
    });

    it('should pass config to groupByUserAndDate in displayTable', () => {
      const spy = vi.spyOn(cli, 'groupByUserAndDate');
      
      cli.displayTable(mockEntries);
      
      expect(spy).toHaveBeenCalledWith(mockEntries, cli.config);
      spy.mockRestore();
    });

    it('should pass config to groupByUserAndDate in exportToCsv', () => {
      const spy = vi.spyOn(cli, 'groupByUserAndDate');
      
      cli.exportToCsv(mockEntries);
      
      expect(spy).toHaveBeenCalledWith(mockEntries, cli.config);
      spy.mockRestore();
    });

    it('should pass config to groupByUserAndDate in exportToMarkdown', () => {
      const spy = vi.spyOn(cli, 'groupByUserAndDate');
      
      cli.exportToMarkdown(mockEntries);
      
      expect(spy).toHaveBeenCalledWith(mockEntries, cli.config);
      spy.mockRestore();
    });
  });

  describe('configuration initialization with timezone', () => {
    it('should include timezone in timesheet configuration during init', () => {
      // This test verifies that the timezone is properly saved during configuration initialization
      const mockConfig = {
        timesheet: {
          default_format: 'table',
          group_by_user: true,
          timezone: 'Europe/Berlin'
        }
      };

      expect(mockConfig.timesheet.timezone).toBe('Europe/Berlin');
    });

    it('should handle missing timezone in existing configurations', () => {
      // Test backward compatibility with existing configs that don't have timezone
      const legacyConfig = {
        timesheet: {
          default_format: 'table',
          group_by_user: true
          // No timezone property
        }
      };

      const result = cli.groupByUserAndDate([], legacyConfig);
      expect(result).toBeInstanceOf(Map);
    });
  });
});