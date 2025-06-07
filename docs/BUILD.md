# 🔨 Build-Prozess

Das Projekt verwendet **esbuild** für optimales Bundling und **pkg** für die Erstellung von Cross-Platform-Binaries.

## Build-Scripts

```bash
# Bundle mit esbuild erstellen
npm run bundle

# Cross-Platform Binaries erstellen
npm run build:binaries

# Kompletter Build-Prozess (Bundle + Binaries)
npm run build

# Build-Artefakte löschen
npm run clean
```

## Build-Konfiguration

**esbuild Konfiguration** ([`esbuild.config.js`](../esbuild.config.js)):
- Bundelt ES Modules für Node.js
- Optimiert für Node.js 18+
- Tree-shaking für kleinere Bundle-Größe
- Behält Debugging-Informationen bei

**pkg Konfiguration** ([`package.json`](../package.json) `pkg` Sektion):
- Erstellt Binaries für alle unterstützten Plattformen
- Komprimiert Binaries für kleinere Dateigröße
- Verwendet Node.js 18 Runtime

## Unterstützte Plattformen

Das Tool unterstützt folgende Plattformen mit nativen Binaries:

| Plattform | Architektur | Binary Name | Status |
|-----------|-------------|-------------|---------|
| **Linux** | x64 | `timesheet-linux-x64` | ✅ Unterstützt |
| **Linux** | ARM64 | `timesheet-linux-arm64` | ✅ **Neu** |
| **macOS** | x64 (Intel) | `timesheet-darwin-x64` | ✅ Unterstützt |
| **macOS** | ARM64 (Apple Silicon) | `timesheet-darwin-arm64` | ✅ Unterstützt |
| **Windows** | x64 | `timesheet-win-x64.exe` | ✅ Unterstützt |
| **Windows** | ARM64 | `timesheet-win-arm64.exe` | ✅ **Neu** |

**Neue ARM64-Unterstützung:**
- ✅ **Linux ARM64** - Für ARM-basierte Server und Entwicklungsumgebungen
- ✅ **Windows ARM64** - Für Windows on ARM Geräte (Surface Pro X, etc.)

## Erstellte Artefakte

Nach `npm run build`:

```
dist/
├── timesheet.bundle.cjs   # esbuild Bundle

binaries/
├── timesheet-linux-x64      # Linux x64 Binary
├── timesheet-linux-arm64    # Linux ARM64 Binary (neu)
├── timesheet-darwin-x64      # macOS x64 Binary
├── timesheet-darwin-arm64    # macOS ARM64 Binary
├── timesheet-win-x64.exe    # Windows x64 Binary
└── timesheet-win-arm64.exe  # Windows ARM64 Binary (neu)
```

## Binary-Verwendung

```bash
# Linux x64
./binaries/timesheet-linux-x64 generate -p TEST

# Linux ARM64 (neu)
./binaries/timesheet-linux-arm64 generate -p TEST

# macOS (Intel)
./binaries/timesheet-darwin-x64 generate -p TEST

# macOS (Apple Silicon)
./binaries/timesheet-darwin-arm64 generate -p TEST

# Windows x64
./binaries/timesheet-win-x64.exe generate -p TEST

# Windows ARM64 (neu)
./binaries/timesheet-win-arm64.exe generate -p TEST
```

## Vorteile der Binaries

- ✅ **Keine Node.js Installation erforderlich** - Standalone Executables
- ✅ **Vollständige Cross-Platform Unterstützung** - Windows, macOS, Linux (x64 und ARM64)
- ✅ **Native ARM64-Unterstützung** - Optimiert für moderne ARM-Prozessoren
- ✅ **Optimierte Performance** - Vorkompiliert und gebündelt
- ✅ **Einfache Distribution** - Einzelne Datei pro Platform
- ✅ **Konsistente Umgebung** - Eingebaute Node.js Runtime

## Entwicklung

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
npm run build
```

## Plattform-spezifische Hinweise

### Linux
- **x64**: Für Standard-Linux-Server und -Desktops
- **ARM64**: Für ARM-basierte Server (AWS Graviton, Raspberry Pi, etc.)

### macOS
- **x64**: Für Intel-basierte Macs
- **ARM64**: Für Apple Silicon Macs (M1, M2, M3, etc.)

### Windows
- **x64**: Für Standard-Windows-PCs
- **ARM64**: Für Windows on ARM Geräte (Surface Pro X, etc.)