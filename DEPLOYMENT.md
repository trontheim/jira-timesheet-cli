# DEPLOYMENT.md: Veröffentlichung und Nutzung des Homebrew Taps für jira-timesheet-cli

## 1. Einleitung und Voraussetzungen

### Ziel des Dokuments
Dieses Dokument beschreibt den Prozess der Veröffentlichung des Homebrew Taps für das `jira-timesheet-cli` Projekt sowie die Anleitung für Endbenutzer zur Installation und Nutzung des Tools über Homebrew.

### Zielgruppe
- Entwickler des `jira-timesheet-cli`, die den Homebrew Tap veröffentlichen und warten.
- Endbenutzer, die `jira-timesheet-cli` über Homebrew installieren und nutzen möchten.

### Voraussetzungen für die Veröffentlichung
- Ein aktiver GitHub Account.
- Git muss lokal installiert und konfiguriert sein.
- Homebrew muss auf dem Entwicklungsrechner installiert sein.
- Das `jira-timesheet-cli` Hauptprojekt sollte für ein Release bereit sein (idealerweise mit einem Git-Tag versehen).

### Voraussetzungen für die Nutzung durch Endbenutzer
- macOS Betriebssystem.
- Homebrew muss installiert sein.

## 2. Namenskonventionen für Homebrew Taps

Homebrew Taps folgen üblicherweise bestimmten Namenskonventionen für die zugehörigen GitHub Repositories:
- Standard-Taps von Organisationen oder Einzelpersonen: `homebrew-<projektname>` (z.B. `homebrew-core`, `homebrew-cask`).
- Persönliche Taps (User Taps): Oft einfach `<github-username>/<tap-name>`. Wenn das Repository `homebrew-something` heißt, kann der Tap mit `brew tap <github-username>/something` hinzugefügt werden.

Für dieses Projekt wird empfohlen:
- **Name des GitHub Repositorys für den Tap:** `homebrew-jira-timesheet-cli`
- **Name beim `brew tap` Befehl:** `yourusername/jira-timesheet-cli` (ersetze `yourusername` mit deinem tatsächlichen GitHub Benutzernamen). Homebrew erkennt das `homebrew-` Präfix im Repository-Namen automatisch.

## 3. Vorbereitung des Tap-Repositorys (`homebrew-jira-timesheet-cli`)

Das Tap-Repository enthält die Formula-Datei und weitere Metadaten.

### Struktur überprüfen
Das Repository ist bereits als Homebrew Tap strukturiert mit folgender Struktur im Root-Verzeichnis:
```
jira-timesheet-cli/ (Root des Repositorys)
├── jira-timesheet-cli.rb  # Die Homebrew Formula
├── README.md              # Dokumentation spezifisch für den Tap
├── LICENSE                # Lizenzdatei (z.B. MIT)
├── .gitignore             # Git Ignore Regeln
├── timesheet.js           # Das CLI Tool
├── package.json           # Node.js Dependencies
└── ... (weitere Projektdateien)
```

### Anpassung der Formula (`jira-timesheet-cli.rb`)
Die Datei [`jira-timesheet-cli.rb`](jira-timesheet-cli.rb:1) muss für die Veröffentlichung angepasst werden.

```ruby
class JiraTimesheetCli < Formula
  desc "CLI tool to generate timesheets from Jira worklogs via REST API" # Beschreibung prüfen/anpassen
  homepage "https://github.com/yourusername/jira-timesheet-cli" # URL zum Hauptprojekt-Repository
  
  # URL zum Release-Archiv (tar.gz) des jira-timesheet-cli Tools
  # Beispiel: url "https://github.com/yourusername/jira-timesheet-cli/archive/refs/tags/v1.0.0.tar.gz"
  url "file:///Users/valgard/Projects/work/selgros/jira-timesheet-cli" # DIES MUSS ANGEPASST WERDEN!
  version "1.0.0" # Muss mit der Version im URL und dem Git-Tag übereinstimmen
  
  # SHA256 Hash des Release-Archivs. Muss nach jeder neuen URL neu berechnet werden.
  # Beispiel: sha256 "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  # sha256 "" # DIES MUSS ANGEPASST WERDEN! (Leer lassen oder korrekten Hash eintragen)

  license "MIT" # Lizenz prüfen

  depends_on "node" # Abhängigkeiten prüfen

  def install
    # Installiert alle Dateien aus dem Release-Archiv nach libexec
    libexec.install Dir["*"]
    
    # Installiert npm dependencies im libexec Verzeichnis
    # Stellt sicher, dass das Release-Archiv eine package.json enthält
    system "npm", "install", "--production", "--prefix", libexec
    
    # Erstellt ein Wrapper-Skript in bin, das das Tool über Node ausführt
    (bin/"timesheet").write <<~EOS
      #!/bin/bash
      exec "#{Formula["node"].opt_bin}/node" "#{libexec}/timesheet.js" "$@"
    EOS
  end

  test do
    # Einfacher Test, ob das CLI-Tool ausgeführt werden kann und die Version anzeigt
    # Stelle sicher, dass dieser Test mit deinem Tool funktioniert
    assert_match version.to_s, shell_output("#{bin}/timesheet --version")
  end
end
```

