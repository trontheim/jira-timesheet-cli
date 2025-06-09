# 🤝 Contributing

Vielen Dank für Ihr Interesse an der Mitarbeit am JIRA Timesheet CLI! Wir freuen uns über Beiträge aller Art.

## 🚀 Erste Schritte

### Entwicklungsumgebung einrichten

```bash
# Repository forken und klonen
git clone https://github.com/yourusername/jira-timesheet-cli.git
cd jira-timesheet-cli

# Dependencies installieren
npm install

# API Token für Tests setzen
export JIRA_API_TOKEN="your-test-token"

# Konfiguration für Tests erstellen
timesheet init
```

### Lokale Entwicklung

```bash
# Tool lokal testen
node timesheet.js generate -p TEST

# Global verfügbar machen (optional)
npm link

# Tests ausführen
npm test

# Build testen
npm run build
```

## 📋 Entwicklungsrichtlinien

### Code-Stil

- **JavaScript/Node.js**: ES6+ Features verwenden
- **Kommentare**: Englisch für Code-Kommentare
- **Funktionen**: Kleine, fokussierte Funktionen bevorzugen
- **Error Handling**: Robuste Fehlerbehandlung implementieren
- **Async/Await**: Moderne Promise-Syntax verwenden

### Commit-Nachrichten

Verwenden Sie aussagekräftige Commit-Nachrichten:

```
feat: Add support for multiple users in generate command
fix: Handle API timeout errors gracefully
docs: Update installation instructions
test: Add unit tests for date parsing
```

**Format:**
- `feat:` - Neue Features
- `fix:` - Bugfixes
- `docs:` - Dokumentation
- `test:` - Tests
- `refactor:` - Code-Refactoring
- `style:` - Code-Formatierung

### Testing

```bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# Spezifische Tests
npm test -- --grep "API communication"
```

**Test-Kategorien:**
- Unit Tests für einzelne Funktionen
- Integration Tests für API-Kommunikation
- CLI Tests für Kommandozeilen-Interface

### Dokumentation

- README.md für Hauptdokumentation
- Code-Kommentare für komplexe Logik
- JSDoc für Funktionen und Klassen
- Beispiele für neue Features

## 🐛 Bug Reports

### Vor dem Melden

1. **Suchen Sie nach bestehenden Issues**
2. **Testen Sie mit der neuesten Version**
3. **Reproduzieren Sie das Problem**

### Bug Report Template

```markdown
**Beschreibung:**
Kurze Beschreibung des Problems

**Schritte zur Reproduktion:**
1. Führen Sie `timesheet generate -p TEST` aus
2. ...

**Erwartetes Verhalten:**
Was sollte passieren

**Tatsächliches Verhalten:**
Was passiert stattdessen

**Umgebung:**
- OS: macOS 14.0
- Node.js: v18.19.0
- Tool Version: 1.0.0

**Zusätzliche Informationen:**
Logs, Screenshots, etc.
```

## ✨ Feature Requests

### Vor dem Vorschlag

1. **Prüfen Sie bestehende Feature Requests**
2. **Überlegen Sie die Kompatibilität mit jira-cli**
3. **Berücksichtigen Sie die Auswirkungen auf bestehende Nutzer**

### Feature Request Template

```markdown
**Feature-Beschreibung:**
Was möchten Sie hinzufügen?

**Motivation:**
Warum ist dieses Feature nützlich?

**Vorgeschlagene Lösung:**
Wie könnte es implementiert werden?

**Alternativen:**
Andere Lösungsansätze

**Zusätzlicher Kontext:**
Screenshots, Mockups, etc.
```

## 🔄 Pull Requests

### Vor dem Pull Request

1. **Issue erstellen oder referenzieren**
2. **Feature Branch erstellen**
3. **Tests hinzufügen/aktualisieren**
4. **Dokumentation aktualisieren**

### Pull Request Prozess

```bash
# Feature Branch erstellen
git checkout -b feature/multi-user-support

# Änderungen committen
git add .
git commit -m "feat: Add multi-user support for generate command"

# Branch pushen
git push origin feature/multi-user-support

# Pull Request erstellen
```

### Pull Request Checklist

- [ ] **Tests**: Neue Tests hinzugefügt oder bestehende aktualisiert
- [ ] **Dokumentation**: README.md oder andere Docs aktualisiert
- [ ] **Kompatibilität**: Rückwärtskompatibilität gewährleistet
- [ ] **Code-Stil**: Konsistent mit bestehendem Code
- [ ] **Build**: `npm run build` erfolgreich
- [ ] **Tests**: `npm test` erfolgreich

## 🏗️ Architektur

### Projektstruktur

```
jira-timesheet-cli/
├── timesheet.js          # Hauptdatei
├── package.json          # Dependencies und Scripts
├── esbuild.config.js     # Build-Konfiguration
├── vitest.config.js      # Test-Konfiguration
├── tests/                # Test-Dateien
├── docs/                 # Zusätzliche Dokumentation
└── binaries/             # Generierte Binaries
```

### Wichtige Komponenten

- **CLI Interface**: Commander.js für Argument-Parsing
- **Jira API**: node-fetch für HTTP-Requests
- **Konfiguration**: YAML-basierte Konfiguration
- **Ausgabe**: Verschiedene Formate (Table, CSV, JSON, Markdown)

### Design-Prinzipien

- **Kompatibilität**: Vollständige jira-cli Kompatibilität
- **Einfachheit**: Intuitive Kommandozeilen-Interface
- **Robustheit**: Umfassende Fehlerbehandlung
- **Performance**: Effiziente API-Nutzung

## 📚 Ressourcen

### Nützliche Links

- [Jira REST API Dokumentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Commander.js Dokumentation](https://github.com/tj/commander.js)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Entwicklungstools

- **Editor**: VS Code mit JavaScript/Node.js Extensions
- **Testing**: Vitest für Unit Tests
- **Linting**: ESLint für Code-Qualität
- **Building**: esbuild für Bundling, pkg für Binaries

## 🆘 Hilfe bekommen

- **GitHub Issues**: Für Bugs und Feature Requests
- **GitHub Discussions**: Für allgemeine Fragen
- **Code Review**: Pull Requests für Feedback

## 📄 Lizenz

Durch Ihre Beiträge stimmen Sie zu, dass Ihre Arbeit unter der MIT-Lizenz lizenziert wird.