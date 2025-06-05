# JIRA Timesheet CLI

Ein Node.js Kommandozeilen-Tool zur Generierung von Stundenzetteln aus Jira-Worklogs über die REST API. Das Tool nutzt die gleiche Konfiguration wie [ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli) für maximale Kompatibilität.

## 🚀 Features

- ✅ **Jira-CLI Kompatibilität** - Nutzt bestehende Konfiguration
- ✅ **Multi-User Support** - Einzelne oder mehrere Benutzer gleichzeitig
- ✅ **Dreifach-Gruppierung** - Benutzer → Tag → Einträge
- ✅ **Integrierte Tagessummen** - Direkt in Tabellen
- ✅ **Flexible Ausgabeformate** - Tabelle, CSV, JSON, Markdown
- ✅ **Hierarchischer CSV-Export** - Excel-ready mit Summen
- ✅ **Sichere Authentifizierung** - API-Token über Environment Variables
- ✅ **Umfangreiche Filter** - Projekt, Benutzer, Zeitraum
- ✅ **Cross-Platform** - Windows, macOS, Linux
- ✅ **Konfigurierbare Pfade** - JIRA_CONFIG_FILE Support
- ✅ **Fehlerbehandlung** - Detaillierte Error-Messages

## 🚀 Installation

### Option 1: Lokale Installation
```bash
# Repository klonen
git clone <repository-url>
cd jira-timesheet-cli

# Dependencies installieren
npm install

# Global verfügbar machen
npm link
```

### Option 2: NPM Package (falls veröffentlicht)
```bash
npm install -g jira-timesheet-cli
```

### Dependencies
Das Tool verwendet folgende Node.js Packages:
- **node-fetch** - HTTP-Requests an Jira REST API
- **commander** - Professionelles CLI Argument-Parsing
- **chalk** - Farbige Terminal-Ausgabe
- **cli-table3** - Formatierte Tabellen-Darstellung
- **js-yaml** - YAML Konfigurationsdateien

## 📋 Voraussetzungen

- **Node.js** >= 18.0.0
- **Bestehende jira-cli Installation** und Konfiguration
- **Jira API Token** für Authentifizierung
- **Jira Cloud oder Server** mit entsprechenden Berechtigungen

## 🎯 Verwendung

### Basis-Kommandos
```bash
# Stundenzettel für Standard-Projekt (aus Config)
jira-timesheet generate
# Oder mit Alias
jira-timesheet gen

# Für spezifisches Projekt
jira-timesheet generate -p TEST

# Mit Zeitraum-Filter
jira-timesheet generate -p TEST -s 2024-12-01 -e 2024-12-31

# Für bestimmten Benutzer
jira-timesheet generate -p TEST -u max.mustermann@firma.com

# Für mehrere Benutzer gleichzeitig
jira-timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com

# Alle Benutzer (Standard-Verhalten)
jira-timesheet generate -p TEST

# Konfiguration anzeigen
jira-timesheet config

# Verbindung testen
jira-timesheet test
```

### Ausgabeformate
```bash
# Standard Tabellen-Ausgabe (gruppiert nach Benutzer und Tag)
jira-timesheet generate -p TEST

# Als CSV exportieren
jira-timesheet generate -p TEST -f csv -o stundenzettel.csv

# Als JSON ausgeben
jira-timesheet generate -p TEST -f json

# Als Markdown exportieren
jira-timesheet generate -p TEST -f markdown -o stundenzettel.md

# CSV direkt in Konsole
jira-timesheet generate -p TEST -f csv

# Markdown direkt in Konsole
jira-timesheet generate -p TEST -f markdown
```

### Konfigurationsdateien
```bash
# Alternative Config-Datei verwenden
jira-timesheet -c /path/to/config.yml generate

# Via Environment Variable
JIRA_CONFIG_FILE=/path/to/config.yml jira-timesheet generate

# Kombiniert (--config hat Vorrang)
JIRA_CONFIG_FILE=/path/to/env-config.yml jira-timesheet -c /path/to/param-config.yml generate
```

## 📖 Kommandozeilen-Optionen

### Globale Optionen
| Option | Kurz | Beschreibung |
|--------|------|--------------|
| `--config <file>` | `-c` | Config-Datei (Standard: ~/.config/.jira/.config.yml) |
| `--help` | `-h` | Hilfe anzeigen |
| `--version` | `-V` | Version anzeigen |