**Wichtige Anpassungen in der Formula:**
1.  **`homepage`**: Setze dies auf die URL deines Hauptprojekt-Repositorys (z.B. `https://github.com/yourusername/jira-timesheet-cli`).
2.  **`url`**: Dies ist die wichtigste Änderung. Die URL muss auf ein stabiles Release-Archiv (`.tar.gz` oder `.zip`) deines `jira-timesheet-cli` Projekts zeigen. Dieses Archiv wird von GitHub automatisch erstellt, wenn du ein Release taggst.
    *   Beispiel: `https://github.com/yourusername/jira-timesheet-cli/archive/refs/tags/v1.0.0.tar.gz` (ersetze `yourusername` und `v1.0.0`).
3.  **`version`**: Muss exakt mit der Version im `url` und dem Git-Tag des Releases übereinstimmen.
4.  **`sha256`**: Dies ist der SHA256-Hash des unter `url` heruntergeladenen Archivs.
    *   So generierst du den Hash (ersetze `<URL_ZUM_ARCHIV>`):
        ```bash
        curl -L <URL_ZUM_ARCHIV> | shasum -a 256
        ```
    *   Kopiere den ausgegebenen Hash in die Formula.
5.  **`desc`**: Überprüfe die Beschreibung.
6.  **`install` Block**:
    *   `libexec.install Dir["*"]`: Stellt sicher, dass alle Dateien aus dem heruntergeladenen Archiv in das `libexec`-Verzeichnis von Homebrew kopiert werden. Das ist korrekt, wenn dein Release-Archiv alle notwendigen Dateien (inkl. `timesheet.js`, `package.json` etc.) direkt im Root enthält.
    *   `system "npm", "install", "--production", "--prefix", libexec`: Installiert die Produktionsabhängigkeiten. Stelle sicher, dass dein Release-Archiv eine `package.json` enthält.
    *   Wrapper-Skript: Das Skript `bin/"timesheet"` sorgt dafür, dass das Tool global aufrufbar ist.
7.  **`test` Block**: Der Test sollte überprüfen, ob das Tool grundlegend funktioniert. `timesheet --version` ist ein guter Anfang.

## 4. Schritt-für-Schritt-Anleitung zur Veröffentlichung des Taps auf GitHub

### A. Vorbereitung des `jira-timesheet-cli` Hauptprojekts für ein Release
Bevor du den Tap veröffentlichen kannst, benötigst du ein stabiles Release deines `jira-timesheet-cli` Tools.

1.  **Code finalisieren und testen.**
2.  **Version in `package.json` aktualisieren** (z.B. auf `1.0.0`).
3.  **Änderungen committen:**
    ```bash
    git add package.json timesheet.js # etc.
    git commit -m "Prepare release v1.0.0"
    ```
4.  **Git-Tag erstellen:**
    ```bash
    git tag v1.0.0
    ```
5.  **Tag zum Remote-Repository pushen:**
    ```bash
    git push origin main --tags # oder git push origin v1.0.0
    ```
