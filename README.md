# JIRA Timesheet CLI

Ein Node.js Kommandozeilen-Tool zur Generierung von Stundenzetteln aus Jira-Worklogs über die REST API. Das Tool nutzt die gleiche Konfiguration wie [ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli) für maximale Kompatibilität.

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
- ✅ **Cross-Platform** - Windows, macOS, Linux
- ✅ **Konfigurierbare Pfade** - JIRA_CONFIG_FILE Support
- ✅ **Insecure Flag Support** - TLS-Zertifikatsprüfung überspringen
- ✅ **Robuste Fehlerbehandlung** - Spezifische Fehlermeldungen und sofortiger Abbruch

## 🚀 Installation

### Option 1: Vorkompilierte Binaries (Empfohlen)
```bash
# Repository klonen
git clone <repository-url>
cd jira-timesheet-cli

# Dependencies installieren
npm install

# Cross-Platform Binaries erstellen
npm run build:all

# Binary verwenden (Linux/macOS)
./binaries/timesheet-linux-x64
./binaries/timesheet-darwin-x64
./binaries/timesheet-darwin-arm64

# Binary verwenden (Windows)
./binaries/timesheet-win-x64.exe

# Erste Konfiguration (empfohlen)
./binaries/timesheet-linux-x64 init
```

### Option 2: Lokale Installation
```bash
# Repository klonen
git clone <repository-url>
cd jira-timesheet-cli

# Dependencies installieren
npm install

# Global verfügbar machen
npm link
```

### Option 3: NPM Package (falls veröffentlicht)
```bash
npm install -g timesheet-cli
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
- **Jira API Token** für Authentifizierung (siehe [API Token erstellen](#-api-token-erstellen))
- **Jira Cloud oder Server** mit entsprechenden Berechtigungen

## 🔑 API Token erstellen

Ein API Token ist erforderlich für die sichere Authentifizierung mit Jira. Es ersetzt Ihr Passwort und bietet bessere Sicherheit und Kontrolle über den Zugriff.

### Für Atlassian Cloud (Empfohlen)

#### Was ist ein API Token?
- **Sicherheitstoken** anstelle Ihres Passworts
- **Spezifische Berechtigung** nur für API-Zugriffe
- **Widerrufbar** ohne Passwort-Änderung
- **Audit-fähig** - alle API-Zugriffe werden protokolliert

#### Schritt-für-Schritt Anleitung:

**1. Atlassian Account öffnen:**
- Gehen Sie zu https://id.atlassian.com/manage-profile/security/api-tokens
- Melden Sie sich mit Ihrem Atlassian Account an
- Sie sehen eine Übersicht Ihrer bestehenden API Tokens

**2. API Token erstellen:**
- Klicken Sie auf den blauen Button **"Create API token"**
- Geben Sie einen **beschreibenden Namen** ein (z.B. "Timesheet CLI", "Stundenzettel Tool")
- Der Name hilft Ihnen später, den Token zu identifizieren
- Klicken Sie auf **"Create"**

**3. Token kopieren:**
- ⚠️ **WICHTIG:** Das Token wird nur **einmal** angezeigt
- Kopieren Sie das Token **sofort** in die Zwischenablage
- Speichern Sie es **sicher** (z.B. in einem Passwort-Manager)
- Nach dem Schließen des Dialogs ist das Token nicht mehr einsehbar

**4. Token als Umgebungsvariable setzen:**

**Temporär (nur für aktuelle Terminal-Session):**
```bash
export JIRA_API_TOKEN="your-api-token-here"
```

**Permanent (empfohlen):**
```bash
# Für Bash (~/.bashrc)
echo 'export JIRA_API_TOKEN="your-api-token-here"' >> ~/.bashrc
source ~/.bashrc

# Für Zsh (~/.zshrc)
echo 'export JIRA_API_TOKEN="your-api-token-here"' >> ~/.zshrc
source ~/.zshrc

# Für Fish (~/.config/fish/config.fish)
echo 'set -gx JIRA_API_TOKEN "your-api-token-here"' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
```

**5. Token testen:**
```bash
# Prüfen ob Token gesetzt ist
echo $JIRA_API_TOKEN

