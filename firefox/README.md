# Figma PR Extension - Firefox Version

A Firefox-compatible browser extension that automatically processes Figma links in GitHub PR descriptions and generates design specs.

## Firefox-Specific Differences

This version has been adapted for Firefox compatibility:

- **Manifest v2**: Uses manifest version 2 (Firefox standard)
- **Browser API**: Uses `browser.*` instead of `chrome.*` APIs
- **Permissions**: Permissions are declared in manifest rather than as host_permissions
- **Background Scripts**: Uses persistent background scripts instead of service workers

## Installation for Firefox

### For Development

1. Clone or download this Firefox extension version
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension folder
5. Get a Figma API token from [Figma Settings](https://www.figma.com/settings) → Account → Personal access tokens
6. Click the extension icon and enter your token

### For Users

*Extension will be submitted to Firefox Add-ons soon*

## Key Changes from Chrome Version

| Feature | Chrome (MV3) | Firefox (MV2) |
|---------|--------------|---------------|
| API Namespace | `chrome.*` | `browser.*` |
| Manifest Version | 3 | 2 |
| Permissions | `host_permissions` | Combined in `permissions` |
| Background | Service Worker | Background Scripts |
| Action | `action` | `browser_action` |
| Auto-popup | Supported | Not supported |

## Usage

Same as Chrome version:

1. **Setup**: Install the extension and configure your Figma API token
2. **Navigate**: Go to any GitHub PR page (new PR or edit existing)
3. **Add Links**: Paste Figma design URLs in your PR description
4. **Process**: Click the "🎨 Process Figma Links" button that appears
5. **Review**: Your Figma links will be replaced with organized design specs

## Compatibility

- Firefox 109.0 or higher
- Same GitHub URL patterns as Chrome version
- Same Figma API functionality

## Development Notes

- Uses WebExtensions API standard supported by Firefox
- Backward compatible with older Firefox versions
- All core functionality preserved from Chrome version

## Installation Instructions

1. Download the Firefox version files
2. Open Firefox
3. Navigate to `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on..."
6. Select the `manifest.json` file
7. Extension will be loaded and ready to use

The extension will remain active until Firefox is restarted (temporary add-on). For permanent installation, the extension needs to be signed and distributed through Firefox Add-ons.