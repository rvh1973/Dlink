import test from "node:test";
import assert from "node:assert/strict";
import { buildCommand, formatBytes, outputFileName, safeExtension } from "../src/repair-plan.js";

test("la reparación rápida copia los flujos y crea MP4", () => {
  const command = buildCommand("remux", "entrada.avi", "salida.mp4");
  assert.deepEqual(command.slice(-8), ["-c", "copy", "-movflags", "+faststart", "-avoid_negative_ts", "make_zero", "-y", "salida.mp4"]);
  assert.ok(command.includes("+genpts+discardcorrupt"));
});

test("la conversión produce H.264 y AAC compatible", () => {
  const command = buildCommand("transcode", "entrada.dav", "salida.mp4");
  assert.equal(command[command.indexOf("-c:v") + 1], "libx264");
  assert.equal(command[command.indexOf("-c:a") + 1], "aac");
  assert.match(command[command.indexOf("-vf") + 1], /yuv420p/);
});

test("nombres y tamaños son seguros y comprensibles", () => {
  assert.equal(safeExtension("CAM 01.AVI"), "avi");
  assert.equal(safeExtension("sin-extension"), "bin");
  assert.equal(outputFileName("CAM 01.AVI"), "CAM-01-reparado.mp4");
  assert.match(formatBytes(2_400_000), /2,4 MB/);
});
