#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ExtensionBuilder {
  constructor() {
    this.srcDir = 'src';
    this.distDirs = ['chrome', 'firefox'];
    this.sharedFiles = ['content.js', 'popup.js', 'popup.html', 'utils.js'];
    this.libraryFiles = ['snarkdown.js'];
    this.browserSpecificFiles = ['background.js'];
  }

  // Clean build directories
  clean() {
    console.log('🧹 Cleaning build directories...');
    
    for (const distDir of this.distDirs) {
      if (fs.existsSync(distDir)) {
        // Remove generated files but keep browser-specific files
        const filesToRemove = [
          ...this.sharedFiles,
          ...this.libraryFiles,
          ...this.browserSpecificFiles
        ];
        
        filesToRemove.forEach(file => {
          const filePath = path.join(distDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`  ✓ Removed ${filePath}`);
          }
        });
      }
    }
  }

  // Transform code for specific browser
  transformForBrowser(content, browser) {
    let transformed = content;

    if (browser === 'firefox') {
      // Convert Chrome APIs to Firefox APIs
      transformed = transformed
        .replace(/chrome\.storage/g, 'browser.storage')
        .replace(/chrome\.runtime/g, 'browser.runtime')
        .replace(/chrome\.tabs/g, 'browser.tabs')
        .replace(/chrome\.scripting/g, 'browser.scripting');
    }

    return transformed;
  }

  // Copy and transform a file for a specific browser
  copyFile(srcPath, distPath, browser) {
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Warning: Source file ${srcPath} not found`);
      return;
    }

    const content = fs.readFileSync(srcPath, 'utf8');
    const transformed = this.transformForBrowser(content, browser);
    
    // Ensure directory exists
    const dir = path.dirname(distPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(distPath, transformed);
    console.log(`  ✓ ${srcPath} → ${distPath}`);
  }

  // Build for a specific browser
  buildBrowser(browser) {
    console.log(`🔨 Building ${browser} extension...`);
    
    const distDir = browser;
    
    // Ensure dist directory exists
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Copy shared JavaScript files
    [...this.sharedFiles, ...this.libraryFiles].forEach(file => {
      const srcPath = path.join(this.srcDir, file);
      const distPath = path.join(distDir, file);
      this.copyFile(srcPath, distPath, browser);
    });

    // Copy browser-specific files
    this.browserSpecificFiles.forEach(file => {
      // Try browser-specific version first
      const browserSpecificPath = path.join(this.srcDir, browser, file);
      const sharedPath = path.join(this.srcDir, file);
      const distPath = path.join(distDir, file);
      
      if (fs.existsSync(browserSpecificPath)) {
        this.copyFile(browserSpecificPath, distPath, browser);
      } else if (fs.existsSync(sharedPath)) {
        this.copyFile(sharedPath, distPath, browser);
      }
    });

    // Copy any other browser-specific files
    const browserSrcDir = path.join(this.srcDir, browser);
    if (fs.existsSync(browserSrcDir)) {
      const files = fs.readdirSync(browserSrcDir);
      files.forEach(file => {
        // Skip files we already handled
        if (!this.browserSpecificFiles.includes(file)) {
          const srcPath = path.join(browserSrcDir, file);
          const distPath = path.join(distDir, file);
          this.copyFile(srcPath, distPath, browser);
        }
      });
    }

    // Update manifest.json to include correct files
    this.updateManifest(browser);
  }

  // Update manifest.json with correct script order
  updateManifest(browser) {
    const manifestPath = path.join(browser, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      console.log(`⚠️  Warning: Manifest ${manifestPath} not found`);
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Update content scripts
    if (manifest.content_scripts && manifest.content_scripts[0]) {
      const scripts = ['snarkdown.js', 'utils.js'];
      
      // Add debug.js for Firefox
      if (browser === 'firefox') {
        scripts.unshift('debug.js');
      }
      
      // Add main content script
      scripts.push('content.js');
      
      manifest.content_scripts[0].js = scripts;
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  ✓ Updated ${manifestPath}`);
  }

  // Build all browsers
  buildAll() {
    console.log('🚀 Building all extensions...\n');
    
    for (const browser of this.distDirs) {
      this.buildBrowser(browser);
      console.log('');
    }
    
    console.log('✅ Build complete! Extensions are ready in chrome/ and firefox/ directories.');
    console.log('\n📦 Load the extensions:');
    console.log('   Chrome: chrome://extensions/ → Load unpacked → select chrome/ folder');
    console.log('   Firefox: about:debugging → Load Temporary Add-on → select firefox/manifest.json');
  }
}

// Main execution
const builder = new ExtensionBuilder();
const command = process.argv[2];

switch (command) {
  case 'clean':
    builder.clean();
    break;
  case 'chrome':
    builder.buildBrowser('chrome');
    break;
  case 'firefox':
    builder.buildBrowser('firefox');
    break;
  case undefined:
  case 'all':
    builder.buildAll();
    break;
  default:
    console.log('Usage: node build.js [chrome|firefox|clean|all]');
    process.exit(1);
}