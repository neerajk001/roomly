import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Neeraj/Downloads/roomly/packages/storage/node_modules/sharp");

const out = new URL("../../apps/web/public/demo/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
fs.mkdirSync(out, { recursive: true });

const rooms = [
  { name: "living", before: ["#e8e2d8", "#cbbfa9"], after: ["#dfe3d8", "#7f8f6f"], furniture: "#6b5b45" },
  { name: "bedroom", before: ["#e6e2dd", "#c9c2b8"], after: ["#e9e4dc", "#8a7b6a"], furniture: "#5f4b3a" },
  { name: "kitchen", before: ["#e9e6e0", "#ccc7bf"], after: ["#f0ece4", "#9aa88f"], furniture: "#7a5c3f" },
  { name: "office", before: ["#e4e0da", "#c3beb4"], after: ["#e7e9e2", "#6f7d6c"], furniture: "#5a4a3c" },
  { name: "dining", before: ["#e8e4de", "#c8c0b2"], after: ["#efe9df", "#8b6f52"], furniture: "#6d4f36" },
  { name: "bath", before: ["#e8eaea", "#c6ccca"], after: ["#eef1ee", "#8fa39b"], furniture: "#6c7a74" },
];

for (const [index, room] of rooms.entries()) {
  for (const variant of ["before", "after"]) {
    const colors = variant === "before" ? room.before : room.after;
    const furniture = variant === "before" ? "#b9ac97" : room.furniture;
    const svg = `
      <svg width="960" height="640" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${colors[0]}"/>
            <stop offset="100%" stop-color="${colors[1]}"/>
          </linearGradient>
        </defs>
        <rect width="960" height="640" fill="url(#g)"/>
        <rect x="0" y="430" width="960" height="210" fill="#b7a993" opacity="0.55"/>
        <rect x="70" y="120" width="250" height="310" rx="6" fill="#ffffff" opacity="0.35"/>
        <rect x="640" y="120" width="240" height="310" rx="6" fill="#ffffff" opacity="0.28"/>
        ${variant === "after" ? `<rect x="330" y="360" width="300" height="120" rx="18" fill="${furniture}" opacity="0.85"/><rect x="360" y="330" width="240" height="60" rx="14" fill="${furniture}" opacity="0.5"/>` : `<rect x="380" y="380" width="160" height="100" rx="4" fill="${furniture}" opacity="0.35"/>`}
        <circle cx="520" cy="90" r="34" fill="#ffffff" opacity="0.4"/>
        <text x="24" y="616" font-family="Arial" font-size="20" fill="#4b5563" opacity="0.8">${variant === "before" ? "Before" : "Concept visual"}</text>
      </svg>`;
    const target = `${out}${room.name}-${variant}.jpg`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(target);
  }
}
process.stdout.write(`wrote ${String(rooms.length * 2)} demo images\n`);
