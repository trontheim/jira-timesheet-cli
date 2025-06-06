/**
 * Tests for configuration management and path handling
 * Migrated to use mock-fs for file system mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';
import { mockFs } from './setup.js';
import { setupMockFileSystem } from './test-utils.js';

const { JiraTimesheetCLI } = await import('../timesheet.js');

describe('Configuration Management', () => {
  let cli;
  let originalEnv;
  let mockFileSystem;

  beforeEach(() => {
    cli = new JiraTimesheetCLI();
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    
    // Setup mock file system with default structure
    mockFileSystem = setupMockFileSystem();
    
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    mockFs.restore();
  });

  describe('getConfigPath', () => {
    it('should prioritize override parameter', () => {
      const overridePath = '/custom/path/config.yml';
      process.env.JIRA_CONFIG_FILE = '/env/path/config.yml';
      
      const result = cli.getConfigPath(overridePath);
      
      expect(result).toBe(overridePath);
    });

    it('should use environment variable when no override', () => {
      const envPath = '/env/path/config.yml';
      process.env.JIRA_CONFIG_FILE = envPath;
      
      const result = cli.getConfigPath();
      
      expect(result).toBe(envPath);
    });

    it('should use default path when no override or env var', () => {
      delete process.env.JIRA_CONFIG_FILE;
      
      const result = cli.getConfigPath();
      
      expect(result).toBe(cli.configPath);
      expect(result).toContain('.config/.jira/.config.yml');
    });

    it('should handle empty string override', () => {
      process.env.JIRA_CONFIG_FILE = '/env/path/config.yml';
      
      const result = cli.getConfigPath('');
      
      expect(result).toBe('/env/path/config.yml');
    });

    it('should handle null override', () => {
      process.env.JIRA_CONFIG_FILE = '/env/path/config.yml';
      
      const result = cli.getConfigPath(null);
      
      expect(result).toBe('/env/path/config.yml');
    });

    it('should handle undefined override', () => {
      process.env.JIRA_CONFIG_FILE = '/env/path/config.yml';
      
      const result = cli.getConfigPath(undefined);
      
      expect(result).toBe('/env/path/config.yml');
    });
  });

  describe('loadConfig', () => {
    describe('successful loading', () => {
      it('should load YAML configuration', async () => {
        const mockConfigData = {
          server: 'https://test.atlassian.net',
          login: 'test@example.com',
          project: { key: 'TEST' },
          installation: 'cloud',
          auth_type: 'basic'
        };
        
        // Setup mock file system with the config file
        mockFs.restore();
        mockFs({
          '/mock/config.yml': yaml.dump(mockConfigData),
          '/tmp': {}
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = 'test-token';

        const result = await localCli.loadConfig('/mock/config.yml');

        expect(localCli.config).toEqual(mockConfigData);
        expect(localCli.apiToken).toBe('test-token');
        expect(result).toEqual(mockConfigData);
      });

      it('should load JSON configuration', async () => {
        const mockConfig = {
          server: 'https://test.atlassian.net',
          login: 'test@example.com',
          project: 'TEST'
        };
        
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': JSON.stringify(mockConfig)
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = 'test-token';

        const result = await localCli.loadConfig('/mock/config.yml');

        expect(result).toEqual(mockConfig);
        expect(localCli.config).toEqual(mockConfig);
      });

      it('should use custom config path', async () => {
        const customPath = '/custom/config.yml';
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          [customPath]: yaml.dump(mockConfig)
        });
        
        process.env.JIRA_API_TOKEN = 'test-token';

        await cli.loadConfig(customPath);

        expect(cli.config).toEqual(mockConfig);
      });
    });

    describe('error handling', () => {
      it('should throw specific error for missing file', async () => {
        // Restore and setup empty mock file system
        mockFs.restore();
        mockFs({});
        
        cli.configPath = '/mock/config.yml';

        await expect(cli.loadConfig()).rejects.toThrow(
          /Configuration file not found/
        );
      });

      it('should throw error for missing API token', async () => {
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': yaml.dump(mockConfig)
        });
        
        const localCli = new JiraTimesheetCLI();
        delete process.env.JIRA_API_TOKEN;

        await expect(localCli.loadConfig('/mock/config.yml')).rejects.toThrow(
          'JIRA_API_TOKEN environment variable not set'
        );
      });

      it('should handle permission denied errors', async () => {
        // Restore and setup mock fs to simulate permission error
        mockFs.restore();
        mockFs({
          '/mock/config.yml': mockFs.file({
            content: 'server: https://test.atlassian.net',
            mode: 0o000 // No permissions
          })
        });

        cli.configPath = '/mock/config.yml';

        await expect(cli.loadConfig()).rejects.toThrow();
      });

      it('should handle YAML parsing errors', async () => {
        // Restore and setup invalid YAML content
        mockFs.restore();
        mockFs({
          '/mock/config.yml': 'invalid: yaml: [content'
        });
        
        cli.configPath = '/mock/config.yml';
        process.env.JIRA_API_TOKEN = 'test-token';

        await expect(cli.loadConfig()).rejects.toThrow();
      });

      it('should handle empty config file', async () => {
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': ''
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = 'test-token';
  
        const result = await localCli.loadConfig('/mock/config.yml');
        expect(result).toBeUndefined();
      });

      it('should handle malformed config structure', async () => {
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': 'just a string'
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = 'test-token';

        const result = await localCli.loadConfig('/mock/config.yml');
        expect(localCli.config).toBe('just a string');
      });

      it('should handle file system errors', async () => {
        // Restore and setup mock file system that will cause read errors
        mockFs.restore();
        mockFs({
          '/mock': mockFs.directory({
            mode: 0o000 // No permissions on directory
          })
        });

        cli.configPath = '/mock/config.yml';

        await expect(cli.loadConfig()).rejects.toThrow();
      });
    });

    describe('environment variable handling', () => {
      it('should handle empty API token environment variable', async () => {
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': yaml.dump(mockConfig)
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = '';

        await expect(localCli.loadConfig('/mock/config.yml')).rejects.toThrow(
          'JIRA_API_TOKEN environment variable not set'
        );
      });

      it('should handle whitespace-only API token', async () => {
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': yaml.dump(mockConfig)
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = '   ';

        const result = await localCli.loadConfig('/mock/config.yml');
        expect(localCli.apiToken).toBe('   ');
      });

      it('should preserve API token with special characters', async () => {
        const mockConfig = { server: 'https://test.atlassian.net' };
        const specialToken = 'token-with-special-chars!@#$%^&*()';
        
        // Restore and setup fresh mock file system
        mockFs.restore();
        mockFs({
          '/mock/config.yml': yaml.dump(mockConfig)
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = specialToken;

        await localCli.loadConfig('/mock/config.yml');
        expect(localCli.apiToken).toBe(specialToken);
      });
    });

    describe('config path resolution', () => {
      it('should resolve relative paths correctly', async () => {
        const relativePath = './config/jira.yml';
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        mockFs.restore();
        mockFs({
          [relativePath]: yaml.dump(mockConfig)
        });
        
        process.env.JIRA_API_TOKEN = 'test-token';

        await cli.loadConfig(relativePath);

        expect(cli.config).toEqual(mockConfig);
      });

      it('should handle absolute paths', async () => {
        const absolutePath = '/absolute/path/to/config.yml';
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        mockFs.restore();
        mockFs({
          [absolutePath]: yaml.dump(mockConfig)
        });
        
        process.env.JIRA_API_TOKEN = 'test-token';

        await cli.loadConfig(absolutePath);

        expect(cli.config).toEqual(mockConfig);
      });

      it('should handle paths with special characters', async () => {
        const specialPath = '/path with spaces/config-file.yml';
        const mockConfig = { server: 'https://test.atlassian.net' };
        
        mockFs.restore();
        mockFs({
          [specialPath]: yaml.dump(mockConfig)
        });
        
        process.env.JIRA_API_TOKEN = 'test-token';

        await cli.loadConfig(specialPath);

        expect(cli.config).toEqual(mockConfig);
      });
    });
  });

  describe('configuration validation', () => {
    it('should handle config with minimal required fields', async () => {
      const minimalConfig = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com'
      };
      
      // Restore and setup fresh mock file system
      mockFs.restore();
      mockFs({
        '/mock/config.yml': JSON.stringify(minimalConfig)
      });
      
      const localCli = new JiraTimesheetCLI();
      process.env.JIRA_API_TOKEN = 'test-token';

      const result = await localCli.loadConfig('/mock/config.yml');
      expect(result).toEqual(minimalConfig);
      expect(localCli.config).toEqual(minimalConfig);
    });

    it('should handle config with extra fields', async () => {
      const extendedConfig = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: { key: 'TEST' },
        installation: 'cloud',
        auth_type: 'basic',
        extra_field: 'extra_value',
        nested: {
          field: 'value'
        }
      };
      
      // Restore and setup fresh mock file system
      mockFs.restore();
      mockFs({
        '/mock/config.yml': JSON.stringify(extendedConfig)
      });
      
      const localCli = new JiraTimesheetCLI();
      process.env.JIRA_API_TOKEN = 'test-token';

      const result = await localCli.loadConfig('/mock/config.yml');
      expect(result).toEqual(extendedConfig);
      expect(localCli.config).toEqual(extendedConfig);
    });

    it('should handle different project configurations', async () => {
      const configs = [
        { project: 'STRING-PROJECT' },
        { project: { key: 'OBJECT-PROJECT' } },
        { project: { key: 'OBJECT-PROJECT', name: 'Project Name' } }
      ];

      for (const projectConfig of configs) {
        const fullConfig = {
          server: 'https://test.atlassian.net',
          login: 'test@example.com',
          ...projectConfig
        };
        
        // Restore and setup fresh mock file system for each iteration
        mockFs.restore();
        mockFs({
          '/mock/config.yml': JSON.stringify(fullConfig)
        });
        
        const localCli = new JiraTimesheetCLI();
        process.env.JIRA_API_TOKEN = 'test-token';

        const result = await localCli.loadConfig('/mock/config.yml');
        expect(result.project).toEqual(projectConfig.project);
        expect(localCli.config.project).toEqual(projectConfig.project);
      }
    });
  });

  describe('constructor', () => {
    it('should initialize with correct default path', () => {
      const newCli = new JiraTimesheetCLI();
      
      expect(newCli.config).toBeNull();
      expect(newCli.apiToken).toBeNull();
      expect(newCli.configPath).toContain('.config/.jira/.config.yml');
    });

    it('should use os.homedir for default path', () => {
      // Test that the constructor uses os.homedir - we can't easily mock it after import
      // so we just verify the path structure is correct
      const newCli = new JiraTimesheetCLI();
      
      expect(newCli.configPath).toContain('.config/.jira/.config.yml');
    });
  });

  describe('showConfig', () => {
    it('should display all config fields when loaded', async () => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com',
        project: { key: 'TEST', name: 'Test Project' },
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
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TEST')
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing optional fields', async () => {
      cli.config = {
        server: 'https://test.atlassian.net',
        login: 'test@example.com'
      };
      cli.apiToken = 'test-token';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.showConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not set')
      );

      consoleSpy.mockRestore();
    });

    it('should show environment variable source', async () => {
      cli.config = { server: 'https://test.atlassian.net' };
      cli.apiToken = 'test-token';
      process.env.JIRA_CONFIG_FILE = '/custom/path/config.yml';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.showConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('JIRA_CONFIG_FILE env var')
      );

      consoleSpy.mockRestore();
    });

    it('should show default path when no env var', async () => {
      cli.config = { server: 'https://test.atlassian.net' };
      cli.apiToken = 'test-token';
      delete process.env.JIRA_CONFIG_FILE;

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.showConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Default:')
      );

      consoleSpy.mockRestore();
    });
  });

});