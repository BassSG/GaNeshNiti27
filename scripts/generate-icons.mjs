import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";

const outDir = "public/icons";
const CRC_TABLE = makeCrcTable();

await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/icon-192.png`, createIconPng(192));
await writeFile(`${outDir}/icon-512.png`, createIconPng(512));

console.log("Generated PWA PNG icons.");

function createIconPng(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const t = (x + y) / (width + height);
      const bg = mix([27, 29, 26], [15, 17, 16], t);
      setPixel(raw, offset, bg[0], bg[1], bg[2], 255);
    }
  }

  drawCircle(raw, width, height, width * 0.75, height * 0.26, size * 0.065, [42, 161, 152, 255]);
  drawCircle(raw, width, height, width * 0.5, height * 0.47, size * 0.3, [213, 164, 60, 255]);
  drawCircle(raw, width, height, width * 0.5, height * 0.44, size * 0.235, [242, 212, 123, 255]);
  drawCircle(raw, width, height, width * 0.39, height * 0.49, size * 0.035, [18, 19, 18, 255]);
  drawCircle(raw, width, height, width * 0.61, height * 0.49, size * 0.035, [18, 19, 18, 255]);
  drawArc(raw, width, height, width * 0.5, height * 0.61, size * 0.13, size * 0.055, [18, 19, 18, 255]);
  drawRoundedLine(raw, width, height, width * 0.3, height * 0.78, width * 0.7, height * 0.78, size * 0.055, [248, 248, 245, 245]);

  return pngEncode(width, height, raw);
}

function setPixel(buffer, offset, r, g, b, a) {
  buffer[offset] = r;
  buffer[offset + 1] = g;
  buffer[offset + 2] = b;
  buffer[offset + 3] = a;
}

function mix(a, b, t) {
  return a.map((value, index) => Math.round(value + (b[index] - value) * t));
}

function drawCircle(buffer, width, height, cx, cy, radius, rgba) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  const r2 = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const offset = y * (width * 4 + 1) + 1 + x * 4;
        setPixel(buffer, offset, rgba[0], rgba[1], rgba[2], rgba[3]);
      }
    }
  }
}

function drawArc(buffer, width, height, cx, cy, radius, thickness, rgba) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      const angle = Math.atan2(y - cy, x - cx);
      const distance = Math.hypot(x - cx, y - cy);
      if (angle > 0.2 && angle < 2.95 && Math.abs(distance - radius) < thickness) {
        const offset = y * (width * 4 + 1) + 1 + x * 4;
        setPixel(buffer, offset, rgba[0], rgba[1], rgba[2], rgba[3]);
      }
    }
  }
}

function drawRoundedLine(buffer, width, height, x1, y1, x2, y2, radius, rgba) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x1, x2) + radius));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y1, y2) + radius));
  const length = Math.hypot(x2 - x1, y2 - y1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (length * length)));
      const px = x1 + t * (x2 - x1);
      const py = y1 + t * (y2 - y1);
      if (Math.hypot(x - px, y - py) <= radius) {
        const offset = y * (width * 4 + 1) + 1 + x * 4;
        setPixel(buffer, offset, rgba[0], rgba[1], rgba[2], rgba[3]);
      }
    }
  }
}

function pngEncode(width, height, raw) {
  const chunks = [
    chunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ];
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}
