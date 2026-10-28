// One-off fixture generator for E2E tests (output is committed).
// Run: node tests/e2e/fixtures/make-fixture.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("../../../packages/storage/node_modules/sharp");

await sharp({
  create: { width: 960, height: 720, channels: 3, background: { r: 196, g: 186, b: 172 } },
})
  .composite([
    {
      input: Buffer.from(
        `<svg width="960" height="720" xmlns="http://www.w3.org/2000/svg">
          <rect x="80" y="420" width="360" height="180" rx="12" fill="#7c6a55"/>
          <rect x="560" y="180" width="240" height="220" rx="8" fill="#d9d2c5"/>
          <circle cx="680" cy="120" r="48" fill="#efe9dd"/>
        </svg>`,
      ),
      top: 0,
      left: 0,
    },
  ])
  .jpeg({ quality: 82 })
  .toFile(new URL("./room.jpg", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
process.stdout.write("wrote tests/e2e/fixtures/room.jpg\n");
