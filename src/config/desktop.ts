/**
 * Codexa for Windows (desktop/). The installer is built by .github/workflows/desktop.yml and attached
 * to a GitHub release; "latest/download" always points at the newest one. Update `version` and
 * `sizeMb` here when a new release is published.
 */
export const DESKTOP = {
  version: "2.1.0",
  sizeMb: 85,
  fileName: "Codexa-Setup-x64.exe",
  downloadUrl: "https://github.com/sangralrahul/codexa/releases/latest/download/Codexa-Setup-x64.exe",
  releasesUrl: "https://github.com/sangralrahul/codexa/releases?q=desktop",
  requirements: "Windows 10 or 11, 64-bit (x64)",
} as const;
