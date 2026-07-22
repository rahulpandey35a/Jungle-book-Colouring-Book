// ---------- Config ----------
const TOTAL_PAGES = 40; // matches the 40 jungle-book pages in /images
const PALETTE = [
  "#E63946", "#F4845F", "#F4A261", "#E9C46A", "#FFD166",
  "#8AC926", "#52B788", "#2A9D8F", "#457B9D", "#4361EE",
  "#7209B7", "#B5179E", "#F72585", "#FFFFFF", "#6B4226",
  "#2D2A26"
];

let pages = [];          // [{num, src}]
let currentPage = null;  // {num, src}
let ctx, canvas;
let tool = "fill";
let selectedColor = PALETTE[0];
let brushSize = 16;
let undoStack = [];
let drawing = false;
let lastPt = null;

const galleryGrid = document.getElementById("gallery-grid");
const emptyMsg = document.getElementById("empty-msg");
const galleryView = document.getElementById("gallery-view");
const colorView = document.getElementById("color-view");
const pageLabel = document.getElementById("page-label");
const toast = document.getElementById("toast");

// ---------- Init ----------
init();

async function init() {
  await buildGallery();
  buildPalette();
  wireControls();
  registerServiceWorker();
}

// ---------- Gallery ----------
async function buildGallery() {
  const checks = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    const num = String(i).padStart(3, "0");
    const src = `images/page-${num}.png`;
    checks.push(imageExists(src).then(ok => ok ? { num: i, src } : null));
  }
  const results = await Promise.all(checks);
  pages = results.filter(Boolean);

  if (pages.length === 0) {
    emptyMsg.hidden = false;
    return;
  }

  const frag = document.createDocumentFragment();
  pages.forEach(p => {
    const card = document.createElement("div");
    card.className = "page-card";
    card.dataset.num = p.num;
    if (localStorage.getItem(saveKey(p.num))) card.classList.add("done");

    const img = document.createElement("img");
    img.src = localStorage.getItem(saveKey(p.num)) || p.src;
    img.loading = "lazy";
    img.alt = `Jungle page ${p.num}`;

    const label = document.createElement("div");
    label.className = "num";
    label.textContent = `Page ${p.num}`;

    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener("click", () => openPage(p));
    frag.appendChild(card);
  });
  galleryGrid.appendChild(frag);
}

function imageExists(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

function saveKey(num) {
  return `jungle-color-page-${num}`;
}

// ---------- Colouring view ----------
function openPage(p) {
  currentPage = p;
  pageLabel.textContent = `Page ${p.num}`;
  galleryView.classList.remove("active");
  colorView.classList.add("active");

  canvas = document.getElementById("draw-canvas");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  undoStack = [];

  const saved = localStorage.getItem(saveKey(p.num));
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    pushUndo();
  };
  img.src = saved || p.src;
}

function closePage() {
  colorView.classList.remove("active");
  galleryView.classList.add("active");
  // refresh thumbnail + done badge for the page we just left
  if (currentPage) {
    const card = galleryGrid.querySelector(`.page-card[data-num="${currentPage.num}"]`);
    const saved = localStorage.getItem(saveKey(currentPage.num));
    if (card && saved) {
      card.querySelector("img").src = saved;
      card.classList.add("done");
    }
  }
}

// ---------- Drawing ----------
function pushUndo() {
  try {
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 15) undoStack.shift();
  } catch (e) { /* ignore */ }
}

function undo() {
  if (undoStack.length < 2) return;
  undoStack.pop();
  const prev = undoStack[undoStack.length - 1];
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = prev;
}

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = evt.clientX ?? (evt.touches && evt.touches[0].clientX);
  const clientY = evt.clientY ?? (evt.touches && evt.touches[0].clientY);
  return {
    x: Math.floor((clientX - rect.left) * scaleX),
    y: Math.floor((clientY - rect.top) * scaleY)
  };
}

function hexToRGBA(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 255];
}

