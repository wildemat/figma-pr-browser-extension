# Chrome Web Store Assets

## Screenshots (Ready for Upload)

All screenshots are formatted for Chrome Web Store requirements:

- **Dimensions**: 1280x800 pixels
- **Format**: PNG, 24-bit RGB (no alpha channel)
- **Background**: White

### Current Screenshots

1. **01-before-processing.png** - Shows GitHub PR with raw Figma links before processing
2. **02-after-processing.png** - Shows the same PR with rich design specifications after processing
3. **interface.png** - Shows the extension popup interface

### Additional Screenshots Needed (Optional but Recommended)

To reach the maximum of 5 screenshots, consider adding:

3. **Extension popup** - Show the Figma token configuration interface
4. **Process button in action** - Highlight the "🎨 Process Figma Links" button
5. **Design spec detail view** - Close-up of a single generated design spec

## How to Create Additional Screenshots

1. Take screenshots at any resolution
2. Use ImageMagick to format:
   ```bash
   magick screenshot.png -resize 1280x800 -gravity center -extent 1280x800 -background white -flatten -alpha off store-assets/screenshots/03-description.png
   ```

## Usage

Upload these screenshots to the Chrome Web Store Developer Console in the "Store listing" section. The order suggested:

1. Before processing (shows the problem)
2. After processing (shows the solution)
3. Extension popup (shows setup)
4. Button highlight (shows interaction)
5. Spec detail (shows quality of output)
