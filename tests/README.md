# Test Documentation

## Overview

This directory contains comprehensive unit and integration tests for the JIRA Timesheet CLI application. The test suite covers all major functionality including the new date parsing capabilities.

## Test Files

### Core Functionality Tests

- **`jira-timesheet-cli.test.js`** - Main test file for the JiraTimesheetCLI class
- **`api-communication.test.js`** - Tests for JIRA API communication and authentication
- **`config-management.test.js`** - Tests for configuration loading and management
- **`data-processing.test.js`** - Tests for data processing and JQL query construction
- **`output-formatting.test.js`** - Tests for output formatting (table, CSV, markdown, JSON)
- **`cli-integration.test.js`** - Integration tests for CLI command parsing and execution

### Date Parsing Tests (New)

- **`date-parsing.test.js`** - Comprehensive tests for the new `convertDateFormat()` function

## New Date Parsing Test Coverage

The new date parsing functionality is thoroughly tested across multiple test files:

### 1. Unit Tests (`date-parsing.test.js`)

#### Valid German Date Format Conversion
- Single digit day and month conversion (e.g., `5.5.2025` → `2025-05-05`)
- Double digit day and month conversion (e.g., `15.05.2025` → `2025-05-15`)
- Mixed single and double digits (e.g., `5.12.2025` → `2025-12-05`)
- Leap year date handling (`29.02.2024` → `2024-02-29`)
- Month boundary validation (31-day vs 30-day months)

#### ISO Date Format Recognition
- Recognition and preservation of valid ISO dates (`2025-05-15` → `2025-05-15`)
- Validation of ISO dates for actual existence

#### Invalid Format Validation
- Rejection of invalid format patterns (`05/05/2025`, `2025/05/05`)
- Rejection of completely invalid formats (`not-a-date`, `12345`)
- Proper error handling for empty/null/undefined inputs
- Type validation (non-string inputs)

#### Invalid Date Values Validation
- Invalid day validation (0, 32, 99)
- Invalid month validation (0, 13, 99)
- Invalid year validation (1899, 2101)
- Non-existent date validation (`31.02.2025`, `29.02.2025`)

#### Edge Cases and Leap Years
- Leap year validation (2024 vs 2023, century years)
- Year boundary handling (1999-2100)
- Month boundary validation for different month lengths
- Proper zero-padding for single digits

### 2. Integration Tests (`cli-integration.test.js`)

#### German Date Format Integration
- Conversion of German dates in CLI parameters
- JQL query construction with converted dates
- Single digit German date handling with zero-padding
- Mixed date format handling in same query
- Leap year date processing
- Error handling for invalid German dates
- Edge case handling (month boundaries)
- ISO date preservation when already correct

### 3. Data Processing Tests (`data-processing.test.js`)

#### JQL Query Construction with Date Conversion
- German date format conversion in JQL queries
- Single digit German date handling in JQL
- Mixed date format handling in JQL
- Error rejection for invalid German dates during JQL construction

### 4. Main CLI Tests (`jira-timesheet-cli.test.js`)

#### Direct Function Testing
- Basic German to ISO conversion
- ISO format recognition and preservation
- Error handling for invalid formats and values
- Null/undefined input validation
- Leap year validation

## Test Scenarios Covered

### Date Format Conversion
✅ DD.MM.YYYY → YYYY-MM-DD conversion  
✅ YYYY-MM-DD format recognition  
✅ Single digit padding (5.5.2025 → 2025-05-05)  
✅ Invalid format rejection (05/05/2025)  
✅ Invalid date rejection (31.02.2025)  
✅ Leap year validation  
✅ Month boundary validation  

### CLI Integration
✅ German dates in CLI parameters  
✅ JQL query construction with converted dates  
✅ Mixed format handling  
✅ Error propagation from date parsing  
✅ Backward compatibility with ISO dates  

### Error Handling
✅ Invalid day/month/year ranges  
✅ Non-existent dates  
✅ Invalid format patterns  
✅ Type validation  
✅ Null/undefined handling  

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/date-parsing.test.js
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Results Summary

- **Total Tests**: 284 tests
- **Test Files**: 7 files
- **All Tests**: ✅ PASSING
- **New Date Parsing Tests**: 22 tests added
- **Integration Tests**: 7 additional tests for German date format integration
- **Data Processing Tests**: 4 additional tests for JQL date conversion
- **Main CLI Tests**: 6 additional tests for direct function testing

## Key Features Tested

1. **Date Format Conversion**: Comprehensive testing of DD.MM.YYYY to YYYY-MM-DD conversion
2. **Input Validation**: Thorough validation of date inputs and error handling
3. **CLI Integration**: End-to-end testing of German date formats in CLI commands
4. **JQL Query Construction**: Verification that converted dates work correctly in JIRA queries
5. **Backward Compatibility**: Ensuring existing ISO date functionality remains intact
6. **Error Handling**: Proper error messages and validation for invalid inputs

## Notes

- JavaScript's `Date` constructor automatically corrects some invalid dates (e.g., `2025-02-29` becomes `2025-03-01`), which is documented in the tests
- The current implementation focuses on the most common German date format (DD.MM.YYYY) and ISO format (YYYY-MM-DD)
- All tests use proper mocking to avoid external dependencies during testing
- Tests include both positive and negative test cases for comprehensive coverage