# Mit timesheet-cli testen
timesheet test
```

#### Sicherheitshinweise:
- ✅ **Niemals in Code oder Repositories speichern**
- ✅ **Nicht in Slack, E-Mails oder Chat-Nachrichten teilen**
- ✅ **Regelmäßig erneuern** (alle 6-12 Monate)
- ✅ **Bei Verdacht auf Kompromittierung sofort löschen**
- ✅ **Nur für notwendige Anwendungen verwenden**
- ✅ **Beschreibende Namen für bessere Übersicht verwenden**

#### Token-Verwaltung:
- **Anzeigen:** Gehen Sie zu den API Token Settings, um alle Ihre Tokens zu sehen
- **Löschen:** Klicken Sie auf "Delete" neben einem Token, um es zu widerrufen
- **Erneuern:** Löschen Sie das alte Token und erstellen Sie ein neues

### Für Jira Server/Data Center

Für lokale Jira-Installationen haben Sie mehrere Authentifizierungsoptionen:

#### Option 1: Personal Access Tokens (PATs) - Empfohlen für Jira Server 8.14+

**Vorteile:**
- Ähnlich wie Cloud API Tokens
- Bessere Sicherheit als Passwörter
- Granulare Berechtigungen möglich

**Anleitung:**
1. Gehen Sie zu Ihrem Jira Server: `https://your-jira-server.com`
2. Klicken Sie auf Ihr **Profilbild** → **"Personal Access Tokens"**
3. Klicken Sie auf **"Create token"**
4. Geben Sie einen **Namen** und **Ablaufzeit** ein
5. Wählen Sie die benötigten **Berechtigungen** aus
6. Kopieren Sie das Token und setzen Sie es als `JIRA_API_TOKEN`

#### Option 2: Basic Authentication - Für ältere Jira Versionen

**Hinweis:** Weniger sicher, aber manchmal notwendig für ältere Installationen.

```bash
# Ihr normales Jira-Passwort verwenden
export JIRA_API_TOKEN="your-jira-password"
```

**Konfiguration für Server/Data Center:**
```bash
# Init mit Server-Installation
timesheet init --installation local --server https://your-jira-server.com --auth-type basic
```

### Troubleshooting

#### Häufige Probleme:

**1. "Authentication failed" Fehler:**
```bash
# Token prüfen
echo $JIRA_API_TOKEN

# Neu setzen falls leer
export JIRA_API_TOKEN="your-token"

# Verbindung testen
timesheet test
```

**2. Token funktioniert nicht:**
- Prüfen Sie, ob das Token korrekt kopiert wurde (keine Leerzeichen)
- Stellen Sie sicher, dass Sie das richtige Atlassian-Konto verwenden
- Versuchen Sie, ein neues Token zu erstellen

**3. "Unauthorized" bei Server-Installation:**
- Prüfen Sie die Server-URL (http vs. https)
- Verwenden Sie `--insecure` Flag bei selbst-signierten Zertifikaten
- Kontaktieren Sie Ihren Jira-Administrator für Berechtigungen

**4. Token versehentlich geteilt:**
- Gehen Sie **sofort** zu den API Token Settings
- **Löschen** Sie das kompromittierte Token
- Erstellen Sie ein **neues Token**
- Aktualisieren Sie Ihre Umgebungsvariable

#### Erweiterte Konfiguration:

**Mehrere Jira-Instanzen:**
```bash
# Verschiedene Tokens für verschiedene Projekte
export JIRA_API_TOKEN_PROD="token-for-production"
export JIRA_API_TOKEN_DEV="token-for-development"

# Verwendung mit verschiedenen Config-Dateien
timesheet -c ~/.config/.jira/.config-prod.yml generate
timesheet -c ~/.config/.jira/.config-dev.yml generate
```

**CI/CD Integration:**
```bash
# In GitHub Actions, GitLab CI, etc.
# Token als Secret speichern, nicht als Environment Variable im Code
```

## 🎯 Verwendung

### Erste Schritte
```bash
# 1. API Token erstellen und setzen (WICHTIG: Vor init!)
# Siehe detaillierte Anleitung: https://github.com/your-repo#-api-token-erstellen
export JIRA_API_TOKEN="your-api-token"

# 2. Interaktive Konfiguration (empfohlen für neue Benutzer)
timesheet init

# 3. Konfiguration anzeigen
timesheet config

# 4. Verbindung testen (optional, da bereits während init validiert)
timesheet test
```

