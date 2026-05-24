#!/usr/bin/env node
// scripts/generate-icons.js
// Génère les icônes PWA depuis le SVG source
// Usage: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0A0A0F"/>
  <text x="256" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="220" font-weight="bold" fill="#F59E0B">S</text>
  <rect x="100" y="340" width="312" height="40" rx="8" fill="#F59E0B" opacity="0.3"/>
</svg>`;

console.log("SVG source prêt — utilisez un outil comme sharp ou jimp pour générer les PNG");
console.log("Sizes nécessaires: 72, 96, 128, 144, 152, 192, 384, 512");

// Pour générer les icônes en production, installer sharp:
// npm install sharp
// Puis utiliser:
// const sharp = require("sharp");
// const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
// sizes.forEach(size => {
//   sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/icon-\${size}.png`);
// });