6.  **GitHub Release erstellen:**
    *   Gehe zu deinem `jira-timesheet-cli` Repository auf GitHub.
    *   Klicke auf "Releases" und dann "Create a new release" oder "Draft a new release".
    *   Wähle den gerade gepushten Tag (z.B. `v1.0.0`) aus.
    *   Gib einen Release-Titel und eine Beschreibung ein.
    *   GitHub generiert automatisch Quellcode-Archive (`.zip` und `.tar.gz`). Du benötigst die URL zu einem dieser Archive (üblicherweise `.tar.gz`).
        *   Die URL hat meist das Format: `https://github.com/yourusername/jira-timesheet-cli/archive/refs/tags/v1.0.0.tar.gz`

### B. Tap-Repository auf GitHub erstellen und Formula pushen

1.  **Lokales Git-Repository für den Tap vorbereiten:**
    ```bash
    # Das Repository ist bereits als Homebrew Tap strukturiert
    # Alle Tap-Dateien befinden sich im Root-Verzeichnis
    cd path/to/your/project/jira-timesheet-cli

    git add .
    git commit -m "Restructure as Homebrew tap with formula in root"
    ```
2.  **GitHub Repository für den Tap erstellen:**
    *   Gehe zu GitHub und erstelle ein neues **öffentliches** Repository.
    *   Name: `homebrew-jira-timesheet-cli` (gemäß Namenskonvention).
    *   Initialisiere es **nicht** mit einer README, .gitignore oder Lizenz, da diese Dateien bereits lokal vorhanden sind.
3.  **Lokales Repository als Tap-Repository konfigurieren:**
    ```bash
    # Das bestehende Repository kann direkt als Tap verwendet werden
    # Ersetze yourusername mit deinem GitHub Benutzernamen
    git remote set-url origin git@github.com:yourusername/homebrew-jira-timesheet-cli.git
    git push -u origin main
    ```
4.  **Formula `jira-timesheet-cli.rb` aktualisieren:**
    *   Öffne die Datei `jira-timesheet-cli.rb` im Root-Verzeichnis.
    *   Trage die korrekte `url` zum `.tar.gz` des Releases deines Hauptprojekts ein (siehe Schritt A.6).
    *   Trage die korrekte `version` ein.
    *   Berechne und trage den `sha256` Hash für diese URL ein:
        ```bash
        curl -L https://github.com/yourusername/jira-timesheet-cli/archive/refs/tags/v1.0.0.tar.gz | shasum -a 256
        ```
5.  **Aktualisierte Formula committen und pushen:**
    ```bash
    git add jira-timesheet-cli.rb
    git commit -m "Add/Update formula for jira-timesheet-cli v1.0.0"
    git push origin main
    ```

### Veröffentlichungsprozess Visualisiert
```mermaid
graph TD
    A[Hauptprojekt jira-timesheet-cli] -- 1. Git Tag (v1.0.0) & Push --> B(GitHub Release für jira-timesheet-cli)
    B -- 2. Erzeugt Release Archiv (v1.0.0.tar.gz) --> C{URL & SHA256 des Archivs}
    C -- 3. Eintragen in --> D[Formula jira-timesheet-cli.rb im Tap Repo]
    E[Lokales Tap Repo (homebrew-jira-timesheet-cli)] -- git init, add, commit --> F{Neues GitHub Repo: homebrew-jira-timesheet-cli}
    F -- git remote add --> E
    D -- 4. git add, commit, push --> G[Aktualisiertes Tap Repo auf GitHub]
    G -- Von Homebrew Nutzern gefunden --> H[Installation via brew]
```

## 5. Anleitung für Endbenutzer zur Installation und Nutzung

Diese Informationen sollten auch in der `README.md` des `homebrew-jira-timesheet-cli` Repositorys stehen.

### Installation
Benutzer können `jira-timesheet-cli` auf zwei Wegen installieren:

1.  **Tap hinzufügen und dann installieren (empfohlen für Updates):**
    ```bash
    # Ersetze 'yourusername' mit dem GitHub-Benutzernamen, unter dem der Tap gehostet wird
    brew tap yourusername/jira-timesheet-cli

    # Tool installieren
    brew install jira-timesheet-cli
    ```
2.  **Direkte Installation (ohne explizites Tappen):**
    ```bash
    # Ersetze 'yourusername'
    brew install yourusername/jira-timesheet-cli/jira-timesheet-cli
    ```

