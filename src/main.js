import "./styles.css";
import { VideoEngine } from "./video-engine.js";
import { formatBytes, MAX_HARD_BYTES, MOBILE_WARNING_BYTES } from "./repair-plan.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  input: $("#file-input"),
  choose: $("#choose-button"),
  dropZone: $("#drop-zone"),
  fileCard: $("#file-card"),
  fileName: $("#file-name"),
  fileMeta: $("#file-meta"),
  changeFile: $("#change-file"),
  modePicker: $("#mode-picker"),
  repair: $("#repair-button"),
  actionHint: $("#action-hint"),
  progressPanel: $("#progress-panel"),
  progressTitle: $("#progress-title"),
  progressPercent: $("#progress-percent"),
  progressTrack: $("#progress-track"),
  progressBar: $("#progress-bar"),
  progressDetail: $("#progress-detail"),
  cancel: $("#cancel-button"),
  errorPanel: $("#error-panel"),
  errorMessage: $("#error-message"),
  errorLog: $("#error-log"),
  retry: $("#retry-button"),
  resultPanel: $("#result-panel"),
  resultVideo: $("#result-video"),
  resultMeta: $("#result-meta"),
  download: $("#download-button"),
  share: $("#share-button"),
  startOver: $("#start-over"),
};

let selectedFile = null;
let resultURL = null;
let shareFile = null;
let running = false;
let latestProgress = 0;

const engine = new VideoEngine({
  onProgress(value) {
    latestProgress = Math.max(latestProgress, value);
    setProgress(latestProgress * 100);
  },
  onStage(stage) {
    const stages = {
      loading: ["Cargando el motor de vídeo…", "La primera carga descarga unos 31 MB."],
      copying: ["Leyendo la grabación…", "El archivo permanece en este dispositivo."],
      repairing: ["Reconstruyendo el vídeo…", "Se conservan la imagen y el sonido originales."],
      converting: ["Convirtiendo para iPad…", "Puede tardar bastante; mantén Safari abierto."],
      reading: ["Preparando la copia…", "Ya casi está."],
    };
    const [title, detail] = stages[stage];
    elements.progressTitle.textContent = title;
    elements.progressDetail.textContent = detail;
    if (stage === "loading") setIndeterminate(true);
    else setIndeterminate(false);
  },
});

function setProgress(percent) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  elements.progressBar.style.width = `${safe}%`;
  elements.progressPercent.textContent = safe ? `${safe}%` : "";
  elements.progressTrack.setAttribute("aria-valuenow", String(safe));
}

function setIndeterminate(active) {
  elements.progressTrack.classList.toggle("indeterminate", active);
  if (active) {
    elements.progressTrack.removeAttribute("aria-valuenow");
    elements.progressPercent.textContent = "";
  } else {
    elements.progressTrack.setAttribute("aria-valuenow", String(Math.round(latestProgress * 100)));
  }
}

function setFile(file) {
  clearResult();
  hideError();
  if (!file) return;

  if (file.size > MAX_HARD_BYTES) {
    showError("Este archivo supera 1 GB, el límite práctico del motor en el navegador. No se ha cargado.");
    return;
  }

  selectedFile = file;
  elements.fileName.textContent = file.name;
  const notes = [formatBytes(file.size)];
  if (file.type) notes.push(file.type);
  if (file.size > MOBILE_WARNING_BYTES) notes.push("puede agotar la memoria del iPad");
  elements.fileMeta.textContent = notes.join(" · ");
  elements.dropZone.hidden = true;
  elements.fileCard.hidden = false;
  elements.modePicker.disabled = false;
  elements.repair.disabled = false;
  elements.actionHint.textContent = file.size > MOBILE_WARNING_BYTES
    ? "Es un archivo grande. Cierra otras pestañas y conserva el original."
    : "El motor de vídeo (aprox. 31 MB) se carga al empezar.";
}

function clearFile() {
  selectedFile = null;
  elements.input.value = "";
  elements.dropZone.hidden = false;
  elements.fileCard.hidden = true;
  elements.modePicker.disabled = true;
  elements.repair.disabled = true;
  clearResult();
  hideError();
}

function showError(message, logs = []) {
  elements.errorMessage.textContent = message;
  elements.errorLog.textContent = logs.join("\n") || "No hay más detalles disponibles.";
  elements.errorPanel.hidden = false;
  elements.errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  elements.errorPanel.hidden = true;
  elements.errorMessage.textContent = "";
  elements.errorLog.textContent = "";
}

function clearResult() {
  if (resultURL) URL.revokeObjectURL(resultURL);
  resultURL = null;
  shareFile = null;
  elements.resultVideo.removeAttribute("src");
  elements.resultVideo.load();
  elements.download.removeAttribute("href");
  elements.resultPanel.hidden = true;
  elements.share.hidden = true;
}

async function runRepair() {
  if (!selectedFile || running) return;
  running = true;
  hideError();
  clearResult();
  latestProgress = 0;
  setProgress(0);
  elements.progressPanel.hidden = false;
  elements.repair.disabled = true;
  elements.modePicker.disabled = true;
  const mode = document.querySelector('input[name="mode"]:checked').value;

  try {
    const result = await engine.process(selectedFile, mode);
    resultURL = URL.createObjectURL(result.blob);
    shareFile = new File([result.blob], result.fileName, { type: "video/mp4" });
    elements.resultVideo.src = resultURL;
    elements.download.href = resultURL;
    elements.download.download = result.fileName;
    elements.resultMeta.textContent = `${result.fileName} · ${formatBytes(result.blob.size)}`;
    if (navigator.canShare?.({ files: [shareFile] })) elements.share.hidden = false;
    elements.resultPanel.hidden = false;
    elements.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Fallo al procesar el vídeo", error);
      const message = error?.message || (typeof error === "string" ? error : "No se pudo procesar el vídeo.");
      showError(message, engine.logs || []);
    }
  } finally {
    running = false;
    elements.progressPanel.hidden = true;
    elements.repair.disabled = !selectedFile;
    elements.modePicker.disabled = !selectedFile;
  }
}

elements.choose.addEventListener("click", () => elements.input.click());
elements.dropZone.addEventListener("click", (event) => {
  if (event.target !== elements.choose) elements.input.click();
});
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") elements.input.click();
});
elements.dropZone.tabIndex = 0;
elements.input.addEventListener("change", () => setFile(elements.input.files?.[0]));
elements.changeFile.addEventListener("click", () => elements.input.click());
elements.repair.addEventListener("click", runRepair);
elements.retry.addEventListener("click", runRepair);
elements.cancel.addEventListener("click", () => {
  engine.cancel();
  running = false;
  elements.progressPanel.hidden = true;
  elements.repair.disabled = false;
  elements.modePicker.disabled = false;
});
elements.startOver.addEventListener("click", clearFile);
elements.share.addEventListener("click", async () => {
  if (!shareFile) return;
  try {
    await navigator.share({ files: [shareFile], title: "Vídeo reparado" });
  } catch (error) {
    if (error?.name !== "AbortError") showError("Safari no pudo abrir el menú para compartir. Usa «Guardar vídeo».");
  }
});

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
}
elements.dropZone.addEventListener("drop", (event) => setFile(event.dataTransfer?.files?.[0]));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