// Scanline flood fill with tolerance, stops at dark outline pixels
function floodFill(startX, startY, fillColor) {
  const w = canvas.width, h = canvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const idx = (x, y) => (y * w + x) * 4;

  const startIdx = idx(startX, startY);
  const startR = data[startIdx], startG = data[startIdx + 1],
        startB = data[startIdx + 2], startA = data[startIdx + 3];

  // Don't fill onto a black/dark outline
  const brightness = (startR + startG + startB) / 3;
  if (brightness < 60) return;

  const [fr, fg, fb, fa] = fillColor;
  if (Math.abs(startR - fr) < 10 && Math.abs(startG - fg) < 10 &&
      Math.abs(startB - fb) < 10) return; // already this colour

  const tolerance = 48;
  const matches = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const bright = (r + g + b) / 3;
    if (bright < 60) return false; // outline barrier
    return Math.abs(r - startR) <= tolerance &&
           Math.abs(g - startG) <= tolerance &&
           Math.abs(b - startB) <= tolerance &&
           Math.abs(a - startA) <= tolerance;
  };

  const stack = [[startX, startY]];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    let [x, y] = stack.pop();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (visited[y * w + x]) continue;

    // find left/right bounds of this scanline
    let xl = x;
    while (xl >= 0 && matches(xl, y) && !visited[y * w + xl]) xl--;
    xl++;
    let xr = x;
    while (xr < w && matches(xr, y) && !visited[y * w + xr]) xr++;
    xr--;

    let spanAbove = false, spanBelow = false;
    for (let xi = xl; xi <= xr; xi++) {
      const i = idx(xi, y);
      data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
      visited[y * w + xi] = 1;

      if (y > 0) {
        const above = matches(xi, y - 1) && !visited[(y - 1) * w + xi];
        if (above && !spanAbove) { stack.push([xi, y - 1]); spanAbove = true; }
        else if (!above) spanAbove = false;
      }
      if (y < h - 1) {
        const below = matches(xi, y + 1) && !visited[(y + 1) * w + xi];
        if (below && !spanBelow) { stack.push([xi, y + 1]); spanBelow = true; }
        else if (!below) spanBelow = false;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function brushStroke(x, y) {
  ctx.fillStyle = selectedColor;
  ctx.beginPath();
  ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
}

function brushLine(from, to) {
  ctx.strokeStyle = selectedColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

// ---------- Controls ----------
function buildPalette() {
  const palette = document.getElementById("palette");
  PALETTE.forEach((hex, i) => {
    const sw = document.createElement("button");
    sw.className = "swatch" + (i === 0 ? " selected" : "");
    sw.style.background = hex;
    sw.setAttribute("aria-label", `Colour ${hex}`);
    sw.addEventListener("click", () => {
      document.querySelectorAll(".swatch.selected").forEach(s => s.classList.remove("selected"));
      sw.classList.add("selected");
      selectedColor = hex;
    });
    palette.appendChild(sw);
  });
}

function wireControls() {
  document.getElementById("back-btn").addEventListener("click", closePage);

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!currentPage) return;
    if (!confirm("Clear all colours on this page?")) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      pushUndo();
    };
    img.src = currentPage.src;
  });

  const fillBtn = document.getElementById("fill-tool");
  const brushBtn = document.getElementById("brush-tool");
  const brushWrap = document.getElementById("brush-size-wrap");

  fillBtn.addEventListener("click", () => {
    tool = "fill";
    fillBtn.classList.add("active");
    brushBtn.classList.remove("active");
    brushWrap.hidden = true;
  });
  brushBtn.addEventListener("click", () => {
    tool = "brush";
    brushBtn.classList.add("active");
    fillBtn.classList.remove("active");
    brushWrap.hidden = false;
  });

  document.getElementById("brush-size").addEventListener("input", (e) => {
    brushSize = Number(e.target.value);
  });

  document.getElementById("undo-btn").addEventListener("click", undo);

  document.getElementById("save-btn").addEventListener("click", () => {
    if (!currentPage) return;
    try {
      localStorage.setItem(saveKey(currentPage.num), canvas.toDataURL());
      showToast("Saved! \u2728");
    } catch (e) {
      showToast("Couldn't save \u2014 storage full");
    }
  });

  // Pointer events cover touch, Apple Pencil, and mouse in one API
  canvas.addEventListener?.("pointerdown", onPointerDown);
  wirePointerEventsGlobally();
}

function wirePointerEventsGlobally() {
  document.addEventListener("pointerdown", (e) => {
    if (e.target.id !== "draw-canvas") return;
    onPointerDown(e);
  });
  document.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    onPointerMove(e);
  });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
}

function onPointerDown(e) {
  if (!canvas) return;
  e.preventDefault();
  const pt = canvasPoint(e);
  if (tool === "fill") {
    floodFill(pt.x, pt.y, hexToRGBA(selectedColor));
    pushUndo();
  } else {
    drawing = true;
    lastPt = pt;
    brushStroke(pt.x, pt.y);
  }
}

function onPointerMove(e) {
  if (tool !== "brush" || !drawing) return;
  e.preventDefault();
  const pt = canvasPoint(e);
  brushLine(lastPt, pt);
  lastPt = pt;
}

function onPointerUp() {
  if (drawing) {
    drawing = false;
    pushUndo();
  }
}

// ---------- Misc ----------
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1600);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
