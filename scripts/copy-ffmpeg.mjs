import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(root, "public", "vendor");

await mkdir(destination, { recursive: true });

for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(
    resolve(root, "node_modules", "@ffmpeg", "core", "dist", "umd", file),
    resolve(destination, file),
  );
}
