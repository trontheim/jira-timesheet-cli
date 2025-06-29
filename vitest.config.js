import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment for Node.js
    environment: 'node',
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '__tests__/**',
        '*.config.js',
        'coverage/**',
        'dist/**',
        'build/**'
      ],
      include: [
        'timesheet.js',
        'src/**/*.js',
        'lib/**/*.js'
      ],
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,jsx}',
      '__tests__/**/*.{test,spec}.{js,mjs,cjs,jsx}',
      '**/*.{test,spec}.{js,mjs,cjs,jsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**'
    ],
    
    // Setup files
    setupFiles: ['./tests/setup.js'],
    
    // Test timeout
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    
    // Output directory for reports
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html'
    }
  }
});