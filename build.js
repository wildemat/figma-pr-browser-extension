#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Clean build directory
console.log("🧹 Cleaning build directory...");
if (fs.existsSync("build/chrome")) {
  fs.rmSync("build/chrome", { recursive: true });
}
if (fs.existsSync("build/firefox")) {
  fs.rmSync("build/firefox", { recursive: true });
}
if (fs.existsSync("build/releases")) {
  fs.rmSync("build/releases", { recursive: true });
}

fs.mkdirSync("build/chrome", { recursive: true });
fs.mkdirSync("build/firefox", { recursive: true });
fs.mkdirSync("build/releases", { recursive: true });

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });
  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf8");

  for (const [search, replace] of replacements) {
    content = content.replace(new RegExp(search, "g"), replace);
  }

  fs.writeFileSync(filePath, content, "utf8");
}

function buildExtension(browser) {
  console.log(`🔨 Building ${browser} extension...`);

  const buildDir = `build/${browser}`;

  // Copy shared files
  copyFile("src/shared/content.js", `${buildDir}/content.js`);
  copyFile("src/shared/popup.js", `${buildDir}/popup.js`);
  copyFile("src/shared/popup.html", `${buildDir}/popup.html`);
  copyFile("src/shared/utils.js", `${buildDir}/utils.js`);
  copyFile("src/shared/snarkdown.js", `${buildDir}/snarkdown.js`);

  // Copy browser-specific files
  copyFile(`src/${browser}/manifest.json`, `${buildDir}/manifest.json`);

  if (browser === "chrome") {
    copyFile("src/shared/background-chrome.js", `${buildDir}/background.js`);

    // Replace browser API calls for Chrome
    replaceInFile(`${buildDir}/popup.js`, [["browser\\.", "chrome."]]);
    replaceInFile(`${buildDir}/content.js`, [["browser\\.", "chrome."]]);
  } else {
    copyFile("src/shared/background-firefox.js", `${buildDir}/background.js`);
    copyFile("src/shared/debug-firefox.js", `${buildDir}/debug.js`);

    // Replace browser API calls for Firefox
    replaceInFile(`${buildDir}/popup.js`, [["chrome\\.", "browser."]]);
    replaceInFile(`${buildDir}/content.js`, [["chrome\\.", "browser."]]);
  }

  // Copy static assets
  copyDirectory("src/icons", `${buildDir}/icons`);
  copyFile("src/content.css", `${buildDir}/content.css`);

  console.log(`  ✅ ${browser} extension built successfully`);

  // Create zip file
  console.log(`📦 Creating ${browser} zip file...`);
  try {
    process.chdir(buildDir);
    execSync(`zip -r ../releases/figma-pr-extension-${browser}.zip .`, {
      stdio: "inherit",
    });
    process.chdir("../..");
    console.log(
      `  ✅ Created build/releases/figma-pr-extension-${browser}.zip`,
    );
  } catch (error) {
    console.error(`  ❌ Failed to create zip for ${browser}:`, error.message);
    process.chdir("../..");
  }
}

// Build both extensions
console.log("🚀 Building extensions...");
buildExtension("chrome");
buildExtension("firefox");

console.log("✅ Build complete!");
console.log("\n📦 Distribution files:");
console.log("   build/releases/figma-pr-extension-chrome.zip");
console.log("   build/releases/figma-pr-extension-firefox.zip");
console.log("\n🧑‍💻 Development testing:");
console.log(
  "   Chrome: chrome://extensions/ → Load unpacked → select build/chrome/ folder",
);
console.log(
  "   Firefox: about:debugging → Load Temporary Add-on → select build/firefox/manifest.json",
);
