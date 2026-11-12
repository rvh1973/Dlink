import { FFmpeg } from "@ffmpeg/ffmpeg";
import { buildCommand, outputFileName, safeExtension } from "./repair-plan.js";

export class VideoEngine {
  constructor({ onLog, onProgress, onStage } = {}) {
    this.onLog = onLog || (() => {});
    this.onProgress = onProgress || (() => {});
    this.onStage = onStage || (() => {});
    this.ffmpeg = null;
    this.loaded = false;
    this.cancelled = false;
    this.logs = [];
  }

  async load() {
    if (this.loaded) return;
    if (!("WebAssembly" in window) || !("Worker" in window)) {
      throw new Error("Este navegador no permite ejecutar el motor de vídeo. Actualiza Safari e inténtalo de nuevo.");
    }

    this.onStage("loading");
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on("log", ({ message }) => {
      this.logs.push(message);
      if (this.logs.length > 180) this.logs.shift();
      this.onLog(message);
    });
    this.ffmpeg.on("progress", ({ progress }) => {
      if (Number.isFinite(progress)) this.onProgress(Math.max(0, Math.min(1, progress)));
    });

    const base = import.meta.env.BASE_URL;
    const coreURL = new URL(`${base}vendor/ffmpeg-core.js?v=esm-1`, window.location.origin).href;
    const wasmURL = new URL(`${base}vendor/ffmpeg-core.wasm?v=esm-1`, window.location.origin).href;
    try {
      await this.ffmpeg.load({ coreURL, wasmURL });
      this.loaded = true;
    } catch (error) {
      this.ffmpeg?.terminate();
      this.ffmpeg = null;
      this.loaded = false;
      const detail = describeRuntimeError(error);
      throw new Error(`No se pudo iniciar el motor de vídeo. Recarga la página e inténtalo de nuevo. Detalle: ${detail}`);
    }
  }

  async process(file, mode) {
    this.cancelled = false;
    this.logs = [];
    await this.load();
    if (this.cancelled) throw new DOMException("Proceso cancelado", "AbortError");

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const inputName = `entrada-${id}.${safeExtension(file.name)}`;
    const outputName = `salida-${id}.mp4`;

    try {
      this.onStage("copying");
      await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
      if (this.cancelled) throw new DOMException("Proceso cancelado", "AbortError");

      this.onStage(mode === "remux" ? "repairing" : "converting");
      const exitCode = await this.ffmpeg.exec(buildCommand(mode, inputName, outputName));
      if (exitCode !== 0) {
        throw new Error(this.failureMessage(mode));
      }

      this.onStage("reading");
      const data = await this.ffmpeg.readFile(outputName);
      if (!(data instanceof Uint8Array) || data.byteLength === 0) {
        throw new Error("El motor terminó, pero no generó una copia utilizable.");
      }

      return {
        blob: new Blob([data], { type: "video/mp4" }),
        fileName: outputFileName(file.name),
        logs: [...this.logs],
      };
    } finally {
      if (this.loaded && this.ffmpeg) {
        await Promise.allSettled([
          this.ffmpeg.deleteFile(inputName),
          this.ffmpeg.deleteFile(outputName),
        ]);
      }
    }
  }

  failureMessage(mode) {
    const tail = this.logs.slice(-30).join("\n").toLowerCase();
    if (tail.includes("invalid data") || tail.includes("could not find codec parameters")) {
      return "El archivo está demasiado dañado o su formato no se reconoce. Conserva el original: esta herramienta no puede reconstruir datos ausentes.";
    }
    if (tail.includes("out of memory") || tail.includes("memory access out of bounds")) {
      return "El dispositivo se quedó sin memoria. Prueba con un vídeo más corto o usa un ordenador con más memoria.";
    }
    if (mode === "remux" || mode === "dlink") {
      return "La reparación rápida no es compatible con el formato interno de este vídeo. Prueba «Compatibilidad iPad», que convierte la imagen y el sonido.";
    }
    return "No se pudo convertir la grabación. Consulta los detalles técnicos o prueba con una copia más corta del archivo original.";
  }

  cancel() {
    this.cancelled = true;
    if (this.ffmpeg) this.ffmpeg.terminate();
    this.ffmpeg = null;
    this.loaded = false;
  }
}

function describeRuntimeError(error) {
  if (error instanceof Error && error.message) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const type = "type" in error ? String(error.type) : "evento desconocido";
    const target = "target" in error && error.target && "src" in error.target ? String(error.target.src) : "";
    return target ? `${type} (${target})` : type;
  }
  return String(error);
}
