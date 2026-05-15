# Windows desktop persistence test plan (MIN-126)

Run this before deciding whether the `safeStorage` defense-in-depth layer
mentioned in MIN-126 is actually needed. Each test takes < 5 minutes; the
whole pass is ~25 minutes of manual work.

Pass criteria: after **all five tests** end with the user signed in (or
correctly signed out where stated), Chromium's IndexedDB persistence is
working as expected and no additional `safeStorage` work is required.

If any test fails, document which one and which step. That tells the
implementer exactly which layer to fix.

## Setup

You need a real installed copy of the app, not `npm start`. Dev mode uses
a different userData path (`%APPDATA%/Electron` not `%APPDATA%/MindScape`),
so it doesn't reproduce installed-app behavior.

1. Build: `npm run make`
2. Run installer: `out/make/squirrel.windows/x64/MindScape-<version>-Setup.exe`
3. App launches. Sign in with a real Mindscape account (any role).
4. Confirm you land on `/dashboard`.

## Test 1 — Close + reopen survives

1. Right-click tray icon → **Quit** (full quit, not minimize-to-tray close).
2. Wait 5 seconds.
3. Launch MindScape again from the Start Menu.

**Expected:** lands directly on `/dashboard`, already signed in. No sign-in
form flashed.

**If fail:** Chromium isn't persisting IndexedDB between sessions. This is
unusual; check `%APPDATA%/MindScape/IndexedDB/` exists and has content
after quit.

## Test 2 — Reboot survives

1. With the app signed in, reboot Windows.
2. App auto-launches on login (default behavior).

**Expected:** auto-launched app is already signed in on the dashboard.

**If fail:** check whether auto-launch is firing at all (visible window or
tray icon). If yes but on sign-in page, IndexedDB cleared on reboot.

## Test 3 — Auto-update survives

1. Sign in on version N.
2. Tag and push version N+1 (or trigger the GitHub Actions workflow with
   a manual version bump).
3. Wait up to 1 hour for `updateElectronApp` to fetch the update (or
   manually trigger a check via the dev tools console:
   `require('electron').remote.autoUpdater.checkForUpdates()` — only works
   in unpackaged dev mode).
4. Restart the app to apply the update.

**Expected:** post-update app still signed in.

**If fail:** Squirrel's `app-N.Y.Z` → `app-N.Y.Z+1` migration broke userData
sharing. This is documented as flaky upstream; the safeStorage layer in
MIN-126 is the defense.

## Test 4 — Sign-out clears state

1. From the wrapped web app, click the user menu → Sign out.
2. Right-click tray → Quit.
3. Relaunch.

**Expected:** lands on `/sign-in` (the sign-in form), not `/dashboard`.

**If fail:** the web app's sign-out isn't actually clearing IndexedDB, OR
something is keeping a stale token. Worth investigating the frontend
sign-out path independently.

## Test 5 — Tray "Sign out + reset" works

1. With the app signed in, right-click tray → **Sign out + reset** →
   confirm.
2. Window reloads to `/sign-in` (or the marketing home).
3. Quit + relaunch.

**Expected:** still on `/sign-in` after relaunch. Local state is gone.

**If fail:** check `console.error` output from the main process. The
`session.clearStorageData` call might be missing a storage type.

## Test 6 — Uninstall wipes everything

1. Sign in.
2. Windows Settings → Apps → Installed apps → MindScape → **Uninstall**.
3. After uninstall completes, check:
   - `%LocalAppData%/Programs/MindScape/` is gone.
   - `%APPDATA%/MindScape/` is gone (this is the new behavior from MIN-126).
4. Reinstall.
5. Launch.

**Expected:** lands on `/sign-in` (not `/dashboard`); install is genuinely
fresh.

**If fail:** the `--squirrel-uninstall` hook in `src/index.js` didn't fire,
or `app.getPath('userData')` returned the wrong path. Check Windows Event
Viewer for any error during uninstall.

## Reporting results

Update this file with a results table after the pass:

```
| Test | Pass / Fail | Notes |
| 1    |             |       |
| 2    |             |       |
| 3    |             |       |
| 4    |             |       |
| 5    |             |       |
| 6    |             |       |
```

If any FAIL is the "expected behavior fails" case (1, 2, or 3), the
safeStorage layer is needed. If only tests 4–6 fail, those are local bugs
in the new code and can be fixed without the heavier persistence layer.
