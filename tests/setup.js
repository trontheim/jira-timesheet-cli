/**
 * Vitest setup file for mocks and test utilities
 * This file is executed before each test file
 */

import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers.js';
import mockFs from 'mock-fs';

// Setup MSW server for HTTP request mocking
export const server = setupServer(...handlers);

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  
  // Environment-Isolation: Setze kritische Environment-Variablen für Tests
  // Diese werden automatisch in afterEach wieder zurückgesetzt
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('JIRA_API_TOKEN', 'mock-api-token');
  vi.stubEnv('JIRA_CONFIG_FILE', undefined); // Verhindert Host-Einflüsse durch lokale Config-Dateien
});

// Reset handlers, mock-fs and environment variables after each test
afterEach(() => {
  server.resetHandlers();
  mockFs.restore();
  vi.restoreAllMocks();
  // Environment-Cleanup: Entfernt alle Environment-Variable-Stubs für saubere Test-Isolation
  vi.unstubAllEnvs();
});

// Close MSW server after all tests
afterAll(() => {
  server.close();
});

// Mock chalk to return plain text in tests
vi.mock('chalk', () => {
  const mockChalk = {
    red: vi.fn((text) => text),
    green: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    cyan: vi.fn((text) => text),
    gray: vi.fn((text) => text),
    bold: vi.fn((text) => text),
    'bold.green': vi.fn((text) => text),
    'bold.blue': vi.fn((text) => text)
  };
  
  // Add nested bold properties
  mockChalk.bold.green = vi.fn((text) => text);
  mockChalk.bold.blue = vi.fn((text) => text);
  
  return {
    default: mockChalk
  };
});

// Mock cli-table3
vi.mock('cli-table3', () => {
  const mockTable = function() {
    this.push = vi.fn();
    this.toString = vi.fn(() => 'mocked table output');
    return this;
  };
  return {
    default: mockTable
  };
});

// Mock commander
vi.mock('commander', () => {
  const mockCommand = {
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    addOption: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    action: vi.fn().mockReturnThis(),
    parse: vi.fn().mockReturnThis(),
    parseAsync: vi.fn().mockReturnThis(),
    hook: vi.fn().mockReturnThis(),
    command: vi.fn().mockReturnThis(),
    alias: vi.fn().mockReturnThis(),
    opts: vi.fn(() => ({})),
    outputHelp: vi.fn(),
    options: []
  };
  
  return {
    Command: vi.fn().mockImplementation(() => mockCommand),
    Option: vi.fn().mockImplementation(() => ({
      choices: vi.fn().mockReturnThis(),
      default: vi.fn().mockReturnThis()
    }))
  };
});

/**
 * Hilfsfunktion zum Stubben von test-spezifischen Environment-Variablen
 * Kann in individuellen Tests verwendet werden, um zusätzliche Environment-Variablen zu setzen
 *
 * @param {Object} envVars - Objekt mit Environment-Variablen als Key-Value-Paare
 * @example
 * stubTestEnv({
 *   CUSTOM_VAR: 'test-value',
 *   DEBUG: 'true'
 * });
 */
export const stubTestEnv = (envVars) => {
  Object.entries(envVars).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
};

// Global test utilities
global.createMockResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data))
});

global.createMockWorklogEntry = (overrides = {}) => ({
  issueKey: 'TEST-123',
  issueSummary: 'Test issue summary',
  author: 'Test User',
  timeSpent: '2h',
  timeSpentSeconds: 7200,
  comment: 'Test comment',
  started: '2024-01-15T09:00:00.000+0000',
  created: '2024-01-15T09:00:00.000+0000',
  ...overrides
});

global.createMockJiraIssue = (overrides = {}) => ({
  key: 'TEST-123',
  fields: {
    summary: 'Test issue summary'
  },
  ...overrides
});

global.createMockJiraWorklog = (overrides = {}) => ({
  timeSpent: '2h',
  timeSpentSeconds: 7200,
  comment: 'Test comment',
  started: '2024-01-15T09:00:00.000+0000',
  created: '2024-01-15T09:00:00.000+0000',
  author: {
    displayName: 'Test User',
    emailAddress: 'test@example.com'
  },
  ...overrides
});

// Console methods for testing
global.mockConsole = () => {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  return originalConsole;
};

// Export mock-fs for use in tests
export { default as mockFs } from 'mock-fs';