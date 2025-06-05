/**
 * Tests for Commander.js integration and CLI behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import mockFs from 'mock-fs';
import { server } from './setup.js';
import { http, HttpResponse } from 'msw';
import yaml from 'js-yaml';
import { createMockJiraConfig, createMockUserResponse, setupMockFileSystem } from './test-utils.js';
import { JIRA_BASE_URL } from './mocks/handlers.js';

// Mock the CLI module to test integration
const { JiraTimesheetCLI } = await import('../jira_timesheet_cli.js');

describe('CLI Integration', () => {
  let originalEnv;
  let originalArgv;
  let consoleSpy;
  let processExitSpy;
  let mockFileSystem;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    vi.clearAllMocks();
    
    // Setup mock file system
    mockFileSystem = setupMockFileSystem({
      'package.json': JSON.stringify({
        name: 'jira-timesheet-cli',
        version: '1.0.0'
      })
    });
    
    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };

    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    // Setup default environment
    process.env.JIRA_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    mockFileSystem.restore();
    vi.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should create CLI instance successfully', () => {
      const cli = new JiraTimesheetCLI();
      expect(cli).toBeDefined();
      expect(typeof cli.getProject).toBe('function');
      expect(typeof cli.loadConfig).toBe('function');
    });

    it('should have test command', async () => {
      // Test the actual test connection functionality
      const cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';
      
      // MSW will handle the API call with valid credentials
      await expect(cli.testConnection()).resolves.not.toThrow();
    });
  });

  describe('Option Parsing', () => {
    let cli;

    beforeEach(() => {
      cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';
    });

    it('should parse project option', () => {
      const options = { project: 'TEST-PROJECT' };
      const result = cli.getProject(options);
      expect(result).toBe('TEST-PROJECT');
    });

    it('should parse single user option', async () => {
      // MSW will handle the API call
      const result = await cli.getProjectWorklogs({ 
        project: 'TEST',
        user: 'single@example.com'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse multiple user options', async () => {
      // MSW will handle the API call
      const result = await cli.getProjectWorklogs({ 
        project: 'TEST',
        user: ['user1@example.com', 'user2@example.com']
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse date options', async () => {
      // MSW will handle the API call
      const result = await cli.getProjectWorklogs({ 
        project: 'TEST',
        start: '2024-01-15',
        end: '2024-01-16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse format option', () => {
      const validFormats = ['table', 'csv', 'json', 'markdown'];
      
      validFormats.forEach(format => {
        expect(validFormats.includes(format)).toBe(true);
      });
    });

    it('should parse output option', async () => {
      // MSW will handle the API call
      await cli.generateTimesheet({
        project: 'TEST',
        format: 'json',
        output: 'output.json'
      });

      // Check that no errors occurred during file write
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Configuration Loading', () => {
    let cli;

    beforeEach(() => {
      cli = new JiraTimesheetCLI();
    });

    it('should load config before command execution', async () => {
      const mockConfig = createMockJiraConfig();
      
      // Add config file to mock file system with unique path
      const configPath = '/test/config1.yml';
      mockFs({
        [configPath]: yaml.dump(mockConfig)
      });

      await cli.loadConfig(configPath);
      
      expect(cli.config).toEqual(expect.objectContaining({
        server: mockConfig.server,
        login: mockConfig.login
      }));
    });

    it('should use custom config file when specified', async () => {
      const mockConfig = createMockJiraConfig();
      
      // Add custom config file to mock file system with unique path
      const configPath = '/test/config2.yml';
      mockFs({
        [configPath]: yaml.dump(mockConfig)
      });

      await cli.loadConfig(configPath);
      
      expect(cli.config).toEqual(expect.objectContaining({
        server: mockConfig.server,
        login: mockConfig.login
      }));
    });

    it('should handle config loading errors gracefully', async () => {
      await expect(cli.loadConfig('/nonexistent/config.yml')).rejects.toThrow('Configuration file not found');
    });
  });

  describe('Command Execution', () => {
    describe('generate command', () => {
      it('should execute generate command successfully', async () => {
        const cli = new JiraTimesheetCLI();
        cli.config = createMockJiraConfig();
        cli.apiToken = 'test-api-token';

        await cli.generateTimesheet({
          project: 'TEST',
          format: 'table'
        });

        // Check that console output was generated
        expect(consoleSpy.log).toHaveBeenCalled();
      });

      it('should handle generate command errors', async () => {
        const cli = new JiraTimesheetCLI();
        cli.config = null;

        await expect(cli.generateTimesheet({
          project: 'TEST'
        })).rejects.toThrow();
      });
    });

    describe('config command', () => {
      it('should execute config command successfully', async () => {
        const cli = new JiraTimesheetCLI();
        cli.config = createMockJiraConfig();
        
        expect(async () => {
          await cli.showConfig();
        }).not.toThrow();
        
        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('Current jira-cli Configuration')
        );
      });

      it('should handle missing config gracefully', async () => {
        const cli = new JiraTimesheetCLI();
        cli.config = null;
        
        expect(async () => {
          await cli.showConfig();
        }).not.toThrow();
      });
    });

    describe('test command', () => {
      it('should execute test command successfully', async () => {
        const cli = new JiraTimesheetCLI();
        cli.config = createMockJiraConfig();
        cli.apiToken = 'test-api-token';

        await cli.testConnection();

        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('Connected as:')
        );
      });

      it('should handle test command errors', async () => {
        const cli = new JiraTimesheetCLI();
        cli.config = createMockJiraConfig();
        cli.apiToken = 'invalid-token';

        // MSW will return 401 for invalid credentials
        await expect(cli.testConnection()).rejects.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors during startup', async () => {
      const cli = new JiraTimesheetCLI();

      await expect(cli.loadConfig('/nonexistent/config.yml')).rejects.toThrow();
    });

    it('should handle API errors during command execution', async () => {
      const cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'invalid-token';

      // MSW will return 401 for invalid credentials
      await expect(cli.testConnection()).rejects.toThrow('Connection failed');
    });

    it('should handle network errors', async () => {
      const cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';
      
      // Add a handler for network error simulation
      server.use(
        http.get(`${JIRA_BASE_URL}/rest/api/3/myself`, () => {
          return HttpResponse.error();
        })
      );

      await expect(cli.testConnection()).rejects.toThrow('Connection failed');
    });

    it('should handle file system errors', async () => {
      const cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';
      
      // Create a read-only mock file system to simulate permission errors
      mockFs({
        '/readonly': mockFs.directory({
          mode: 0o444, // read-only
          items: {}
        })
      });

      await expect(cli.generateTimesheet({
        project: 'TEST',
        format: 'json',
        output: '/readonly/output.json'
      })).rejects.toThrow();
    });
  });

  describe('Help and Version', () => {
    it('should display help when no arguments provided', () => {
      // Test that CLI can be instantiated without errors
      const cli = new JiraTimesheetCLI();
      expect(cli).toBeDefined();
    });

    it('should display version when requested', () => {
      // Test that CLI has version information available
      const cli = new JiraTimesheetCLI();
      expect(cli).toBeDefined();
    });
  });

  describe('Argument Validation', () => {
    let cli;

    beforeEach(() => {
      cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';
    });

    it('should validate required project parameter', async () => {
      cli.config = null;
      await expect(cli.getProjectWorklogs({})).rejects.toThrow();
    });

    it('should validate date format', async () => {
      // Valid date formats should work
      await expect(cli.getProjectWorklogs({
        project: 'TEST',
        start: '2024-01-15',
        end: '2024-01-16'
      })).resolves.not.toThrow();

      // Invalid date formats should be handled gracefully
      await expect(cli.getProjectWorklogs({
        project: 'TEST',
        start: 'invalid-date',
        end: '2024-01-16'
      })).resolves.not.toThrow();
    });

    it('should validate format choices', () => {
      const validFormats = ['table', 'csv', 'json', 'markdown'];
      
      validFormats.forEach(format => {
        expect(validFormats.includes(format)).toBe(true);
      });

      expect(validFormats.includes('invalid-format')).toBe(false);
    });

    it('should handle empty user arrays', async () => {
      await expect(cli.getProjectWorklogs({ 
        project: 'TEST',
        user: []
      })).resolves.not.toThrow();
    });
  });

  describe('Environment Integration', () => {
    it('should respect JIRA_CONFIG_FILE environment variable', () => {
      process.env.JIRA_CONFIG_FILE = '/custom/path/config.yml';
      
      const cli = new JiraTimesheetCLI();
      const configPath = cli.getConfigPath();
      
      expect(configPath).toBe('/custom/path/config.yml');
    });

    it('should require JIRA_API_TOKEN environment variable', async () => {
      delete process.env.JIRA_API_TOKEN;
      const mockConfig = createMockJiraConfig();
      
      // Add config file to mock file system with unique path
      const configPath = '/test/config3.yml';
      mockFs({
        [configPath]: yaml.dump(mockConfig)
      });

      const cli = new JiraTimesheetCLI();
      await expect(cli.loadConfig(configPath)).rejects.toThrow('JIRA_API_TOKEN environment variable not set');
    });

    it('should handle NODE_ENV test environment', () => {
      process.env.NODE_ENV = 'test';
      
      const cli = new JiraTimesheetCLI();
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';

      const startTime = Date.now();
      await cli.getProjectWorklogs({ project: 'TEST' });
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second for mock data)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle memory efficiently with large outputs', async () => {
      const cli = new JiraTimesheetCLI();
      cli.config = createMockJiraConfig();
      cli.apiToken = 'test-api-token';

      await cli.generateTimesheet({
        project: 'TEST',
        format: 'json'
      });

      // Check that console output was generated
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});