### Grundlegende Nutzung
Nach der Installation ist das `timesheet` Kommando global verfügbar:
```bash
# Hilfe anzeigen
timesheet --help

# Version anzeigen
timesheet --version

# Konfiguration initialisieren (falls erforderlich)
timesheet init

# Timesheet für aktuellen Monat generieren
timesheet generate

# Timesheet für spezifischen Zeitraum generieren
timesheet generate --from YYYY-MM-DD --to YYYY-MM-DD

# Timesheet als CSV exportieren
timesheet generate --format csv --output timesheet.csv
```
(Weitere Beispiele und Details zur Konfiguration sollten in der Dokumentation des Hauptprojekts `jira-timesheet-cli` zu finden sein.)

### Deinstallation
```bash
# Tool deinstallieren
brew uninstall jira-timesheet-cli

# Tap entfernen (optional, wenn keine anderen Tools aus diesem Tap genutzt werden)
# Ersetze 'yourusername'
brew untap yourusername/jira-timesheet-cli
```

## 6. Lokale Entwicklung und Tests des Taps

Während der Entwicklung der Formula oder vor dem Pushen von Änderungen ist es wichtig, lokal zu testen.

1.  **Formula lokal installieren und testen:**
    ```bash
    # Navigiere in das Root-Verzeichnis des Repositorys
    cd path/to/your/jira-timesheet-cli
    
    # Installiere die Formula aus der lokalen Datei
    # Dies kompiliert und installiert das Tool basierend auf der lokalen .rb Datei
    # Die 'url' in der Formula sollte hierfür temporär auf ein lokales Archiv oder
    # ein bereits existierendes Remote-Archiv zeigen, um den Download-Teil zu testen.
    # Für rein lokale Tests des Installationsprozesses kann die URL auch auf
    # file:///path/to/your/project/archive.tar.gz zeigen.
    brew install --build-from-source ./jira-timesheet-cli.rb
    
    # Führe die in der Formula definierten Tests aus
    brew test jira-timesheet-cli
    
    # Nach dem Testen wieder deinstallieren, um Konflikte zu vermeiden
    brew uninstall jira-timesheet-cli
    ```
2.  **Formula validieren:**
    Homebrew bietet ein `audit` Kommando, um Formulas auf häufige Probleme und Stilrichtlinien zu prüfen.
    ```bash
    # Strikte Prüfung der lokalen Formula
    brew audit --strict ./jira-timesheet-cli.rb

    # Wenn die Formula bereits über einen Tap verfügbar ist (auch lokal getappt):
    # brew audit --strict jira-timesheet-cli

    # Prüfung inklusive Online-Checks (z.B. ob die URL erreichbar ist)
    # brew audit --strict --online jira-timesheet-cli 
    # (oder für die lokale Datei, wenn die URL eine öffentliche ist)
    brew audit --strict --online ./jira-timesheet-cli.rb
    ```

## 7. Wartungsprozess für Updates der Formula

Wenn eine neue Version von `jira-timesheet-cli` veröffentlicht wird, muss die Formula im Tap-Repository aktualisiert werden.

1.  **Neues Release des `jira-timesheet-cli` Hauptprojekts erstellen:**
    *   Wie in Abschnitt 4.A beschrieben (Code finalisieren, Version in `package.json` erhöhen, taggen `v1.0.1`, pushen, GitHub Release erstellen).
    *   Notiere die URL des neuen Release-Archivs (z.B. `.../v1.0.1.tar.gz`).
2.  **Neuen `sha256` Hash ermitteln:**
    ```bash
    curl -L <URL_ZUM_NEUEN_RELEASE_ARCHIV_v1.0.1.tar.gz> | shasum -a 256
    ```
3.  **`jira-timesheet-cli.rb` im Repository aktualisieren:**
    *   Navigiere zu deinem `homebrew-jira-timesheet-cli` Repository.
    *   Öffne `jira-timesheet-cli.rb` im Root-Verzeichnis.
    *   Ändere die `version` auf die neue Version (z.B. `version "1.0.1"`).
    *   Aktualisiere die `url` auf die URL des neuen Release-Archivs.
    *   Aktualisiere den `sha256` Hash mit dem neu berechneten Wert.
4.  **Änderungen committen und pushen:**
    ```bash
    git add jira-timesheet-cli.rb
    git commit -m "Update formula jira-timesheet-cli to v1.0.1"
    git push origin main
    ```
