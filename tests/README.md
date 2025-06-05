# Test-Infrastruktur für Jira Timesheet CLI

Diese Dokumentation beschreibt die eingerichtete Test-Infrastruktur für das Jira-Timesheet-CLI-Projekt.

## Überblick

Das Projekt verwendet **Vitest** als Test-Framework mit umfassender Mock-Unterstützung für alle externen Abhängigkeiten.

## Verfügbare Test-Scripts

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus (für Entwicklung)
npm run test:watch

# Tests mit Coverage-Report
npm run test:coverage

# Test-UI (interaktive Benutzeroberfläche)
npm run test:ui
```

## Projektstruktur

```
tests/
├── README.md                    # Diese Dokumentation
├── setup.js                     # Globale Test-Setup und Mocks
├── test-utils.js                # Wiederverwendbare Test-Hilfsfunktionen
└── jira-timesheet-cli.test.js   # Haupttests für JiraTimesheetCLI-Klasse
```

## Konfiguration

### vitest.config.js

- **Environment**: Node.js
- **Coverage Provider**: V8
- **Coverage Thresholds**: 70% für alle Metriken
- **Setup Files**: Automatisches Laden von Mocks und Utilities

### Gemockte Abhängigkeiten

Die folgenden externen Module werden automatisch gemockt:

- **node-fetch**: HTTP-Requests
- **fs/promises**: Dateisystem-Operationen
- **os**: Betriebssystem-Informationen
- **path**: Pfad-Operationen
- **chalk**: Terminal-Farben (deaktiviert in Tests)
- **cli-table3**: Tabellen-Ausgabe
- **js-yaml**: YAML-Parsing
- **commander**: CLI-Framework

## Test-Utilities

### Globale Hilfsfunktionen

```javascript
// Mock HTTP-Response erstellen
const response = createMockResponse({ data: 'test' }, 200);

// Mock Worklog-Eintrag erstellen
const entry = createMockWorklogEntry({
  issueKey: 'TEST-123',
  author: 'Test User'
});

// Mock Jira-Issue erstellen
const issue = createMockJiraIssue({
  key: 'TEST-123',
  fields: { summary: 'Test Summary' }
});
```

### Test-Utilities aus test-utils.js

```javascript
import {
  createMockFetchResponse,
  createMockJiraConfig,
  mockConsoleOutput,
  validateCsvOutput,
  validateMarkdownOutput
} from './test-utils.js';
```

## Coverage-Berichte

Coverage-Berichte werden in mehreren Formaten generiert:

- **Terminal**: Direkte Ausgabe nach Test-Ausführung
- **JSON**: `coverage/test-results.json`
- **HTML**: `coverage/index.html` (interaktiver Bericht)

### Coverage-Ziele

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

## Beispiel-Tests

### Einfacher Unit-Test

```javascript
describe('formatTime', () => {
  it('should format seconds to hours and minutes', () => {
    expect(cli.formatTime(3600)).toBe('1h');
    expect(cli.formatTime(1800)).toBe('30m');
    expect(cli.formatTime(5400)).toBe('1h 30m');
  });
});
```

### Test mit Mocks

```javascript
describe('loadConfig', () => {
  it('should load valid configuration successfully', async () => {
    const mockConfig = {
      server: 'https://test.atlassian.net',
      login: 'test@example.com'
    };
    
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
    yaml.load.mockReturnValue(mockConfig);
    process.env.JIRA_API_TOKEN = 'test-token';

    const result = await cli.loadConfig();
    expect(result).toEqual(mockConfig);
  });
});
```

## Best Practices

### 1. Test-Isolation
- Jeder Test ist isoliert und beeinflusst andere Tests nicht
- Mocks werden zwischen Tests automatisch zurückgesetzt

### 2. Aussagekräftige Test-Namen
```javascript
// ✅ Gut
it('should throw error when API token not set', () => {});

// ❌ Schlecht  
it('should fail', () => {});
```

### 3. Arrange-Act-Assert Pattern
```javascript
it('should format time correctly', () => {
  // Arrange
  const seconds = 3600;
  
  // Act
  const result = cli.formatTime(seconds);
  
  // Assert
  expect(result).toBe('1h');
});
```

### 4. Mock-Verwaltung
```javascript
beforeEach(() => {
  vi.clearAllMocks(); // Mocks zwischen Tests zurücksetzen
});
```

## Debugging

### Console-Output in Tests
```javascript
const { logs, restore } = mockConsoleOutput();
// Test ausführen
expect(logs).toContain('Expected log message');
restore();
```

### Test-spezifische Timeouts
```javascript
it('should handle long operations', async () => {
  // Test mit erhöhtem Timeout
}, 15000);
```

## Erweiterung der Tests

### Neue Test-Datei hinzufügen
1. Datei in `tests/` mit `.test.js` Endung erstellen
2. Vitest und benötigte Utilities importieren
3. Tests schreiben und ausführen

### Neue Mocks hinzufügen
1. Mock in `tests/setup.js` definieren
2. Bei Bedarf in `test-utils.js` Hilfsfunktionen erstellen
3. In Tests verwenden

## Kontinuierliche Integration

Die Test-Infrastruktur ist bereit für CI/CD-Pipelines:

```yaml
# Beispiel für GitHub Actions
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm run test:coverage
```

## Troubleshooting

### Häufige Probleme

1. **Mock funktioniert nicht**: Prüfen ob Mock in `setup.js` korrekt definiert ist
2. **Import-Fehler**: ES-Module-Syntax verwenden (`import` statt `require`)
3. **Coverage zu niedrig**: Mehr Tests für ungetestete Bereiche hinzufügen

### Debug-Modus
```bash
# Tests mit Debug-Output
DEBUG=vitest* npm test