**📖 Wichtiger Hinweis:** Bevor Sie `timesheet init` ausführen, müssen Sie ein API Token erstellen und als Umgebungsvariable setzen. Eine detaillierte Schritt-für-Schritt Anleitung finden Sie im Abschnitt [🔑 API Token erstellen](#-api-token-erstellen).

### Basis-Kommandos
```bash
# Stundenzettel für Standard-Projekt (aus Config)
timesheet generate
# Oder mit Alias
timesheet gen

# Für spezifisches Projekt
timesheet generate -p TEST

# Mit Zeitraum-Filter
timesheet generate -p TEST -s 2024-12-01 -e 2024-12-31

# Für bestimmten Benutzer
timesheet generate -p TEST -u max.mustermann@firma.com

# Für mehrere Benutzer gleichzeitig
timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com

# Alle Benutzer (Standard-Verhalten)
timesheet generate -p TEST
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

# CSV direkt in Konsole
timesheet generate -p TEST -f csv

# Markdown direkt in Konsole
timesheet generate -p TEST -f markdown
```

### Konfigurationsdateien
```bash
# Alternative Config-Datei verwenden
timesheet -c /path/to/config.yml generate

# Via Environment Variable
JIRA_CONFIG_FILE=/path/to/config.yml timesheet generate

# Kombiniert (--config hat Vorrang)
JIRA_CONFIG_FILE=/path/to/env-config.yml timesheet -c /path/to/param-config.yml generate
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
| `init` | - | Interaktive oder nicht-interaktive Konfiguration erstellen |
| `generate` | `gen` | Stundenzettel für ein Projekt generieren |
| `config` | - | Aktuelle jira-cli Konfiguration anzeigen |
| `test` | - | Verbindung zu Jira testen |

### Init Command Optionen
| Option | Beschreibung |
|--------|--------------|
| `-c, --config <file>` | Pfad zur Konfigurationsdatei (Standard: ~/.config/.jira/.config.yml) |
| `--installation <type>` | Installation type: `cloud`, `local` |
| `--server <url>` | Jira server URL (z.B. https://company.atlassian.net) |
| `--login <username>` | Login username oder email |
| `--auth-type <type>` | Authentication type: `basic`, `bearer`, `mtls`, `api_token` |
| `--project <key>` | Default project key (z.B. MYPROJ) |
| `--board <name>` | Default board name |
| `--force` | Bestehende Konfiguration ohne Bestätigung überschreiben |
| `--insecure` | TLS-Zertifikatsprüfung überspringen |

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
timesheet generate -p TEST
# Zeigt Worklogs aller Benutzer im Projekt
```

**Einzelner Benutzer (rückwärtskompatibel):**
```bash
timesheet generate -p TEST -u max.mustermann@firma.com
# Zeigt nur Worklogs von Max Mustermann
```

**Mehrere spezifische Benutzer:**
```bash
timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com
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

### Vollständige Konfigurationsstruktur
Das Tool erstellt eine vollständige Konfiguration mit automatischer Metadaten-Sammlung:

```yaml
auth_type: api_token
installation: cloud
server: https://company.atlassian.net
login: user@company.com
timezone: Europe/Berlin
project:
  key: SB
  type: classic
board:
  id: 178
  name: "Board Name"
  type: scrum
epic:
  name: customfield_10011
  link: customfield_10014
issue:
  types:
    - id: "10001"
      name: "Bug"
      handle: "Bug"
      subtask: false
    - id: "10002"
      name: "Task"
      handle: "Task"
      subtask: false
  fields:
    custom:
      - name: "Epic Name"
        key: "customfield_10011"
        schema:
          datatype: "string"
      - name: "Epic Link"
        key: "customfield_10014"
        schema:
          datatype: "string"
timesheet:
  default_format: table
  group_by_user: true
```

#### Automatische Metadaten-Sammlung
Das init-Kommando sammelt automatisch:
- **Timezone**: Benutzer-Zeitzone aus Jira-Profil
- **Issue Types**: Alle verfügbaren Issue-Typen für das Projekt
- **Custom Fields**: Alle benutzerdefinierten Felder
- **Epic Fields**: Automatische Erkennung von Epic Name und Link Feldern
- **Board Information**: Board-ID, Name und Typ (Scrum/Kanban)

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
Max Mustermann,01.12.2024,TEST-123,"Bug fix","2h 30m",9000,"Fixed it","2024-12-01T09:00:00.000+0000","2024-12-01T09:00:00.000+0000"
"--- Max Mustermann - 01.12.2024 ---",01.12.2024,,"Tagessumme","2h 30m",9000,"1 Einträge",,
"=== Max Mustermann GESAMT ===",,,"Benutzersumme","2h 30m",9000,"1 Einträge",,
```

### Markdown-Ausgabe
```markdown
# Stundenzettel

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

### Methode 1: Interaktive Konfiguration (Empfohlen)

**⚠️ Wichtig:** Bevor Sie `timesheet init` ausführen, müssen Sie ein API Token erstellen und setzen. Siehe [🔑 API Token erstellen](#-api-token-erstellen) für eine detaillierte Anleitung.

```bash
# 1. API Token erstellen und setzen (siehe detaillierte Anleitung oben)
export JIRA_API_TOKEN="your-api-token"

# 2. Einfache interaktive Konfiguration
timesheet init

# 3. Konfiguration testen
timesheet test
```

Das `init`-Kommando führt Sie durch die komplette interaktive Konfiguration mit früher Credential-Validierung:

#### Interaktiver Setup-Prozess
1. **Installationstyp**: Cloud (Atlassian Cloud) oder Local (Jira Server/Data Center)
2. **Authentifizierungstyp**:
   - Cloud: API Token (Standard)
   - Local: Basic, Bearer, MTLS
3. **Jira Server URL**: z.B. https://your-domain.atlassian.net
4. **Login**: Email für Cloud, Username für Local
5. **Frühe Credential-Validierung**: Sofortiger Abbruch bei API-Fehlern
6. **Automatische Metadaten-Sammlung**: Timezone, Issue Types, Custom Fields
7. **Projekt-Auswahl**: Dynamisch geladene Liste verfügbarer Projekte
8. **Board-Auswahl**: Optionale Board-Auswahl für das gewählte Projekt
9. **Epic Field Detection**: Automatische Erkennung von Epic Name/Link Feldern
10. **Timesheet-Optionen**: Konfiguration spezifischer Einstellungen

#### Erweiterte Features
- ✅ **Frühe Credential-Validierung** - Sofortiger Abbruch bei API-Fehlern wie im Original jira-cli
- ✅ **Automatische Metadaten-Sammlung** - Timezone, Issue Types, Custom Fields, Epic Fields
- ✅ **Vollständige Konfigurationsstruktur** - Kompatibel mit jira-cli und erweitert
- ✅ **Automatische Validierung** - Server URL, E-Mail-Format, Projekt-Keys
- ✅ **Backup-Mechanismus** - Automatisches Backup bestehender Konfigurationen
- ✅ **Nicht-interaktive Unterstützung** - Alle Parameter über Kommandozeile konfigurierbar
- ✅ **Insecure Flag Support** - TLS-Zertifikatsprüfung überspringen für interne Server

#### Init-Kommando Optionen
```bash
timesheet init [options]

Optionen:
  -c, --config <file>         Pfad zur Konfigurationsdatei (Standard: ~/.config/.jira/.config.yml)
  --installation <type>       Installation type (cloud, local)
  --server <url>              Jira server URL
  --login <username>          Login username or email
  --auth-type <type>          Authentication type (basic, bearer, mtls, api_token)
  --project <key>             Default project key
  --board <name>              Default board name
  --force                     Overwrite existing configuration without confirmation
  --insecure                  Skip TLS certificate verification
  -h, --help                  Hilfe anzeigen
```

#### Nicht-interaktive Nutzung
Das init-Kommando unterstützt vollständig nicht-interaktive Konfiguration:

```bash
# Vollständig nicht-interaktiv für Cloud-Installation
timesheet init --installation cloud --server https://company.atlassian.net --login user@company.com --auth-type api_token --project MYPROJ --force

# Für lokale Jira-Installation mit Basic Auth
timesheet init --installation local --server https://internal-jira.company.com --login username --auth-type basic --project TEST --insecure

# Mit Board-Auswahl
timesheet init --installation cloud --server https://company.atlassian.net --login user@company.com --auth-type api_token --project MYPROJ --board "Sprint Board" --force
```

#### Nach der Konfiguration
```bash
# 1. API Token als Umgebungsvariable setzen (WICHTIG: Muss vor init gesetzt werden!)
# Siehe detaillierte Anleitung: https://github.com/your-repo#-api-token-erstellen
export JIRA_API_TOKEN="your-token-or-password"

# 2. Konfiguration erstellen (Credentials werden während init validiert)
timesheet init

# 3. Verbindung testen (optional, da bereits während init validiert)
timesheet test

# 4. Ersten Stundenzettel generieren
timesheet generate -p YOUR_PROJECT_KEY
```

**Wichtiger Hinweis zur Credential-Validierung:**
Das init-Kommando führt eine frühe Credential-Validierung durch. Das bedeutet:
- ✅ **JIRA_API_TOKEN muss VOR dem init-Kommando gesetzt werden** (siehe [🔑 API Token erstellen](#-api-token-erstellen))
- ✅ **Sofortiger Abbruch bei ungültigen Credentials**
- ✅ **Keine Konfiguration wird bei API-Fehlern gespeichert**
- ✅ **Automatische Metadaten-Sammlung nur bei erfolgreicher Authentifizierung**

**📖 API Token erstellen:**
Für eine detaillierte Schritt-für-Schritt Anleitung zur API-Token-Erstellung siehe [🔑 API Token erstellen](#-api-token-erstellen). Dort finden Sie Anleitungen für sowohl Atlassian Cloud als auch Jira Server/Data Center.

### Methode 2: Manuelle Konfiguration

#### 1. Jira-CLI Setup (falls noch nicht vorhanden)
```bash
# jira-cli installieren
npm install -g jira-cli

# Konfiguration erstellen
jira init
```

#### 2. API Token konfigurieren

**📖 Detaillierte Anleitung:** Siehe [🔑 API Token erstellen](#-api-token-erstellen) für eine vollständige Schritt-für-Schritt Anleitung zur Token-Erstellung und -Konfiguration.

```bash
# API Token als Environment Variable setzen
export JIRA_API_TOKEN="your-api-token-here"

# In Shell-Profil hinzufügen (~/.bashrc, ~/.zshrc)
echo 'export JIRA_API_TOKEN="your-api-token-here"' >> ~/.bashrc
```

#### 3. Konfiguration testen
```bash
timesheet config  # Aktuelle Konfiguration anzeigen
timesheet test    # Verbindung zu Jira testen
```

### Kompatibilität mit jira-cli

Das Tool ist vollständig kompatibel mit [ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli):
- ✅ **Bestehende Konfigurationen** - Funktionieren ohne Änderungen
- ✅ **Gleiche Konfigurationsdateien** - `~/.config/.jira/.config.yml`
- ✅ **Identische Authentifizierung** - API Token über Environment Variables
- ✅ **Nahtlose Integration** - Beide Tools parallel verwendbar

## 💡 Beispiele

### Erste Schritte
```bash
# Neue Installation - API Token erstellen und setzen (siehe detaillierte Anleitung)
# 📖 Vollständige Anleitung: https://github.com/your-repo#-api-token-erstellen
export JIRA_API_TOKEN="your-api-token"
timesheet init

# Bestehende jira-cli Konfiguration verwenden
timesheet config  # Konfiguration prüfen
timesheet test    # Verbindung testen
```

**💡 Tipp:** Für eine detaillierte Schritt-für-Schritt Anleitung zur API-Token-Erstellung siehe [🔑 API Token erstellen](#-api-token-erstellen).

### Basis-Verwendung
```bash
# Standard-Verwendung (alle Benutzer mit Tages-Gruppierung)
timesheet generate -p TEST

# Bestimmter Zeitraum (zeigt schön die Tage-Aufteilung)
timesheet generate -p TEST -s 2024-12-01 -e 2024-12-07

# Ein Benutzer (zeigt trotzdem Tages-Gruppierung)
timesheet generate -p TEST -u max.mustermann@firma.com
```

### Multi-User Beispiele
```bash
# Zwei spezifische Teammitglieder
timesheet generate -p TEST -u max.mustermann@firma.com -u anna.schmidt@firma.com

# Drei Entwickler für Sprint-Review
timesheet generate -p TEST \
  -u dev1@firma.com \
  -u dev2@firma.com \
  -u dev3@firma.com \
  -s 2024-12-01 -e 2024-12-14

# Team-Lead und Senior-Entwickler für Management-Report
timesheet generate -p TEST \
  -u teamlead@firma.com \
  -u senior.dev@firma.com \
  -f csv -o management_report.csv

# Alle Benutzer vs. spezifische Auswahl vergleichen
timesheet generate -p TEST -f json > all_users.json
timesheet generate -p TEST -u key.person@firma.com -f json > key_person.json
```

### Export-Beispiele
```bash
# CSV mit Tages-Hierarchie
timesheet generate -p TEST -f csv -o stundenzettel.csv

# Markdown für Dokumentation
timesheet generate -p TEST -f markdown -o stundenzettel.md

# Mit Jahr-Zeitraum für Jahresabschluss
timesheet generate -p TEST -s 2024-01-01 -e 2024-12-31

# Explizite Ausgabedatei für verschiedene Formate
timesheet generate -p TEST -f csv -o team_report_dezember.csv
timesheet generate -p TEST -f markdown -o team_report_dezember.md

# JSON für weitere Verarbeitung
timesheet generate -p TEST -f json > data.json

# Markdown für README oder Wiki
timesheet generate -p TEST -f markdown > project_timesheet.md

# Kurze Optionen verwenden
timesheet generate -p TEST -f csv -o report.csv -s 2024-12-01

# Mit alternativer Config
timesheet -c ./project-config.yml generate -p SPECIAL
```

## 🐛 Troubleshooting

### Häufige Probleme

**"Configuration file not found"**
```bash
# Neue Konfiguration erstellen
timesheet init

# Oder bestehende jira-cli Konfiguration verwenden
jira --version
jira init

# Config-Pfad überprüfen
timesheet config
```

**"JIRA_API_TOKEN environment variable not set"**
```bash
# API Token setzen
export JIRA_API_TOKEN="your-token"

# Token testen
timesheet test
```

**"Received unexpected response '401 Unauthorized' from jira."**
- API Token ist ungültig oder abgelaufen
- Überprüfen Sie Ihre Anmeldedaten
- Erstellen Sie ein neues API Token

**"Received unexpected response '403 Forbidden' from jira."**
- Keine Berechtigung für das angegebene Projekt
- Überprüfen Sie Projekt-Schlüssel und Berechtigungen

**"Received unexpected response '404 Not Found' from jira."**
- Server URL ist falsch oder Server nicht erreichbar
- Überprüfen Sie die Jira Server URL

### Fehlerbehandlung
Das Tool implementiert sofortigen Abbruch bei API-Fehlern:
- **Frühe Validierung**: Credentials werden vor der Konfigurationserstellung validiert
- **Keine Konfiguration bei Fehlern**: Bei API-Fehlern wird keine Konfiguration gespeichert
- **Spezifische Fehlermeldungen**: Klare Fehlermeldungen wie im Original jira-cli

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
timesheet config

# Verbindung testen
timesheet test
```

## 🔨 Build-Prozess

Das Projekt verwendet **esbuild** für optimales Bundling und **pkg** für die Erstellung von Cross-Platform-Binaries.

### Build-Scripts

```bash
# Bundle mit esbuild erstellen
npm run bundle

# Cross-Platform Binaries erstellen
npm run build:binaries

# Kompletter Build-Prozess (Bundle + Binaries)
npm run build:all

# Build-Artefakte löschen
npm run clean
```

### Build-Konfiguration

**esbuild Konfiguration** ([`esbuild.config.js`](esbuild.config.js)):
- Bundelt ES Modules für Node.js
- Optimiert für Node.js 18+
- Tree-shaking für kleinere Bundle-Größe
- Behält Debugging-Informationen bei

**pkg Konfiguration** ([`package.json`](package.json) `pkg` Sektion):
- Erstellt Binaries für Linux, macOS (x64/ARM64), Windows
- Komprimiert Binaries für kleinere Dateigröße
- Verwendet Node.js 18 Runtime

### Erstellte Artefakte

Nach `npm run build:all`:

```
dist/
├── timesheet.bundle.cjs   # esbuild Bundle

binaries/
├── timesheet-linux-x64    # Linux x64 Binary
├── timesheet-darwin-x64    # macOS x64 Binary
├── timesheet-darwin-arm64  # macOS ARM64 Binary
└── timesheet-win-x64.exe  # Windows x64 Binary
```

### Binary-Verwendung

```bash
# Linux
./binaries/timesheet-linux-x64 generate -p TEST

# macOS (Intel)
./binaries/timesheet-darwin-x64 generate -p TEST

# macOS (Apple Silicon)
./binaries/timesheet-darwin-arm64 generate -p TEST

# Windows
./binaries/timesheet-win-x64.exe generate -p TEST
```

**Vorteile der Binaries:**
- ✅ **Keine Node.js Installation erforderlich** - Standalone Executables
- ✅ **Cross-Platform** - Windows, macOS, Linux Support
- ✅ **Optimierte Performance** - Vorkompiliert und gebündelt
- ✅ **Einfache Distribution** - Einzelne Datei pro Platform
- ✅ **Konsistente Umgebung** - Eingebaute Node.js Runtime

## 🤝 Entwicklung

```bash
# Repository klonen
git clone <repository-url>
cd jira-timesheet-cli

# Dependencies installieren
npm install

# Lokal testen
node timesheet.js generate -p TEST

# Global installieren (für Entwicklung)
npm link

# Build testen
npm run build:all
```

## 📝 Lizenz

MIT License