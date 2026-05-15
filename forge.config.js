const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'MindScape',
    icon: './src/assets/icon',
    extraResource: ['./src/assets'],
    // Surfaces in Windows file properties (right-click → Properties →
    // Details) and in Add/Remove Programs. MIN-126.
    win32metadata: {
      CompanyName: 'MindScape Health',
      ProductName: 'MindScape',
      FileDescription: 'MindScape Desktop',
      InternalName: 'MindScape',
      OriginalFilename: 'MindScape.exe',
    },
    appCopyright: 'Copyright (C) 2026 MindScape Health',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Squirrel uses these for the installer UI + Add/Remove Programs entry.
        name: 'MindScape',
        // Friendly publisher name visible in Add/Remove Programs.
        authors: 'MindScape Health',
        description: 'MindScape Desktop — culturally-informed mental healthcare',
        setupIcon: './src/assets/icon.ico',
        iconUrl: 'https://raw.githubusercontent.com/mindscapeteam/windows/main/src/assets/icon.ico',
        // Setup.exe filename pattern (avoids the unhelpful default
        // "Setup.exe"). Tag-driven version is substituted by the CI.
        setupExe: 'MindScape-Setup.exe',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'MindScape',
        icon: './src/assets/icon.icns',
        format: 'ULFO',
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'mindscapeteam',
          name: 'windows',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