### Hauptkommandos
| Kommando | Alias | Beschreibung |
|----------|-------|--------------|
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

**Standardwerte:**
- **Format:** `table` (gruppierte Tabellen-Ausgabe)
- **Projekt:** Aus jira-cli Konfiguration
- **Benutzer:** Alle Benutzer (wenn kein `--user` Parameter angegeben)
- **Zeitraum:** Alle verfügbaren Worklogs
- **Ausgabedatei:** Nur bei Verwendung der `-o` Option

### Multi-User Funktionalität

Das Tool unterstützt flexible Benutzerfilterung:

**Alle Benutzer (Standard):**
```bash
jira-timesheet generate -p TEST
# Zeigt Worklogs aller Benutzer im Projekt
```

**Einzelner Benutzer (rückwärtskompatibel):**
```bash
jira-timesheet generate -p TEST -u max.mustermann@firma.com
# Zeigt nur Worklogs von Max Mustermann
```

**Mehrere spezifische Benutzer:**
```bash
jira-timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com
# Zeigt Worklogs von Max Mustermann und Anna Schmidt
```

**Vorteile der Multi-User Funktionalität:**
- ✅ **Rückwärtskompatibilität** - Bestehende Skripte funktionieren weiterhin
- ✅ **Flexible Filterung** - Von einem bis zu allen Benutzern
- ✅ **Team-Reports** - Mehrere Teammitglieder in einem Report
- ✅ **Selektive Auswertung** - Nur relevante Benutzer einbeziehen

## 🎯 Jira-CLI Konfigurationskompatibilität

Das Tool nutzt die gleiche Konfiguration wie jira-cli:

### Konfigurationspfad-Priorität
1. `--config/-c` Parameter (höchste Priorität)
2. `JIRA_CONFIG_FILE` Environment Variable
3. Standard: `~/.config/.jira/.config.yml`

### Beispiel jira-cli Konfiguration
```yaml
server: https://your-company.atlassian.net
login: your-email@company.com
project: DEFAULTPROJECT
installation: Cloud
auth_type: basic

ui:
  display: plain

issue:
  types:
    Bug:
      name: Bug
      handle: Bug
    Task:
      name: Task
      handle: Task
```

## 📁 Ausgabeformate

### Gruppierte Tabellen-Ausgabe
```
📊 Stundenzettel (gruppiert nach Benutzer und Tag)

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
Max Mustermann,01.12.2024,TEST-123,"Bug fix","2h 30m",9000,"Fixed it","2024-12-01T09:00:00.000+0000","2024-12-01T09:00:00.000+0000"
"--- Max Mustermann - 01.12.2024 ---",01.12.2024,,"Tagessumme","2h 30m",9000,"1 Einträge",,
"=== Max Mustermann GESAMT ===",,,"Benutzersumme","2h 30m",9000,"1 Einträge",,
```

### Markdown-Ausgabe
```markdown
# Stundenzettel (gruppiert nach Benutzer und Tag)

## 👤 Max Mustermann

### 📅 01.12.2024

| Issue Key | Summary | Time Spent | Comment |
|-----------|---------|------------|----------|
| TEST-123 | Bug fix in authentication module | 2h 30m | Fixed login validation |
| TEST-124 | Code review for PR #456 | 1h | Reviewed security changes |
| **📊 TAGESSUMME** | **2 Einträge** | **3h 30m** | |

**📈 Max Mustermann Gesamt: 3h 30m (2 Einträge)**

---

## 🏆 Gesamtübersicht

**Gesamtzeit aller Benutzer:** 3h 30m (2 Einträge)
**Anzahl Benutzer:** 1
```

**Vorteile der Markdown-Ausgabe:**
- ✅ **GitHub/GitLab Integration** - Direkt in Repository-Dokumentation verwendbar
- ✅ **Wiki-kompatibel** - Für Confluence, Notion, etc.
- ✅ **Lesbare Tabellen** - Strukturierte Darstellung mit Markdown-Syntax
- ✅ **Versionskontrolle** - Änderungen in Git nachverfolgbar
- ✅ **Export-freundlich** - Einfache Konvertierung zu HTML/PDF

## 🔧 Setup und Konfiguration

### 1. Jira-CLI Setup (falls noch nicht vorhanden)
```bash
# jira-cli installieren
npm install -g jira-cli

# Konfiguration erstellen
jira init
```

