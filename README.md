# MindScape Desktop (Windows)

Electron desktop app for [MindScape Health](https://mindscapehealth.org). Wraps the web dashboard in a native Windows experience with system tray, auto-launch, and auto-updates.

## Features

- **Frameless window** with custom title bar controls (minimize, maximize, close)
- **System tray** — minimize to tray, double-click to restore
- **Auto-launch** on Windows startup
- **Auto-updates** from GitHub Releases (checks every hour)
- **Google OAuth** support via popup windows
- **Single instance** lock — prevents duplicate windows

## Development

```bash
npm install
npm start
```

## Building

```bash
# Generate icons from source logo
npm run generate-icons

# Build the installer locally
npm run make
```

The installer is output to `out/make/squirrel.windows/x64/MindScape-<version>.Setup.exe`.

## Releasing

Push a version tag to trigger the CI build and GitHub Release:

```bash
git tag v1.1.0
git push origin v1.1.0
```

This runs the [GitHub Actions workflow](.github/workflows/build-windows.yml) which:

1. Sets the version from the tag
2. Installs dependencies
3. Builds the Squirrel installer via Electron Forge
4. Creates a GitHub Release with the `.exe`, `.nupkg`, and `RELEASES` files

You can also trigger a build manually from the Actions tab with an optional version input.

## How auto-updates work

The app uses [`update-electron-app`](https://github.com/electron/update-electron-app) pointing to this repo (`mindscapeteam/windows`). When a new GitHub Release is published, installed copies of MindScape will download and apply the update automatically in the background.

## Project structure

```
src/
  index.js        # Main process — window, tray, IPC, auto-update
  preload.js      # Context bridge for window controls
  assets/         # App icons (generated from logo-source.png)
scripts/
  generate-icon.js  # Generates icon.png, icon.ico from source logo
forge.config.js     # Electron Forge config (Squirrel maker, GitHub publisher)
.github/workflows/  # CI/CD pipeline
```
