const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure public directory exists
const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create crisp SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.15" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0284c7" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)" />

  <!-- Outer Window Blueprint Border -->
  <rect x="76" y="76" width="360" height="360" rx="24" fill="none" stroke="#334155" stroke-width="4" stroke-dasharray="8 8" />

  <!-- Main uPVC Window Frame -->
  <rect x="96" y="96" width="320" height="320" rx="18" fill="#1e293b" stroke="url(#frameGrad)" stroke-width="12" filter="url(#glow)" />

  <!-- Glass Panes -->
  <!-- Top Left Pane -->
  <rect x="116" y="116" width="130" height="130" rx="8" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.6"/>
  <!-- Reflection highlight -->
  <path d="M 120 120 L 220 120 L 120 220 Z" fill="#ffffff" fill-opacity="0.12" />

  <!-- Top Right Pane -->
  <rect x="266" y="116" width="130" height="130" rx="8" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.6"/>
  <path d="M 270 120 L 370 120 L 270 220 Z" fill="#ffffff" fill-opacity="0.12" />

  <!-- Bottom Left Pane -->
  <rect x="116" y="266" width="130" height="130" rx="8" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.6"/>
  <path d="M 120 270 L 220 270 L 120 370 Z" fill="#ffffff" fill-opacity="0.12" />

  <!-- Bottom Right Pane -->
  <rect x="266" y="266" width="130" height="130" rx="8" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.6"/>
  <path d="M 270 270 L 370 270 L 270 370 Z" fill="#ffffff" fill-opacity="0.12" />

  <!-- Vertical Mullion Profile -->
  <rect x="246" y="96" width="20" height="320" fill="#38bdf8" rx="3"/>
  <!-- Horizontal Transom Profile -->
  <rect x="96" y="246" width="320" height="20" fill="#38bdf8" rx="3"/>

  <!-- Center Cross Joint Badge -->
  <circle cx="256" cy="256" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="3" />

  <!-- Dimension Indicator Tag at Top -->
  <g transform="translate(180, 52)">
    <rect width="152" height="32" rx="16" fill="#0284c7" />
    <text x="76" y="21" font-family="monospace" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">uPVC CAD</text>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');

// Function to encode pure uncompressed RGBA into a valid PNG
function createPngBuffer(width, height, drawFn) {
  // Simple PNG encoder
  // 1. Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Helper to create chunk
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    
    // CRC calculation
    const payload = Buffer.concat([typeBuf, data]);
    const crc = crc32(payload);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, payload, crcBuf]);
  }

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type: 6 (RGBA)
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  // Raw image data with filter byte (0) per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * scanlineLength;
    rawData[lineOffset] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 4;
      const rgba = drawFn(x, y, width, height);
      rawData[pixelOffset] = rgba[0];
      rawData[pixelOffset + 1] = rgba[1];
      rawData[pixelOffset + 2] = rgba[2];
      rawData[pixelOffset + 3] = rgba[3];
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw pixel function for uPVC app icon
function drawAppIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background deep navy blue #0f172a
  let r = 15, g = 23, b = 42, a = 255;

  // Gradient in background
  r = Math.min(255, Math.floor(15 + nx * 10 + ny * 20));
  g = Math.min(255, Math.floor(23 + nx * 15 + ny * 25));
  b = Math.min(255, Math.floor(42 + nx * 30 + ny * 45));

  // If not maskable, rounded rect corner radius
  if (!isMaskable) {
    const rad = w * 0.18;
    const dx = Math.max(rad - x, 0, x - (w - rad));
    const dy = Math.max(rad - y, 0, y - (h - rad));
    if (dx * dx + dy * dy > rad * rad) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
  }

  // Window frame area in safe zone (20% to 80%)
  const minX = w * 0.20, maxX = w * 0.80;
  const minY = h * 0.20, maxY = h * 0.80;
  const border = w * 0.045;

  if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
    // Outer frame border (uPVC cyan / electric blue #0284c7 to #38bdf8)
    const isFrame = (
      x < minX + border || x > maxX - border ||
      y < minY + border || y > maxY - border ||
      // Mullion & Transom
      Math.abs(x - w * 0.5) < border * 0.4 ||
      Math.abs(y - h * 0.5) < border * 0.4
    );

    if (isFrame) {
      r = 56; g = 189; b = 248; // #38bdf8 cyan/sky blue
      // Bevel effect
      if (x < minX + border * 0.4 || y < minY + border * 0.4) {
        r = 186; g = 230; b = 253; // highlight
      }
    } else {
      // Glass pane with soft reflection
      r = 30; g = 60; b = 100;
      // diagonal light streak
      const diag = (x - minX) + (y - minY);
      if (Math.abs(diag - (maxX - minX) * 0.4) < w * 0.08) {
        r += 50; g += 80; b += 120;
      }
    }
  }

  return [r, g, b, a];
}

console.log('Generating PWA icons...');
const icon192 = createPngBuffer(192, 192, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPngBuffer(512, 512, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const iconMaskable = createPngBuffer(512, 512, (x, y, w, h) => drawAppIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);

const appleTouchIcon = createPngBuffer(180, 180, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

// Favicon 32x32
const favicon32 = createPngBuffer(32, 32, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);

console.log('PWA PNG & SVG icons successfully created!');