### 2. API Token konfigurieren
```bash
# API Token als Environment Variable setzen
export JIRA_API_TOKEN="your-api-token-here"

# In Shell-Profil hinzufügen (~/.bashrc, ~/.zshrc)
echo 'export JIRA_API_TOKEN="your-api-token-here"' >> ~/.bashrc
```

**API Token erstellen:** [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

### 3. Konfiguration testen
```bash
jira-timesheet config  # Aktuelle Konfiguration anzeigen
jira-timesheet test    # Verbindung zu Jira testen
```

## 💡 Beispiele

### Basis-Verwendung
```bash
# Standard-Verwendung (alle Benutzer mit Tages-Gruppierung)
jira-timesheet generate -p TEST

# Bestimmter Zeitraum (zeigt schön die Tage-Aufteilung)
jira-timesheet generate -p TEST -s 2024-12-01 -e 2024-12-07

# Ein Benutzer (zeigt trotzdem Tages-Gruppierung)
jira-timesheet generate -p TEST -u max.mustermann@firma.com
```

### Multi-User Beispiele
```bash
# Zwei spezifische Teammitglieder
jira-timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com

# Drei Entwickler für Sprint-Review
jira-timesheet generate -p TEST \
  -u dev1@firma.com \
  -u dev2@firma.com \
  -u dev3@firma.com \
  -s 2024-12-01 -e 2024-12-14

# Team-Lead und Senior-Entwickler für Management-Report
jira-timesheet generate -p TEST \
  -u teamlead@firma.com \
  -u senior.dev@firma.com \
  -f csv -o management_report.csv

# Alle Benutzer vs. spezifische Auswahl vergleichen
jira-timesheet generate -p TEST -f json > all_users.json
jira-timesheet generate -p TEST -u key.person@firma.com -f json > key_person.json
```

### Export-Beispiele
```bash
# CSV mit Tages-Hierarchie
jira-timesheet generate -p TEST -f csv -o stundenzettel.csv

# Markdown für Dokumentation
jira-timesheet generate -p TEST -f markdown -o stundenzettel.md

# Mit Jahr-Zeitraum für Jahresabschluss
jira-timesheet generate -p TEST -s 2024-01-01 -e 2024-12-31

# Explizite Ausgabedatei für verschiedene Formate
jira-timesheet generate -p TEST -f csv -o team_report_dezember.csv
jira-timesheet generate -p TEST -f markdown -o team_report_dezember.md

# JSON für weitere Verarbeitung
jira-timesheet generate -p TEST -f json > data.json

# Markdown für README oder Wiki
jira-timesheet generate -p TEST -f markdown > project_timesheet.md

# Kurze Optionen verwenden
jira-timesheet generate -p TEST -f csv -o report.csv -s 2024-12-01

# Mit alternativer Config
jira-timesheet -c ./project-config.yml generate -p SPECIAL
```

## 🐛 Troubleshooting

### Häufige Probleme

**"Configuration file not found"**
```bash
# Prüfen Sie die jira-cli Installation
jira --version
jira init

# Config-Pfad überprüfen
jira-timesheet config
```

**"JIRA_API_TOKEN environment variable not set"**
```bash
# API Token setzen
export JIRA_API_TOKEN="your-token"

# Token testen
jira-timesheet test
```

**"No issues found matching criteria"**
- Prüfen Sie den Projekt-Schlüssel: `jira project list`
- Überprüfen Sie Datumsfilter und Benutzer-Email
- Testen Sie mit: `jira issue list -p YOURPROJECT`

**"HTTP 401: Unauthorized"**
- API Token überprüfen und neu erstellen
- Login-Email in Config überprüfen
- Jira-Berechtigungen prüfen

**"HTTP 403: Forbidden"**
- "Browse Projects" Berechtigung erforderlich
- "Work on Issues" Berechtigung für Worklog-Zugriff
- Mit Jira-Administrator kontaktieren

### Debug-Modus
```bash
# Konfiguration überprüfen
jira-timesheet config

# Verbindung testen
jira-timesheet test
```

## 🤝 Entwicklung

```bash
# Repository klonen
git clone <repository-url>
cd jira-timesheet-cli

# Dependencies installieren
npm install

# Lokal testen
node jira_timesheet_cli.js generate -p TEST

# Global installieren (für Entwicklung)
npm link
```

## 📝 Lizenz

MIT License