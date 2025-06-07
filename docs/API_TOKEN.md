# 🔑 API Token erstellen

Ein API Token ist erforderlich für die sichere Authentifizierung mit Jira. Es ersetzt Ihr Passwort und bietet bessere Sicherheit und Kontrolle über den Zugriff.

## Für Atlassian Cloud (Empfohlen)

### Was ist ein API Token?
- **Sicherheitstoken** anstelle Ihres Passworts
- **Spezifische Berechtigung** nur für API-Zugriffe
- **Widerrufbar** ohne Passwort-Änderung
- **Audit-fähig** - alle API-Zugriffe werden protokolliert

### Schritt-für-Schritt Anleitung:

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

### Sicherheitshinweise:
- ✅ **Niemals in Code oder Repositories speichern**
- ✅ **Nicht in Slack, E-Mails oder Chat-Nachrichten teilen**
- ✅ **Regelmäßig erneuern** (alle 6-12 Monate)
- ✅ **Bei Verdacht auf Kompromittierung sofort löschen**
- ✅ **Nur für notwendige Anwendungen verwenden**
- ✅ **Beschreibende Namen für bessere Übersicht verwenden**

### Token-Verwaltung:
- **Anzeigen:** Gehen Sie zu den API Token Settings, um alle Ihre Tokens zu sehen
- **Löschen:** Klicken Sie auf "Delete" neben einem Token, um es zu widerrufen
- **Erneuern:** Löschen Sie das alte Token und erstellen Sie ein neues

## Für Jira Server/Data Center

Für lokale Jira-Installationen haben Sie mehrere Authentifizierungsoptionen:

### Option 1: Personal Access Tokens (PATs) - Empfohlen für Jira Server 8.14+

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

### Option 2: Basic Authentication - Für ältere Jira Versionen

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

## Troubleshooting

### Häufige Probleme:

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

### Erweiterte Konfiguration:

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