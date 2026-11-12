export const MAX_HARD_BYTES = 1_000_000_000;
export const MOBILE_WARNING_BYTES = 300_000_000;

export function buildCommand(mode, inputName, outputName) {
  const common = [
    "-hide_banner",
    "-loglevel",
    "info",
    "-fflags",
    "+genpts+discardcorrupt",
    "-err_detect",
    "ignore_err",
    "-i",
    inputName,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
  ];

  if (mode === "remux" || mode === "dlink") {
    return [
      ...common,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "-avoid_negative_ts",
      "make_zero",
      "-y",
      outputName,
    ];
  }

  if (mode === "transcode") {
    return [
      ...common,
      "-vf",
      "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-profile:v",
      "main",
      "-level",
      "4.1",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-avoid_negative_ts",
      "make_zero",
      "-y",
      outputName,
    ];
  }

  throw new Error(`Modo de reparación no reconocido: ${mode}`);
}

export function safeExtension(fileName) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match ? match[1] : "bin";
}

export function outputFileName(originalName) {
  const stem = originalName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9áéíóúüñ_-]+/gi, "-");
  return `${stem || "video"}-reparado.mp4`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), units.length - 1);
  const value = bytes / 1000 ** index;
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: index === 0 ? 0 : 1 })} ${units[index]}`;
}
