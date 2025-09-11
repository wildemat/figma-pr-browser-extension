#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, "utf8");

  for (const [search, replace] of replacements) {
    content = content.replace(new RegExp(search, "g"), replace);
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// Clean and create build directories
console.log("🧹 Cleaning and setting up build directories...");
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

// Build Chrome extension
console.log("🔨 Building Chrome extension...");
copyFile("build/src/popup/popup.html", "build/chrome/popup.html");
copyFile("build/content.js", "build/chrome/content.js");
copyFile("build/background.js", "build/chrome/background.js");
copyFile("build/popup.js", "build/chrome/popup.js");
copyFile("src/chrome/manifest.json", "build/chrome/manifest.json");
copyDirectory("src/icons", "build/chrome/icons");

// Copy CSS files if they exist
if (fs.existsSync("build/popup.css")) {
  copyFile("build/popup.css", "build/chrome/popup.css");
}
if (fs.existsSync("src/content.css")) {
  copyFile("src/content.css", "build/chrome/content.css");
}

// Replace browser API calls for Chrome
replaceInFile("build/chrome/content.js", [["browser\\.", "chrome."]]);
replaceInFile("build/chrome/background.js", [["browser\\.", "chrome."]]);

// Build Firefox extension
console.log("🔨 Building Firefox extension...");
copyFile("build/src/popup/popup.html", "build/firefox/popup.html");
copyFile("build/content.js", "build/firefox/content.js");
copyFile("build/background.js", "build/firefox/background.js");
copyFile("build/popup.js", "build/firefox/popup.js");
copyFile("src/firefox/manifest.json", "build/firefox/manifest.json");
copyDirectory("src/icons", "build/firefox/icons");

// Copy CSS files if they exist
if (fs.existsSync("build/popup.css")) {
  copyFile("build/popup.css", "build/firefox/popup.css");
}
if (fs.existsSync("src/content.css")) {
  copyFile("src/content.css", "build/firefox/content.css");
}

// Replace browser API calls for Firefox
replaceInFile("build/firefox/content.js", [["chrome\\.", "browser."]]);
replaceInFile("build/firefox/background.js", [["chrome\\.", "browser."]]);

console.log("✅ Post-build processing complete!");
