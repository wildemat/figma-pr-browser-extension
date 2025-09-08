# Build System

This project uses a custom build system to generate browser extensions from shared source code, eliminating code duplication and ensuring consistency across Chrome and Firefox versions.

## Quick Start

```bash
# Build both extensions
npm run build

# Build individual browsers
npm run build:chrome
npm run build:firefox

# Clean generated files
npm run clean

# Development workflow
npm run dev
```

## Project Structure

```
src/                          # Source code (single source of truth)
├── content.js               # Main content script
├── popup.js                 # Extension popup
├── popup.html              # Popup HTML
├── background.js           # Chrome background script (default)
├── utils.js                # Shared utility functions
├── snarkdown.js            # Markdown library
└── firefox/                # Firefox-specific overrides
    ├── background.js       # Firefox background script
    └── debug.js           # Firefox debugging utilities

chrome/                      # Generated Chrome extension
├── manifest.json           # Chrome manifest v3 (maintained manually)
├── content.css            # Chrome styles (maintained manually)
├── icons/                 # Chrome icons (maintained manually)
└── ...                    # Generated files

firefox/                     # Generated Firefox extension
├── manifest.json           # Firefox manifest v2 (maintained manually)
├── content.css            # Firefox styles (maintained manually)
├── icons/                 # Firefox icons (maintained manually)
└── ...                    # Generated files
```

## How It Works

### 1. **Shared Source Files**

- All JavaScript logic lives in `src/`
- Single content.js, popup.js, utils.js for both browsers
- No more duplicate code!

### 2. **Browser-Specific Overrides**

- `src/firefox/background.js` - Firefox-specific background script
- `src/firefox/debug.js` - Firefox debugging utilities
- Overrides are used automatically when building for Firefox

### 3. **Automatic API Translation**

- Chrome APIs (`chrome.storage`) → Firefox APIs (`browser.storage`)
- Happens automatically during build
- No manual conversion needed

### 4. **Generated Files**

- **Generated files** (created by build): `content.js`, `popup.js`, `utils.js`, etc.
- **Maintained files** (edited manually): `manifest.json`, `content.css`, `icons/`

## Development Workflow

1. **Edit source files** in `src/`
2. **Run build** with `npm run build`
3. **Test extensions** by loading generated `chrome/` and `firefox/` directories
4. **Repeat** as needed

### Important Notes

- ✅ **Edit code in `src/`** - This is the source of truth
- ❌ **Don't edit generated files** in `chrome/` or `firefox/` - they'll be overwritten
- ✅ **Manually maintain** `manifest.json`, `content.css`, and `icons/`

## Commands Reference

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run build`         | Build both Chrome and Firefox extensions |
| `npm run build:chrome`  | Build only Chrome extension              |
| `npm run build:firefox` | Build only Firefox extension             |
| `npm run clean`         | Remove all generated files               |
| `npm run dev`           | Build both + show loading instructions   |

## File Types

### Generated Files (Don't Edit)

- `content.js` - Main content script
- `popup.js` - Extension popup logic
- `popup.html` - Popup HTML structure
- `background.js` - Background script
- `utils.js` - Shared utilities
- `snarkdown.js` - Markdown library
- `debug.js` (Firefox only)

### Maintained Files (Edit Manually)

- `manifest.json` - Extension manifests (different for each browser)
- `content.css` - Styling (maintained separately)
- `icons/` - Extension icons
- `README.md` - Documentation

## Benefits

✅ **Zero Code Duplication** - Single source of truth  
✅ **Browser API Handling** - Automatic Chrome ↔ Firefox API conversion  
✅ **Maintainable** - Changes in one place affect both browsers  
✅ **Fast Builds** - Simple Node.js script, no complex tooling  
✅ **Flexible** - Easy to add new browsers or customize per-browser logic