Benutzer, die den Tap bereits hinzugefügt haben, erhalten die neue Version automatisch beim nächsten `brew update && brew upgrade jira-timesheet-cli`.

### Update-Prozess Visualisiert
```mermaid
graph TD
    G[Neues Release von jira-timesheet-cli (z.B. v1.0.1)] --> H(Neues Release Archiv v1.0.1.tar.gz auf GitHub)
    H -- Neue URL & SHA256 --> I{Formula jira-timesheet-cli.rb im Tap Repo aktualisieren}
    I -- git add, commit, push --> J[Aktualisiertes Tap Repo auf GitHub]
    J -- `brew update` (durch User) --> K[User erhält Aufforderung/Möglichkeit zum Upgrade]
```

## 8. Troubleshooting

### Häufige Probleme und Lösungen

*   **`Error: No available formula with the name "jira-timesheet-cli"`**
    *   **Ursache:** Der Tap wurde nicht korrekt hinzugefügt oder Homebrew kennt die neue Formula noch nicht.
    *   **Lösung:**
        1.  Stelle sicher, dass der Tap korrekt hinzugefügt wurde: `brew tap yourusername/jira-timesheet-cli` (ersetze `yourusername`).
        2.  Führe `brew update` aus, um die Liste der verfügbaren Formeln zu aktualisieren.

*   **`Error: SHA256 mismatch` beim Installieren/Upgraden**
    *   **Ursache für Entwickler:** Der `sha256` Hash in der Formula-Datei im Tap-Repository stimmt nicht mit dem Hash des heruntergeladenen Archivs überein. Dies passiert, wenn die `url` geändert wurde, aber der `sha256` nicht, oder wenn das Archiv selbst serverseitig ohne Versionsänderung modifiziert wurde (sollte nicht passieren bei GitHub Releases).
    *   **Lösung für Entwickler:** Berechne den `sha256` neu und aktualisiere die Formula im Tap.
    *   **Ursache für Benutzer:** Manchmal ein Cache-Problem oder eine veraltete Formula-Definition.
    *   **Lösung für Benutzer:**
        1.  `brew update && brew upgrade jira-timesheet-cli`
        2.  Homebrew Cache für die fehlerhafte Datei löschen: `brew cleanup jira-timesheet-cli` oder `brew cleanup --prune=all`.

*   **Installationsfehler (z.B. Node.js-bezogene Probleme, `npm install` schlägt fehl)**
    *   **Ursache:** Probleme mit der Node.js-Installation, Netzwerkprobleme beim `npm install`, fehlende Build-Tools (selten bei Node-Projekten ohne native Module).
    *   **Lösung:**
        1.  Sicherstellen, dass Homebrew und Node.js (`brew info node`) aktuell sind.
        2.  `brew doctor` ausführen und gemeldete Probleme beheben.
        3.  Netzwerkverbindung prüfen.
        4.  Homebrew Installationslogs prüfen (oft in `~/Library/Logs/Homebrew/`).

*   **`Error: Invalid formula: <path/to/formula.rb> ...`**
    *   **Ursache:** Syntaxfehler in der Formula-Datei.
    *   **Lösung für Entwickler:** `brew audit --strict ./jira-timesheet-cli.rb` verwenden, um die Fehler zu finden und zu beheben.

### Wo man Hilfe bekommt
-   **Für Probleme mit dem Tap oder der Formula:** Erstelle ein Issue im `homebrew-jira-timesheet-cli` Repository auf GitHub (`https://github.com/yourusername/homebrew-jira-timesheet-cli/issues`).
-   **Für Probleme mit dem `jira-timesheet-cli` Tool selbst:** Erstelle ein Issue im Hauptprojekt-Repository (`https://github.com/yourusername/jira-timesheet-cli/issues`).

## 9. Zusammenfassung

Ein gut gepflegter Homebrew Tap erleichtert Benutzern die Installation und Aktualisierung deines `jira-timesheet-cli` Tools erheblich. Die hier beschriebenen Schritte sollten dir helfen, deinen Tap erfolgreich zu veröffentlichen und zu warten. Denke daran, `yourusername` und Versionsnummern entsprechend anzupassen.