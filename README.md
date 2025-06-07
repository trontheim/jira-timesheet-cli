# JIRA Timesheet CLI

[![build](https://img.shields.io/github/actions/workflow/status/trontheim/jira-timesheet-cli-brightgreen.svg)](https://github.com/trontheim/jira-timesheet-cli/actions?query=workflow%3Abuild+branch%3Amain)[![npm Version](https://img.shields.io/npm/trontheim/jira-timesheet-cli.svg)](https://www.npmjs.com/package/jira-timesheet-cli)[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.19.0-brightgreen.svg)](https://nodejs.org/)[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)[![App Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftrontheim%2Fjira-timesheet-cli%2Frefs%2Fheads%2Fmain%2Fpackage.json&query=version&label=Version)](https://nodejs.org/)![Downloads](https://img.shields.io/github/downloads/trontheim/jira-timesheet-cli/latest/total.svg?label=Downloads)

Ein Node.js Kommandozeilen-Tool zur Generierung von Stundenzetteln aus Jira-Worklogs über die REST API. Das Tool nutzt die gleiche Konfiguration wie [ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli) für maximale Kompatibilität.

## 📋 Inhaltsverzeichnis

- [Features](#-features)
- [Installation](#-installation)
- [Voraussetzungen](#-voraussetzungen)
- [Erste Schritte](#-erste-schritte)
- [Verwendung](#-verwendung)
- [Kommandozeilen-Optionen](#-kommandozeilen-optionen)
- [Ausgabeformate](#-ausgabeformate)
- [Konfiguration](#-konfiguration)
- [Beispiele](#-beispiele)
- [Troubleshooting](#-troubleshooting)
- [Lizenz](#-lizenz)
- [Contributing](#-contributing)

## 🚀 Features

- ✅ **Interaktive & Nicht-interaktive Konfiguration** - Vollständiges Setup mit `init`-Kommando
- ✅ **Frühe Credential-Validierung** - Sofortiger Abbruch bei API-Fehlern wie im Original jira-cli
- ✅ **Automatische Metadaten-Sammlung** - Timezone, Issue Types, Custom Fields, Epic Fields
- ✅ **Jira-CLI Kompatibilität** - Nutzt und erweitert bestehende Konfiguration
- ✅ **Multi-User Support** - Einzelne oder mehrere Benutzer gleichzeitig
- ✅ **Dreifach-Gruppierung** - Benutzer → Tag → Einträge
- ✅ **Integrierte Tagessummen** - Direkt in Tabellen
- ✅ **Flexible Ausgabeformate** - Tabelle, CSV, JSON, Markdown
- ✅ **Hierarchischer CSV-Export** - Excel-ready mit Summen
- ✅ **Sichere Authentifizierung** - API-Token über Environment Variables
- ✅ **Umfangreiche Filter** - Projekt, Benutzer, Zeitraum
- ✅ **Cross-Platform** - Windows, macOS, Linux (x64 und ARM64)
- ✅ **Konfigurierbare Pfade** - JIRA_CONFIG_FILE Support
- ✅ **Insecure Flag Support** - TLS-Zertifikatsprüfung überspringen
- ✅ **Robuste Fehlerbehandlung** - Spezifische Fehlermeldungen und sofortiger Abbruch

## 🚀 Installation

### Option 1: Homebrew (macOS - Empfohlen)
```bash
# Tap hinzufügen (ersetze trontheim mit dem GitHub Username)
brew tap trontheim/jira-timesheet-cli

# Tool installieren
brew install jira-timesheet-cli

# Erste Konfiguration
timesheet init
```

### Option 2: NPM Package (falls veröffentlicht)
```bash
npm install -g jira-timesheet-cli
```

### Option 3: Vorkompilierte Binaries
```bash
# Repository klonen
git clone <repository-url>
cd jira-timesheet-cli

# Dependencies installieren und Build erstellen
npm install
npm run build

# Binary verwenden (Beispiel für Linux x64)
./binaries/timesheet-linux-x64 init
```

**💡 Plattform-Auswahl:**
- **Linux x64/ARM64**: Für Standard-Linux-Server und ARM-basierte Server
- **macOS x64/ARM64**: Für Intel-basierte und Apple Silicon Macs
- **Windows x64/ARM64**: Für Standard-Windows-PCs und ARM-Geräte

Weitere Details zum Build-Prozess finden Sie in der [Build-Dokumentation](docs/BUILD.md).

## 📋 Voraussetzungen

- **Node.js** >= 18.19.0
- **Jira API Token** für Authentifizierung (siehe [API Token erstellen](docs/API_TOKEN.md))
- **Jira Cloud oder Server** mit entsprechenden Berechtigungen

**Hinweis:** Eine bestehende jira-cli Installation ist **optional**. Das Tool kann eigenständig konfiguriert werden oder eine bestehende jira-cli Konfiguration nutzen.

## 🚀 Erste Schritte

### 1. API Token erstellen
Bevor Sie das Tool verwenden können, benötigen Sie ein API Token:

📖 **Detaillierte Anleitung:** [API Token erstellen](docs/API_TOKEN.md)

```bash
# API Token als Umgebungsvariable setzen
export JIRA_API_TOKEN="your-api-token"
```

### 2. Konfiguration erstellen
```bash
# Interaktive Konfiguration (empfohlen)
timesheet init

# Konfiguration anzeigen
timesheet config

# Verbindung testen
timesheet test
```

### 3. Ersten Stundenzettel generieren
```bash
# Stundenzettel für Standard-Projekt
timesheet generate

# Für spezifisches Projekt
timesheet generate -p TEST
```

## 🎯 Verwendung

### Basis-Kommandos
```bash
# Stundenzettel für Standard-Projekt (aus Config)
timesheet generate

# Für spezifisches Projekt
timesheet generate -p TEST

# Mit Zeitraum-Filter
timesheet generate -p TEST -s 2024-12-01 -e 2024-12-31

# Für bestimmten Benutzer
timesheet generate -p TEST -u max.mustermann@firma.com

# Für mehrere Benutzer gleichzeitig
timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com
```

### Ausgabeformate
```bash
# Standard Tabellen-Ausgabe
timesheet generate -p TEST

# Als CSV exportieren
timesheet generate -p TEST -f csv -o stundenzettel.csv

# Als JSON ausgeben
timesheet generate -p TEST -f json

# Als Markdown exportieren
timesheet generate -p TEST -f markdown -o stundenzettel.md
```

## 📖 Kommandozeilen-Optionen

### Hauptkommandos
| Kommando | Alias | Beschreibung |
|----------|-------|--------------|
| `init` | - | Interaktive oder nicht-interaktive Konfiguration erstellen |
| `generate` | `gen` | Stundenzettel für ein Projekt generieren |
| `config` | - | Aktuelle jira-cli Konfiguration anzeigen |
| `test` | - | Verbindung zu Jira testen |

### Generate Command Optionen
| Option | Kurz | Beschreibung |
|--------|------|--------------|
| `--project <key>` | `-p` | Projekt-Schlüssel (überschreibt Config-Standard) |
| `--user <email>` | `-u` | Filter nach Benutzer-Email (mehrfach verwendbar) |
| `--start <date>` | `-s` | Startdatum (YYYY-MM-DD) |
| `--end <date>` | `-e` | Enddatum (YYYY-MM-DD) |
| `--output <file>` | `-o` | Ausgabedatei (für alle Formate verfügbar) |
| `--format <format>` | `-f` | Ausgabeformat: `table`, `csv`, `json`, `markdown` |

### Multi-User Funktionalität

Das Tool unterstützt flexible Benutzerfilterung:

```bash
# Alle Benutzer (Standard)
timesheet generate -p TEST

# Einzelner Benutzer
timesheet generate -p TEST -u max.mustermann@firma.com

# Mehrere spezifische Benutzer
timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com
```

## 📁 Ausgabeformate

### Gruppierte Tabellen-Ausgabe
```
📊 Stundenzettel

👤 Max Mustermann
────────────────────────────────────────────────────────────────────────────────

  📅 01.12.2024
┌───────────────┬─────────────────────────────────────────────────┬──────────┬──────────────────────────────────┐
│ Issue         │ Summary                                         │ Time     │ Comment                          │
├───────────────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
│ TEST-123      │ Bug fix in authentication module                │ 2h 30m   │ Fixed login validation           │
│ TEST-124      │ Code review for PR #456                         │ 1h       │ Reviewed security changes        │
├───────────────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
│ 📊 TAGESSUMME │ 2 Einträge                                      │ 3h 30m   │                                  │
└───────────────┴─────────────────────────────────────────────────┴──────────┴──────────────────────────────────┘

📈 Max Mustermann Gesamt: 3h 30m (2 Einträge)

================================================================================
🏆 Gesamtzeit aller Benutzer: 3h 30m (2 Einträge)
📊 Anzahl Benutzer: 1
```

### CSV-Ausgabe (Hierarchisch)
```csv
User,Date,Issue Key,Issue Summary,Time Spent,Time (Seconds),Comment,Started,Created
Max Mustermann,01.12.2024,TEST-123,"Bug fix in authentication module","2h 30m",9000,"Fixed login validation","2024-12-01T09:00:00.000+0000","2024-12-01T09:00:00.000+0000"
Max Mustermann,01.12.2024,TEST-124,"Code review for PR #456","1h",3600,"Reviewed security changes","2024-12-01T11:00:00.000+0000","2024-12-01T11:00:00.000+0000"
"--- Max Mustermann - 01.12.2024 ---",01.12.2024,,"Tagessumme","3h 30m",12600,"2 Einträge",,
```

### Markdown-Ausgabe
Ideal für GitHub/GitLab Integration, Wiki-Systeme und Versionskontrolle.

## 🎯 Konfiguration

### Jira-CLI Kompatibilität

Das Tool nutzt die gleiche Konfiguration wie jira-cli:

**Konfigurationspfad-Priorität:**
1. `--config/-c` Parameter (höchste Priorität)
2. `JIRA_CONFIG_FILE` Environment Variable
3. Standard: `~/.config/.jira/.config.yml`

### Setup-Methoden

**Methode 1: Interaktive Konfiguration (Empfohlen)**
```bash
# API Token erstellen und setzen (siehe docs/API_TOKEN.md)
export JIRA_API_TOKEN="your-api-token"

# Interaktive Konfiguration
timesheet init
```

**Methode 2: Bestehende jira-cli Konfiguration**
```bash
# Bestehende Konfiguration verwenden
timesheet config  # Konfiguration prüfen
timesheet test    # Verbindung testen
```

Das Tool sammelt automatisch Metadaten wie Timezone, Issue Types, Custom Fields und Epic Fields.

## 💡 Beispiele

### Basis-Verwendung
```bash
# Standard-Verwendung (alle Benutzer mit Tages-Gruppierung)
timesheet generate -p TEST

# Bestimmter Zeitraum
timesheet generate -p TEST -s 2024-12-01 -e 2024-12-07

# Ein Benutzer
timesheet generate -p TEST -u max.mustermann@firma.com
```

### Multi-User Beispiele
```bash
# Zwei spezifische Teammitglieder
timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com

# Team für Sprint-Review
timesheet generate -p TEST \
  -u dev1@firma.com \
  -u dev2@firma.com \
  -u dev3@firma.com \
  -s 2024-12-01 -e 2024-12-14
```

### Export-Beispiele
```bash
# CSV mit Tages-Hierarchie
timesheet generate -p TEST -f csv -o stundenzettel.csv

# Markdown für Dokumentation
timesheet generate -p TEST -f markdown -o stundenzettel.md

# JSON für weitere Verarbeitung
timesheet generate -p TEST -f json > data.json
```

## 🐛 Troubleshooting

### Häufige Probleme

**"Configuration file not found"**
```bash
# Neue Konfiguration erstellen
timesheet init

# Config-Pfad überprüfen
timesheet config
```

**"JIRA_API_TOKEN environment variable not set"**
```bash
# API Token setzen (siehe docs/API_TOKEN.md für Details)
export JIRA_API_TOKEN="your-token"

# Token testen
timesheet test
```

**"Received unexpected response '401 Unauthorized' from jira."**
- API Token ist ungültig oder abgelaufen
- Überprüfen Sie Ihre Anmeldedaten
- Erstellen Sie ein neues API Token (siehe [docs/API_TOKEN.md](docs/API_TOKEN.md))

**"Received unexpected response '403 Forbidden' from jira."**
- Keine Berechtigung für das angegebene Projekt
- Überprüfen Sie Projekt-Schlüssel und Berechtigungen

### Debug-Modus
```bash
# Konfiguration überprüfen
timesheet config

# Verbindung testen
timesheet test
```

Weitere Troubleshooting-Informationen finden Sie in der [API Token Dokumentation](docs/API_TOKEN.md).

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🤝 Contributing

Wir freuen uns über Beiträge! Bitte lesen Sie unsere [Contributing Guidelines](CONTRIBUTING.md) für Details zum Entwicklungsprozess, Code-Stil und wie Sie Pull Requests einreichen können.

### Schnellstart für Entwickler

```bash
# Repository forken und klonen
git clone https://github.com/trontheim/jira-timesheet-cli.git
cd jira-timesheet-cli

# Dependencies installieren
npm install

# Tests ausführen
npm test

# Build erstellen
npm run build
```

Weitere Informationen finden Sie in der [Build-Dokumentation](docs/BUILD.md) und den [Contributing Guidelines](CONTRIBUTING.md).

---

**📖 Weitere Dokumentation:**
- [API Token erstellen](docs/API_TOKEN.md) - Detaillierte Anleitung zur Token-Erstellung
- [Build-Prozess](docs/BUILD.md) - Informationen zum Build-System und Binaries
- [Contributing](CONTRIBUTING.md) - Richtlinien für Entwickler und Beiträge