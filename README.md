# Figma PR Browser Extension

![Chrome](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white) ![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=firefox&logoColor=white)

> **⚠️ Status: Work in Progress**  
> This extension is currently in development and requires further polish and performance improvements. While functional, you may encounter bugs or inconsistencies. Use with caution and expect regular updates.

A browser extension that automatically processes Figma links in GitHub PR descriptions and generates interactive design specs with images, version tracking, and detailed metadata.

🐙 **Also available as a [GitHub Action](https://github.com/wildemat/github-figma-action)**

## Features

- 🎨 **Automatic Figma Link Processing**: Converts Figma design links into rich, interactive design specifications
- 🖼️ **Design Previews**: Generates preview images for each Figma design node
- 📝 **Detailed Specs**: Includes version information, timestamps, and design links
- 🔄 **Version Tracking**: Handles different versions of the same design node intelligently
- 🚫 **Duplicate Prevention**: Avoids creating duplicate specs for the same design+version
- ⭐ **Smart UI**: Button only appears when editing PR descriptions in Write mode
- 🔒 **Secure Token Storage**: Safely stores Figma API tokens using browser storage APIs

## Browser Support

| Browser         | Status       | Built To         |
| --------------- | ------------ | ---------------- |
| Chrome/Chromium | ✅ Supported | `build/chrome/`  |
| Firefox         | ✅ Supported | `build/firefox/` |

## Installation

### For Development/Testing

1. **Clone the repository** and build the extensions:

   ```bash
   git clone <repo-url>
   cd figma-pr-browser-extension
   npm install
   npm run build
   ```

2. **Load the extension**:
   - **Chrome**: Navigate to `chrome://extensions/` → Enable "Developer mode" → Click "Load unpacked" → Select the `build/chrome/` folder
   - **Firefox**: Navigate to `about:debugging` → Click "This Firefox" → Click "Load Temporary Add-on" → Select `build/firefox/manifest.json`

### For Distribution

Use the pre-built zip files from `build/releases/`:

- `figma-pr-extension-chrome.zip` for Chrome Web Store
- `figma-pr-extension-firefox.zip` for Firefox Add-ons

## Setup

1. **Install the extension** for your browser
2. **Get a Figma API token**:
   - Go to [Figma Account Settings](https://www.figma.com/developers/api#access-tokens)
   - Generate a new personal access token
   - Ensure it has the required scopes: `file_content:read`, `file_metadata:read`, `file_versions:read`, `current_user:read`
3. **Configure the extension**:
   - Click the extension icon in your browser toolbar
   - Enter your Figma API token
   - Click "Test Token" to verify it works
   - Click "Save"

## Usage

1. **Edit a GitHub PR description** that contains Figma links
2. **Ensure you're on the "Write" tab** (not "Preview")
3. **Click the "🎨 Process Figma Links" button** that appears
4. **Wait for processing** - the extension will:
   - Parse all Figma links in the description
   - Fetch design images and metadata
   - Generate interactive design specs
   - Replace original links with references to the specs
5. **Review and save** your updated PR description

## Example Output

The extension converts Figma links like:

```
https://www.figma.com/design/abc123/MyDesign?node-id=1-2
```

Into interactive design specs with:

- 🖼️ Design preview images
- 📋 Expandable spec details
- 🔗 Clean links to specific design versions
- 📅 Snapshot timestamps
- ⏰ Image expiration dates

## Configuration

### Figma API Token Requirements

Your Figma API token needs these scopes:

- `file_content:read` - Required to access design content and nodes
- `file_metadata:read` - Required to fetch file information and metadata
- `file_versions:read` - Required for version tracking functionality
- `current_user:read` - Required for token validation

### Token Storage

- Tokens are stored securely using browser sync storage
- Tokens sync across devices when logged into the same browser account
- Tokens are never transmitted except to Figma's official API

## Development

### Project Structure

```
figma-pr-browser-extension/
├── src/
│   ├── shared/            # Cross-browser source files
│   │   ├── content.js     # Main content script
│   │   ├── popup.js       # Popup functionality
│   │   ├── popup.html     # Settings popup
│   │   ├── utils.js       # Utility functions
│   │   ├── snarkdown.js   # Markdown parser
│   │   ├── background-chrome.js    # Chrome service worker
│   │   ├── background-firefox.js   # Firefox background script
│   │   └── debug-firefox.js        # Firefox debug utilities
│   ├── chrome/            # Chrome-specific files
│   │   └── manifest.json  # Chrome manifest v3
│   ├── firefox/           # Firefox-specific files
│   │   └── manifest.json  # Firefox manifest v2
│   ├── icons/            # Extension icons
│   └── content.css       # Content script styles
├── build/                # Generated builds (not committed)
│   ├── chrome/           # Built Chrome extension
│   ├── firefox/          # Built Firefox extension
│   └── releases/         # Distribution zip files
└── build.js              # Build script
```

### Key Differences Between Browsers

| Feature           | Chrome           | Firefox               |
| ----------------- | ---------------- | --------------------- |
| Manifest Version  | v3               | v2                    |
| Background Script | Service Worker   | Persistent Background |
| Storage API       | `chrome.storage` | `browser.storage`     |
| Runtime API       | `chrome.runtime` | `browser.runtime`     |

### Building/Testing

1. **Make changes** to the source files in the `src/` directory
2. **Build the extensions**: `npm run build`
3. **Load the extension** for testing:
   - **Chrome**: chrome://extensions/ → Load unpacked → select `build/chrome/` folder
   - **Firefox**: about:debugging → Load Temporary Add-on → select `build/firefox/manifest.json`
4. **Test on a GitHub PR** with Figma links
5. **Distribution**: Use zip files in `build/releases/` for publishing

### Development Scripts

- `npm run build` - Build both Chrome and Firefox extensions with zip files
- `npm run dev` - Build both extensions and show loading instructions
- `npm run lint` - Check code formatting with Prettier
- `npm run lint:fix` - Fix code formatting issues automatically

## Contributing

We welcome contributions! To get started:

1. **Read the prompts**: See [prompts.md](prompts.md) for AI-assistant prompts that help understand the codebase, customization options, and security considerations
2. **Test your changes** thoroughly on different GitHub PR pages
3. **Follow the existing code patterns** for browser compatibility
4. **Update documentation** if you add new features

For questions about the codebase architecture, security practices, or troubleshooting, the prompts file contains helpful starter questions for AI assistants. 4. **Check browser console** for debug logs

## Troubleshooting

### Button Not Appearing

- Ensure you're editing a PR description (not a comment)
- Make sure you're on the "Write" tab (not "Preview")
- Check that the extension has proper permissions for GitHub

### Token Test Failing

- Verify your token has the correct scopes
- Check your internet connection
- Ensure the token hasn't expired

### Processing Errors

- Check browser console for detailed error messages
- Verify Figma links are properly formatted
- Ensure you have access to the Figma files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both Chrome and Firefox
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Privacy

This extension:

- Only processes data on GitHub PR pages
- Sends Figma API requests directly to Figma's servers
- Stores only your Figma API token locally
- Does not collect or transmit any personal data
