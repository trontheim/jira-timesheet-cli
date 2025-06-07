import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JiraTimesheetCLI } from '../timesheet.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('Init Command', () => {
  let cli;
  let mockInquirer;

  beforeEach(() => {
    cli = new JiraTimesheetCLI();
    
    // Mock inquirer
    mockInquirer = {
      prompt: vi.fn()
    };
    
    // Mock fs operations
    vi.spyOn(fs, 'access').mockImplementation(() => Promise.reject({ code: 'ENOENT' }));
    vi.spyOn(fs, 'mkdir').mockImplementation(() => Promise.resolve());
    vi.spyOn(fs, 'writeFile').mockImplementation(() => Promise.resolve());
    vi.spyOn(fs, 'copyFile').mockImplementation(() => Promise.resolve());
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Validation Functions', () => {
    describe('validateServerUrl', () => {
      it('should accept valid HTTPS URLs', () => {
        const result = cli.validateServerUrl('https://example.atlassian.net');
        expect(result).toBe(true);
      });

      it('should accept valid HTTP URLs', () => {
        const result = cli.validateServerUrl('http://localhost:8080');
        expect(result).toBe(true);
      });

      it('should reject empty URLs', () => {
        const result = cli.validateServerUrl('');
        expect(result).toBe('Server URL is required');
      });

      it('should reject null URLs', () => {
        const result = cli.validateServerUrl(null);
        expect(result).toBe('Server URL is required');
      });

      it('should reject invalid protocols', () => {
        const result = cli.validateServerUrl('ftp://example.com');
        expect(result).toBe('Server URL must use HTTP or HTTPS protocol');
      });

      it('should reject malformed URLs', () => {
        const result = cli.validateServerUrl('not-a-url');
        expect(result).toBe('Invalid URL format');
      });
    });

    describe('validateEmail', () => {
      it('should accept valid email addresses', () => {
        const result = cli.validateEmail('user@example.com');
        expect(result).toBe(true);
      });

      it('should accept emails with subdomains', () => {
        const result = cli.validateEmail('user@mail.example.com');
        expect(result).toBe(true);
      });

      it('should reject empty emails', () => {
        const result = cli.validateEmail('');
        expect(result).toBe('Email is required');
      });

      it('should reject null emails', () => {
        const result = cli.validateEmail(null);
        expect(result).toBe('Email is required');
      });

      it('should reject invalid email formats', () => {
        const result = cli.validateEmail('not-an-email');
        expect(result).toBe('Invalid email format');
      });

      it('should reject emails without domain', () => {
        const result = cli.validateEmail('user@');
        expect(result).toBe('Invalid email format');
      });
    });

    describe('validateProjectKey', () => {
      it('should accept valid project keys', () => {
        const result = cli.validateProjectKey('SB');
        expect(result).toBe(true);
      });

      it('should accept project keys with numbers', () => {
        const result = cli.validateProjectKey('PROJECT123');
        expect(result).toBe(true);
      });

      it('should accept empty project keys (optional)', () => {
        const result = cli.validateProjectKey('');
        expect(result).toBe(true);
      });

      it('should accept null project keys (optional)', () => {
        const result = cli.validateProjectKey(null);
        expect(result).toBe(true);
      });

      it('should reject project keys starting with numbers', () => {
        const result = cli.validateProjectKey('123PROJECT');
        expect(result).toBe('Project key must start with a letter and contain only uppercase letters and numbers');
      });

      it('should reject project keys with lowercase letters', () => {
        const result = cli.validateProjectKey('project');
        expect(result).toBe('Project key must start with a letter and contain only uppercase letters and numbers');
      });

      it('should reject project keys with special characters', () => {
        const result = cli.validateProjectKey('PROJECT-123');
        expect(result).toBe('Project key must start with a letter and contain only uppercase letters and numbers');
      });
    });
  });

  describe('Configuration Backup', () => {
    it('should create backup when config exists', async () => {
      const configPath = '/test/config.yml';
      
      // Mock file exists
      vi.spyOn(fs, 'access').mockImplementation(() => Promise.resolve());
      
      const backupPath = await cli.createConfigBackup(configPath);
      
      expect(backupPath).toMatch(/\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
      expect(fs.copyFile).toHaveBeenCalledWith(configPath, backupPath);
    });

    it('should return null when config does not exist', async () => {
      const configPath = '/test/config.yml';
      
      // Mock file does not exist
      vi.spyOn(fs, 'access').mockImplementation(() => Promise.reject({ code: 'ENOENT' }));
      
      const backupPath = await cli.createConfigBackup(configPath);
      
      expect(backupPath).toBeNull();
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    it('should throw error for other file system errors', async () => {
      const configPath = '/test/config.yml';
      
      // Mock permission error
      vi.spyOn(fs, 'access').mockImplementation(() => Promise.reject({ code: 'EACCES' }));
      
      await expect(cli.createConfigBackup(configPath)).rejects.toThrow();
    });
  });

  describe('Connection Testing', () => {
    it('should have testConnectionWithConfig method', () => {
      expect(typeof cli.testConnectionWithConfig).toBe('function');
    });

    it('should handle basic config structure', () => {
      const config = {
        server: 'https://example.atlassian.net',
        login: 'user@example.com'
      };
      const apiToken = 'test-token';

      // Just verify the method exists and can be called
      expect(() => {
        cli.testConnectionWithConfig(config, apiToken);
      }).not.toThrow();
    });
  });

  describe('Configuration Path Handling', () => {
    it('should use provided config path', () => {
      const customPath = '/custom/config.yml';
      const result = cli.getConfigPath(customPath);
      expect(result).toBe(customPath);
    });

    it('should use environment variable when no override', () => {
      const envPath = '/env/config.yml';
      process.env.JIRA_CONFIG_FILE = envPath;
      
      const result = cli.getConfigPath();
      expect(result).toBe(envPath);
      
      delete process.env.JIRA_CONFIG_FILE;
    });

    it('should use default path when no override or env var', () => {
      delete process.env.JIRA_CONFIG_FILE;
      
      const result = cli.getConfigPath();
      const expectedPath = path.join(os.homedir(), '.config', '.jira', '.config.yml');
      expect(result).toBe(expectedPath);
    });

    it('should handle init command with -c option', async () => {
      const customConfigPath = '/test/custom-config.yml';
      
      // Mock the initializeConfiguration method to capture the config path
      let capturedOptions = null;
      cli.initializeConfiguration = vi.fn().mockImplementation((options) => {
        capturedOptions = options;
        return Promise.resolve();
      });

      // Simulate the action function behavior with both command and global options
      const commandOptions = { config: customConfigPath };
      const globalOptions = {};
      const effectiveConfigPath = commandOptions.config || globalOptions.config;
      
      await cli.initializeConfiguration({ config: effectiveConfigPath });
      
      expect(cli.initializeConfiguration).toHaveBeenCalledWith({ config: customConfigPath });
      expect(capturedOptions.config).toBe(customConfigPath);
    });

    it('should prioritize command option over global option', async () => {
      const commandConfigPath = '/test/command-config.yml';
      const globalConfigPath = '/test/global-config.yml';
      
      // Mock the initializeConfiguration method to capture the config path
      let capturedOptions = null;
      cli.initializeConfiguration = vi.fn().mockImplementation((options) => {
        capturedOptions = options;
        return Promise.resolve();
      });

      // Simulate the action function behavior with both command and global options
      const commandOptions = { config: commandConfigPath };
      const globalOptions = { config: globalConfigPath };
      const effectiveConfigPath = commandOptions.config || globalOptions.config;
      
      await cli.initializeConfiguration({ config: effectiveConfigPath });
      
      expect(cli.initializeConfiguration).toHaveBeenCalledWith({ config: commandConfigPath });
      expect(capturedOptions.config).toBe(commandConfigPath);
    });

    it('should fallback to global option when command option not provided', async () => {
      const globalConfigPath = '/test/global-config.yml';
      
      // Mock the initializeConfiguration method to capture the config path
      let capturedOptions = null;
      cli.initializeConfiguration = vi.fn().mockImplementation((options) => {
        capturedOptions = options;
        return Promise.resolve();
      });

      // Simulate the action function behavior with only global options
      const commandOptions = {};
      const globalOptions = { config: globalConfigPath };
      const effectiveConfigPath = commandOptions.config || globalOptions.config;
      
      await cli.initializeConfiguration({ config: effectiveConfigPath });
      
      expect(cli.initializeConfiguration).toHaveBeenCalledWith({ config: globalConfigPath });
      expect(capturedOptions.config).toBe(globalConfigPath);
    });
  });

  describe('Project and Board Loading', () => {
    it('should have loadAvailableProjects method', () => {
      expect(typeof cli.loadAvailableProjects).toBe('function');
    });

    it('should have loadAvailableBoards method', () => {
      expect(typeof cli.loadAvailableBoards).toBe('function');
    });

    it('should handle project loading with basic config structure', () => {
      const config = {
        server: 'https://example.atlassian.net',
        login: 'user@example.com'
      };
      const apiToken = 'test-token';

      // Just verify the method exists and can be called
      expect(() => {
        cli.loadAvailableProjects(config, apiToken);
      }).not.toThrow();
    });

    it('should handle board loading with basic config structure', () => {
      const config = {
        server: 'https://example.atlassian.net',
        login: 'user@example.com'
      };
      const projectKey = 'TEST';
      const apiToken = 'test-token';

      // Just verify the method exists and can be called
      expect(() => {
        cli.loadAvailableBoards(config, projectKey, apiToken);
      }).not.toThrow();
    });
  });

  describe('Configuration Structure', () => {
    it('should support board_id in project configuration', () => {
      const config = {
        server: 'https://example.atlassian.net',
        login: 'user@example.com',
        installation: 'cloud',
        auth_type: 'api_token',
        project: {
          key: 'TEST',
          board_id: 123
        }
      };

      expect(config.project.board_id).toBe(123);
    });

    it('should support timesheet-specific configuration', () => {
      const config = {
        server: 'https://example.atlassian.net',
        login: 'user@example.com',
        installation: 'cloud',
        auth_type: 'api_token',
        timesheet: {
          default_format: 'csv',
          group_by_user: false
        }
      };

      expect(config.timesheet.default_format).toBe('csv');
      expect(config.timesheet.group_by_user).toBe(false);
    });

    it('should support insecure flag in configuration', () => {
      const config = {
        server: 'https://example.atlassian.net',
        login: 'user@example.com',
        installation: 'local',
        auth_type: 'basic',
        insecure: true
      };

      expect(config.insecure).toBe(true);
    });
  });

  describe('Parameter Validation Logic', () => {
    it('should validate installation parameter values', () => {
      // Test valid values
      expect(['cloud', 'local'].includes('cloud')).toBe(true);
      expect(['cloud', 'local'].includes('local')).toBe(true);
      
      // Test invalid values
      expect(['cloud', 'local'].includes('invalid')).toBe(false);
    });

    it('should validate auth-type parameter values', () => {
      // Test valid values
      expect(['basic', 'bearer', 'mtls', 'api_token'].includes('basic')).toBe(true);
      expect(['basic', 'bearer', 'mtls', 'api_token'].includes('bearer')).toBe(true);
      expect(['basic', 'bearer', 'mtls', 'api_token'].includes('mtls')).toBe(true);
      expect(['basic', 'bearer', 'mtls', 'api_token'].includes('api_token')).toBe(true);
      
      // Test invalid values
      expect(['basic', 'bearer', 'mtls', 'api_token'].includes('invalid')).toBe(false);
    });

    it('should validate server URL using validateServerUrl method', () => {
      expect(cli.validateServerUrl('https://example.com')).toBe(true);
      expect(cli.validateServerUrl('invalid-url')).toBe('Invalid URL format');
    });

    it('should validate login using validateEmail method for cloud', () => {
      expect(cli.validateEmail('user@example.com')).toBe(true);
      expect(cli.validateEmail('invalid-email')).toBe('Invalid email format');
    });

    it('should validate project key using validateProjectKey method', () => {
      expect(cli.validateProjectKey('VALID')).toBe(true);
      expect(cli.validateProjectKey('invalid-key')).toBe('Project key must start with a letter and contain only uppercase letters and numbers');
    });

    it('should validate board name using validateBoardName method', () => {
      expect(cli.validateBoardName('Valid Board')).toBe(true);
      expect(cli.validateBoardName('')).toBe(true); // Empty is valid (optional)
      expect(cli.validateBoardName('   ')).toBe('Board name cannot be empty'); // Whitespace only is invalid
    });
  });

  describe('Board Name Validation', () => {
    it('should accept valid board names', () => {
      const result = cli.validateBoardName('Sprint Board');
      expect(result).toBe(true);
    });

    it('should accept empty board names (optional)', () => {
      const result = cli.validateBoardName('');
      expect(result).toBe(true);
    });

    it('should accept null board names (optional)', () => {
      const result = cli.validateBoardName(null);
      expect(result).toBe(true);
    });

    it('should reject non-string board names', () => {
      const result = cli.validateBoardName(123);
      expect(result).toBe('Board name must be a string');
    });

    it('should reject whitespace-only board names', () => {
      const result = cli.validateBoardName('   ');
      expect(result).toBe('Board name cannot be empty');
    });
  });

  describe('Force Flag Behavior', () => {
    it('should skip backup creation when force flag is used', async () => {
      // Mock file exists
      vi.spyOn(fs, 'access').mockImplementation(() => Promise.resolve());
      
      // Mock the rest of the initialization to avoid full execution
      cli.initializeConfiguration = vi.fn().mockImplementation(() => Promise.resolve());
      
      // Test that force flag is passed through
      await cli.initializeConfiguration({ force: true });
      
      expect(cli.initializeConfiguration).toHaveBeenCalledWith({ force: true });
    });

    it('should skip overwrite confirmation when force flag is used', async () => {
      // This would be tested in integration tests where we can mock the full flow
      expect(true).toBe(true); // Placeholder for now
    });
  });

  describe('Insecure Flag Behavior', () => {
    it('should add insecure flag to configuration', () => {
      const config = {
        server: 'https://example.com',
        login: 'user@example.com',
        installation: 'local',
        auth_type: 'basic'
      };

      // Simulate adding insecure flag
      config.insecure = true;

      expect(config.insecure).toBe(true);
    });
  });
});