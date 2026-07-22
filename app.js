// =========================================================================
// Debu's Jungle Book Colouring World
//
// Reference app ("Coloring Games: Lucas & Friends" by RV AppStudios)
// officially documents 5 modes: Fun Paint, Color Fill, Drawing, Glow Pen,
// Number Paint. We implement all 5, faithfully:
//   - Fun Paint: tap-to-fill, a dozen bright colours.
//   - Color Fill: drag-to-paint brush clipped to the region under your
//     finger (a "stay inside the lines" scribble feel) plus a quick Fill
//     button, crayon, glitter and stickers.
//   - Drawing: free draw on a blank page.
//   - Glow Pen: neon colours on a black background.
//   - Number Paint: real numbered regions, tap to match & fill.
// Plus 5 bonus modes built at your request beyond what the reference app
// has: Doodle, Pixel Art, Color Rain, Water Color, Patterns.
// =========================================================================

// ---------- Palettes ----------
const PALETTE = [
  "#E63946", "#F4845F", "#F4A261", "#E9C46A", "#FFD166",
  "#8AC926", "#52B788", "#2A9D8F", "#457B9D", "#4361EE",
  "#7209B7", "#B5179E", "#F72585", "#FFFFFF", "#6B4226", "#2D2A26"
];
const BIG_PALETTE = [
  "#E63946", "#F4845F", "#FFD166", "#8AC926", "#52B788",
  "#4361EE", "#7209B7", "#F72585", "#2D2A26", "#FFFFFF", "#E9C46A", "#457B9D"
];
const NEON_PALETTE = [
  "#FF2E63", "#FF6B00", "#FFF200", "#39FF14", "#00F5D4",
  "#00B4FF", "#7B2FFF", "#FF00E5", "#FFFFFF"
];
const PASTEL_PALETTE = [
  "#F6BD60", "#F7EDE2", "#F5CAC3", "#84A59D", "#F28482",
  "#90BE6D", "#B5838D", "#A8DADC", "#C8B6FF", "#FFD6A5"
];
const PATTERN_TYPES = [
  { id: "dots",     icon: "🔵" },
  { id: "stripes",  icon: "〰️" },
  { id: "stars",    icon: "⭐" },
  { id: "hearts",   icon: "💗" },
  { id: "checker",  icon: "🏁" },
  { id: "zigzag",   icon: "⚡" },
  { id: "flowers",  icon: "🌼" },
  { id: "waves",    icon: "🌊" }
];
const STICKERS = ["⭐","💗","🌸","🦋","🍄","🌈","☀️","🍃"];

const TOTAL_PAGES = 40; // matches the 40 jungle-book pages in repo root

// Which category each page belongs to (edit if a page is miscategorised).
const CATEGORIES = [
  { id: "boy",      label: "🧒 Jungle Boy" },
  { id: "animals",  label: "🐘 Animal Friends" },
  { id: "critters", label: "🦋 Birds & Critters" }
];
const PAGE_CATEGORY = {
  1:"animals", 2:"animals", 3:"boy", 4:"boy", 5:"boy", 6:"critters", 7:"boy",
  8:"boy", 9:"boy", 10:"critters", 11:"critters", 12:"boy", 13:"animals",
  14:"animals", 15:"boy", 16:"boy", 17:"boy", 18:"boy", 19:"boy",
  20:"boy", 21:"animals", 22:"boy", 23:"boy", 24:"animals",
  25:"animals", 26:"animals", 27:"critters", 28:"boy", 29:"boy",
  30:"animals", 31:"boy", 32:"animals", 33:"animals", 34:"critters",
  35:"critters", 36:"critters", 37:"critters", 38:"animals", 39:"boy", 40:"animals"
};

// ---------- Mode config ----------
// containedBrush: brush strokes are clipped to the enclosed region under
// the finger — you must move over the whole area to fill it (vs. Fill,
// which is instant on tap).
const MODES = [
  { id:"funpaint",  icon:"⚡", name:"Fun Paint",    desc:"Tap to fill — a dozen bright colours",
    thumb:"page-020.png", tools:["fill"], palette:BIG_PALETTE, variant:null },
  { id:"colorfill", icon:"🎨", name:"Color Fill",   desc:"Paint by moving your finger — plus crayon, glitter & stickers",
    thumb:"page-028.png", tools:["brush","fill","eraser","crayon","glitter","sticker"],
    palette:PALETTE, variant:null, containedBrush:true },
  { id:"drawing",   icon:"✏️", name:"Drawing",      desc:"Free draw on a blank page",
    thumb:null, tools:["brush","eraser"], palette:PALETTE, variant:"blank" },
  { id:"glow",      icon:"✨", name:"Glow Pen",     desc:"Neon colours on a dark background", cardClass:"glow",
    thumb:"page-032.png", tools:["fill","brush","eraser"], palette:NEON_PALETTE, variant:"glow" },
  { id:"numberpaint",icon:"🔢", name:"Number Paint", desc:"Tap a number to match & fill",
    thumb:"page-014.png", tools:["fill","brush"], palette:PALETTE, variant:"numbered" },
  { id:"watercolor",icon:"💧", name:"Water Color",  desc:"Wipe away the mist to reveal the colours underneath",
    thumb:"page-036-colored.jpg", tools:["brush","eraser"], palette:[], variant:"watercolor" },
  { id:"doodle",    icon:"🖊️", name:"Doodle",       desc:"Free-form scribble over the picture",
    thumb:"page-021.png", tools:["brush"], palette:PALETTE, variant:"doodle" },
  { id:"pixelart",  icon:"🧩", name:"Pixel Art",    desc:"Chunky, blocky pixel-style colouring",
    thumb:"page-011.png", tools:["fill","brush"], palette:PALETTE, variant:"pixel" },
  { id:"colorrain", icon:"🌧️", name:"Color Rain",   desc:"Watch colour pour into place",
    thumb:"page-034.png", tools:["fill"], palette:PALETTE, variant:"rain" },
  { id:"patterns",  icon:"🌸", name:"Patterns",     desc:"Fill with dots, stripes, stars & more", cardClass:"funpaint",
    thumb:"page-006.png", tools:["fill","brush"], palette:PALETTE, variant:"patterns" }
];

// =========================================================================
// Storage: IndexedDB, with a one-time migration of any old localStorage
// saves. `saveCache` mirrors the DB in memory (key -> dataURL string) so
// gallery rendering stays synchronous/fast; writes go to both.
// =========================================================================
const DB_NAME = "jungle-coloring-db";
const STORE = "saves";
let dbPromise = null;
let saveCache = new Map();

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => {
      const out = new Map();
      keysReq.result.forEach((k, i) => out.set(k, valsReq.result[i]));
      resolve(out);
    };
    tx.onerror = () => reject(tx.error);
  });
}
async function initStorage() {
  try { saveCache = await idbGetAll(); } catch (e) { saveCache = new Map(); }
  try {
    const toMigrate = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("jungle-color-")) toMigrate.push(k);
    }
    for (const k of toMigrate) {
      const val = localStorage.getItem(k);
      if (val && !saveCache.has(k)) { await idbSet(k, val); saveCache.set(k, val); }
      localStorage.removeItem(k);
    }
  } catch (e) { /* best-effort */ }
}
function saveKey(mode, num) { return `jungle-color-${mode}-page-${num}`; }
function hasSave(mode, num) { return saveCache.has(saveKey(mode, num)); }
function getSave(mode, num) { return saveCache.get(saveKey(mode, num)); }
async function writeSave(mode, num, dataUrl) {
  const key = saveKey(mode, num);
  saveCache.set(key, dataUrl);
  await idbSet(key, dataUrl);
}
function canvasToSavedDataUrl(cnv) {
  return cnv.toDataURL("image/jpeg", 0.85);
}

// ---------- State ----------
let currentMode = null;
let pages = [];
let coloredAvailable = new Set(); // page numbers that have a page-XXX-colored.jpg
let currentPage = null;
let ctx, canvas;
let numberCtx, numberCanvas;
let tool = "fill";
let selectedColor = PALETTE[0];
let selectedPattern = PATTERN_TYPES[0].id;
let selectedSticker = STICKERS[0];
let brushSize = 16;
let undoStack = [];
let redoStack = [];
let drawing = false;
let lastPt = null;
let statusFilter = "all";
let categoryFilter = "all";

let numberMap = null;         // Uint16Array (downscaled) -> region id
let numberOf = null;          // regionId -> palette number (1-based)
let numberScale = 1;
let numberRegionInfo = null;  // regionId -> {fx, fy} full-res centroid
let numberFontSize = 24;
let numberBuilding = false;
let numberBuildToken = 0;
let numberRegionCount = {};  // palette number -> how many regions use it
let numberFilledCount = {};  // palette number -> how many of those are filled

let activeMask = null;        // Uint8Array w*h for containedBrush clipping
let revealImageData = null;   // Water Color: the hidden fully-coloured picture
let revealedMask = null;      // Water Color: which pixels have been wiped clear so far
let revealCelebrated = false; // Water Color: only celebrate once per page-open

const modeGrid = document.getElementById("mode-grid");
const galleryGrid = document.getElementById("gallery-grid");
const emptyMsg = document.getElementById("empty-msg");
const modeView = document.getElementById("mode-view");
const galleryView = document.getElementById("gallery-view");
const colorView = document.getElementById("color-view");
const pageLabel = document.getElementById("page-label");
const galleryModeLabel = document.getElementById("gallery-mode-label");
const toast = document.getElementById("toast");

// ---------- Init ----------
init();

async function init() {
  preventPinchZoomStuck();
  await initStorage();
  await preflightPages();
  buildModeGrid();
  wireControls();
  registerServiceWorker();
}

// iOS Safari can get stuck mid-pinch-zoom on installed PWAs since the
// layout uses fixed full-screen views. Block pinch/double-tap zoom
// gestures outright so the header/toolbar never scroll out of reach.
function preventPinchZoomStuck() {
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("gesturechange", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, false);
}

async function preflightPages() {
  const checks = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    const num = String(i).padStart(3, "0");
    const src = `page-${num}.png`;
    const coloredSrc = `page-${num}-colored.jpg`;
    checks.push(Promise.all([imageExists(src), imageExists(coloredSrc)]).then(([ok, hasColored]) => {
      if (!ok) return null;
      if (hasColored) coloredAvailable.add(i);
      return { num: i, src, coloredSrc: hasColored ? coloredSrc : null };
    }));
  }
  pages = (await Promise.all(checks)).filter(Boolean);
}

function imageExists(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// ---------- Mode dashboard ----------
function buildModeGrid() {
  modeGrid.innerHTML = "";
  MODES.forEach(m => {
    const card = document.createElement("div");
    card.className = "mode-card" + (m.cardClass ? ` ${m.cardClass}` : "");
    card.innerHTML = `
      <span class="mode-icon">${m.icon}</span>
      <div class="mode-name">${m.name}</div>
      <div class="mode-desc">${m.desc}</div>
      ${m.thumb ? `<div class="mode-thumb" style="aspect-ratio:16/9;overflow:hidden;flex-shrink:0;"><img src="${m.thumb}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></div>` : ""}
    `;
    card.addEventListener("click", () => selectMode(m));
    modeGrid.appendChild(card);
  });
}

function selectMode(mode) {
  currentMode = mode;
  if (mode.variant === "blank") { openBlankCanvas(); return; }
  if (pages.length === 0) {
    emptyMsg.hidden = false;
    modeView.classList.remove("active");
    galleryView.classList.add("active");
    return;
  }
  galleryModeLabel.textContent = `${mode.icon} ${mode.name}`;
  buildFilterChipsOnce();
  renderGallery();
  modeView.classList.remove("active");
  galleryView.classList.add("active");
}

let chipsBuilt = false;
function buildFilterChipsOnce() {
  if (chipsBuilt) return;
  chipsBuilt = true;
  const statusRow = document.getElementById("status-filter");
  const categoryRow = document.getElementById("category-filter");

  [
    { id: "all", label: "All Pages" },
    { id: "started", label: "▶️ Continue Colouring" },
    { id: "new", label: "✨ Not Started" }
  ].forEach(s => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (s.id === statusFilter ? " active" : "");
    chip.textContent = s.label;
    chip.addEventListener("click", () => {
      statusFilter = s.id;
      statusRow.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderGallery();
    });
    statusRow.appendChild(chip);
  });

  [{ id: "all", label: "🌴 All Categories" }, ...CATEGORIES].forEach(c => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (c.id === categoryFilter ? " active" : "");
    chip.textContent = c.label;
    chip.addEventListener("click", () => {
      categoryFilter = c.id;
      categoryRow.querySelectorAll(".filter-chip").forEach(el => el.classList.remove("active"));
      chip.classList.add("active");
      renderGallery();
    });
    categoryRow.appendChild(chip);
  });
}

function renderGallery() {
  galleryGrid.innerHTML = "";
  const noMatchMsg = document.getElementById("no-match-msg");

  const visible = pages.filter(p => {
    if (currentMode.variant === "watercolor" && !coloredAvailable.has(p.num)) return false;
    const saved = hasSave(currentMode.id, p.num);
    if (statusFilter === "started" && !saved) return false;
    if (statusFilter === "new" && saved) return false;
    if (categoryFilter !== "all" && PAGE_CATEGORY[p.num] !== categoryFilter) return false;
    return true;
  });
  noMatchMsg.hidden = visible.length !== 0;

  const frag = document.createDocumentFragment();
  visible.forEach(p => {
    const card = document.createElement("div");
    card.className = "page-card";
    card.dataset.num = p.num;
    const saved = getSave(currentMode.id, p.num);
    if (saved) card.classList.add("done");

    const img = document.createElement("img");
    img.src = saved || p.src;
    img.loading = "lazy";
    img.alt = `Jungle page ${p.num}`;
    img.style.cssText = "width:100%;aspect-ratio:3/4;object-fit:contain;background:#f4f4f0;display:block;";
    img.addEventListener("error", () => {
      card.classList.add("broken");
      img.replaceWith(brokenThumb());
    });
    card.appendChild(img);

    // Birds & Critters cards read fine without a page-number caption.
    if (PAGE_CATEGORY[p.num] !== "critters") {
      const label = document.createElement("div");
      label.className = "num";
      label.textContent = `Page ${p.num}`;
      card.appendChild(label);
    }

    card.addEventListener("click", () => openPage(p));
    frag.appendChild(card);
  });
  galleryGrid.appendChild(frag);
}

function brokenThumb() {
  const div = document.createElement("div");
  div.className = "broken-thumb";
  div.textContent = "🖼️";
  return div;
}

// ---------- Colouring view setup ----------
function setupSidebarForMode() {
  const allTools = ["fill","brush","eraser","crayon","glitter","sticker"];
  allTools.forEach(t => {
    const btn = document.getElementById(`${t}-tool`);
    btn.hidden = !currentMode.tools.includes(t);
  });
  setTool(currentMode.tools[0]);

  document.getElementById("color-view").className =
    "view active" + (currentMode.variant === "glow" ? " color-view-glow" : "");
  document.getElementById("color-mode-label").textContent = `${currentMode.icon} ${currentMode.name}`;

  buildPalette();
  document.getElementById("palette").hidden = (currentMode.variant === "watercolor");
  document.getElementById("sticker-row").hidden = !currentMode.tools.includes("sticker");
  if (currentMode.tools.includes("sticker")) buildStickerRow();
}

function setTool(t) {
  tool = t;
  activeMask = null;
  document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(`${t}-tool`);
  if (btn) btn.classList.add("active");
  document.getElementById("brush-size-wrap").hidden = (t === "fill" || t === "sticker");
}

function buildPalette() {
  const palette = document.getElementById("palette");
  palette.innerHTML = "";

  if (currentMode.variant === "patterns") {
    PATTERN_TYPES.forEach((p, i) => {
      const sw = document.createElement("button");
      sw.className = "swatch pattern-swatch" + (i === 0 ? " selected" : "");
      sw.textContent = p.icon;
      sw.style.background = "#eef1ea";
      sw.addEventListener("click", () => {
        document.querySelectorAll(".swatch.selected").forEach(s => s.classList.remove("selected"));
        sw.classList.add("selected");
        selectedPattern = p.id;
      });
      palette.appendChild(sw);
    });
    currentMode.palette.forEach((hex, i) => {
      const sw = document.createElement("button");
      sw.className = "swatch" + (i === 0 ? " selected-color" : "");
      sw.style.background = hex;
      sw.addEventListener("click", () => {
        document.querySelectorAll(".swatch.selected-color").forEach(s => s.classList.remove("selected-color"));
        sw.classList.add("selected-color");
        selectedColor = hex;
      });
      palette.appendChild(sw);
    });
    selectedColor = currentMode.palette[0];
    return;
  }

  currentMode.palette.forEach((hex, i) => {
    const sw = document.createElement("button");
    sw.className = "swatch" + (i === 0 ? " selected" : "");
    sw.style.background = hex;
    sw.setAttribute("aria-label", `Colour ${hex}`);
    if (currentMode.variant === "numbered" && i < PALETTE.length) {
      const badge = document.createElement("span");
      badge.className = "swatch-num";
      badge.textContent = i + 1;
      sw.appendChild(badge);
    }
    sw.addEventListener("click", () => {
      document.querySelectorAll(".swatch.selected").forEach(s => s.classList.remove("selected"));
      sw.classList.add("selected");
      selectedColor = hex;
    });
    palette.appendChild(sw);
  });
  selectedColor = currentMode.palette[0];
}

function selectColorSwatch(index) {
  const swatches = document.querySelectorAll("#palette .swatch");
  swatches.forEach(s => s.classList.remove("selected"));
  if (swatches[index]) swatches[index].classList.add("selected");
  selectedColor = PALETTE[index];
}

function buildStickerRow() {
  const row = document.getElementById("sticker-row");
  row.innerHTML = "";
  STICKERS.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.className = "sticker-btn" + (i === 0 ? " selected" : "");
    btn.textContent = s;
    btn.addEventListener("click", () => {
      row.querySelectorAll(".sticker-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedSticker = s;
    });
    row.appendChild(btn);
  });
  selectedSticker = STICKERS[0];
}

// ---------- Opening a page / blank canvas ----------
function openPage(p) {
  currentPage = p;
  pageLabel.textContent = `Page ${p.num}`;
  galleryView.classList.remove("active");

  canvas = document.getElementById("draw-canvas");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  numberCanvas = document.getElementById("number-canvas");
  numberCtx = numberCanvas.getContext("2d");
  undoStack = []; redoStack = [];
  numberMap = null; numberOf = null; numberRegionInfo = null;
  numberBuilding = false; numberBuildToken++;
  activeMask = null;
  revealCelebrated = false;

  const saved = getSave(currentMode.id, p.num);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    numberCanvas.width = img.naturalWidth;
    numberCanvas.height = img.naturalHeight;
    numberCtx.clearRect(0, 0, numberCanvas.width, numberCanvas.height);
    ctx.drawImage(img, 0, 0);
    if (currentMode.variant === "glow" && !saved) invertToGlow();
    if (currentMode.variant === "watercolor" && p.coloredSrc) {
      loadRevealSource(p.src, p.coloredSrc, canvas.width, canvas.height);
    } else {
      revealImageData = null; revealedMask = null;
    }
    setupSidebarForMode();
    if (currentMode.variant === "numbered") buildNumberRegions(p.src);
    pushUndo();
  };
  img.src = saved || p.src;
}

function openBlankCanvas() {
  currentPage = { num: "draw", src: null };
  pageLabel.textContent = "Free Drawing";
  modeView.classList.remove("active");

  canvas = document.getElementById("draw-canvas");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  numberCanvas = document.getElementById("number-canvas");
  numberCtx = numberCanvas.getContext("2d");
  undoStack = []; redoStack = [];
  numberMap = null; numberOf = null; activeMask = null;

  const saved = getSave("drawing", "freeform");
  const finish = () => { setupSidebarForMode(); pushUndo(); };

  canvas.width = 1000; canvas.height = 1300;
  numberCanvas.width = 1000; numberCanvas.height = 1300;
  numberCtx.clearRect(0, 0, numberCanvas.width, numberCanvas.height);

  if (saved) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0); finish(); };
    img.src = saved;
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    finish();
  }
}

function invertToGlow() {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i]; d[i+1] = 255 - d[i+1]; d[i+2] = 255 - d[i+2];
  }
  ctx.putImageData(imgData, 0, 0);
}

function closePage() {
  colorView.classList.remove("active");
  colorView.className = "view";
  if (currentMode && currentMode.variant === "blank") {
    modeView.classList.add("active");
  } else {
    galleryView.classList.add("active");
    renderGallery();
  }
}

function goHome() {
  colorView.classList.remove("active");
  galleryView.classList.remove("active");
  colorView.className = "view";
  modeView.classList.add("active");
}

// ---------- Undo / redo ----------
function pushUndo() {
  try {
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 15) undoStack.shift();
    redoStack = [];
  } catch (e) { /* ignore */ }
}
function restoreFromDataUrl(dataUrl) {
  const img = new Image();
  img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
  img.src = dataUrl;
}
function undo() {
  if (undoStack.length < 2) return;
  redoStack.push(undoStack.pop());
  restoreFromDataUrl(undoStack[undoStack.length - 1]);
}
function redo() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restoreFromDataUrl(next);
}

// ---------- Geometry ----------
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

// ---------- Pattern tiles ----------
const patternTileCache = {};
function getPatternTile(patternId, hex) {
  const key = patternId + hex;
  if (patternTileCache[key]) return patternTileCache[key];
  const size = 22;
  const off = document.createElement("canvas");
  off.width = size; off.height = size;
  const o = off.getContext("2d");
  o.fillStyle = "#ffffff"; o.fillRect(0, 0, size, size);
  o.fillStyle = hex; o.strokeStyle = hex;

  if (patternId === "dots") {
    o.beginPath(); o.arc(size/2, size/2, size*0.28, 0, Math.PI*2); o.fill();
  } else if (patternId === "stripes") {
    o.lineWidth = size*0.35;
    o.beginPath(); o.moveTo(-2, size+2); o.lineTo(size+2, -2); o.stroke();
  } else if (patternId === "stars") {
    drawStar(o, size/2, size/2, 4, size*0.42, size*0.18); o.fill();
  } else if (patternId === "hearts") {
    drawHeart(o, size/2, size/2, size*0.3); o.fill();
  } else if (patternId === "checker") {
    o.fillRect(0, 0, size/2, size/2);
    o.fillRect(size/2, size/2, size/2, size/2);
  } else if (patternId === "zigzag") {
    o.lineWidth = size*0.16; o.lineJoin = "round"; o.lineCap = "round";
    o.beginPath();
    o.moveTo(0, size*0.3); o.lineTo(size*0.25, size*0.7); o.lineTo(size*0.5, size*0.3);
    o.lineTo(size*0.75, size*0.7); o.lineTo(size, size*0.3);
    o.stroke();
  } else if (patternId === "flowers") {
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      o.beginPath();
      o.ellipse(size/2 + Math.cos(ang)*size*0.2, size/2 + Math.sin(ang)*size*0.2, size*0.16, size*0.1, ang, 0, Math.PI*2);
      o.fill();
    }
    o.fillStyle = "#ffffff";
    o.beginPath(); o.arc(size/2, size/2, size*0.1, 0, Math.PI*2); o.fill();
  } else if (patternId === "waves") {
    o.lineWidth = size*0.14;
    o.beginPath();
    o.moveTo(-2, size*0.5);
    o.quadraticCurveTo(size*0.25, size*0.2, size*0.5, size*0.5);
    o.quadraticCurveTo(size*0.75, size*0.8, size+2, size*0.5);
    o.stroke();
  }

  const tile = o.getImageData(0, 0, size, size);
  patternTileCache[key] = tile;
  return tile;
}
function drawStar(o, cx, cy, spikes, outerR, innerR) {
  let rot = Math.PI/2*3, x=cx, y=cy;
  const step = Math.PI/spikes;
  o.beginPath(); o.moveTo(cx, cy-outerR);
  for (let i=0; i<spikes; i++) {
    x = cx+Math.cos(rot)*outerR; y = cy+Math.sin(rot)*outerR; o.lineTo(x,y); rot+=step;
    x = cx+Math.cos(rot)*innerR; y = cy+Math.sin(rot)*innerR; o.lineTo(x,y); rot+=step;
  }
  o.lineTo(cx, cy-outerR); o.closePath();
}
function drawHeart(o, cx, cy, r) {
  o.beginPath();
  o.moveTo(cx, cy+r*0.6);
  o.bezierCurveTo(cx+r*1.4, cy-r*0.6, cx+r*0.6, cy-r*1.4, cx, cy-r*0.3);
  o.bezierCurveTo(cx-r*0.6, cy-r*1.4, cx-r*1.4, cy-r*0.6, cx, cy+r*0.6);
  o.closePath();
}

// =========================================================================
// Number Paint region labelling — always derived from the pristine source
// artwork (never the save), drawn onto a transparent overlay canvas that
// sits above the paintable canvas, so colouring never disturbs it and
// reopening a saved page keeps full tap-to-match behaviour.
// =========================================================================
function buildNumberRegions(src) {
  const myToken = ++numberBuildToken;
  numberBuilding = true;
  showToast("Preparing numbers\u2026");

  const probe = new Image();
  probe.crossOrigin = "anonymous";
  probe.onload = () => {
    if (myToken !== numberBuildToken) return;

    const fullW = probe.naturalWidth, fullH = probe.naturalHeight;
    const scale = Math.min(1, 1400 / Math.max(fullW, fullH));
    const w = Math.max(1, Math.round(fullW * scale));
    const h = Math.max(1, Math.round(fullH * scale));

    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.drawImage(probe, 0, 0, w, h);
    const imgData = octx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const idx = (x, y) => (y * w + x) * 4;
    const isBarrier = (x, y) => {
      const i = idx(x, y);
      return (data[i] + data[i+1] + data[i+2]) / 3 < 90;
    };

    const map = new Uint16Array(w * h);
    const regions = [];
    let nextId = 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (map[p] !== 0 || isBarrier(x, y)) continue;
        const id = nextId++;
        let count = 0, sumX = 0, sumY = 0;
        const stack = [[x, y]];
        while (stack.length) {
          let [cx, cy] = stack.pop();
          if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
          const cp = cy * w + cx;
          if (map[cp] !== 0 || isBarrier(cx, cy)) continue;
          let xl = cx;
          while (xl >= 0 && map[cy*w+xl] === 0 && !isBarrier(xl, cy)) xl--;
          xl++;
          let xr = cx;
          while (xr < w && map[cy*w+xr] === 0 && !isBarrier(xr, cy)) xr++;
          xr--;
          let spanAbove = false, spanBelow = false;
          for (let xi = xl; xi <= xr; xi++) {
            map[cy*w+xi] = id; count++; sumX += xi; sumY += cy;
            if (cy > 0) {
              const above = map[(cy-1)*w+xi] === 0 && !isBarrier(xi, cy-1);
              if (above && !spanAbove) { stack.push([xi, cy-1]); spanAbove = true; }
              else if (!above) spanAbove = false;
            }
            if (cy < h-1) {
              const below = map[(cy+1)*w+xi] === 0 && !isBarrier(xi, cy+1);
              if (below && !spanBelow) { stack.push([xi, cy+1]); spanBelow = true; }
              else if (!below) spanBelow = false;
            }
          }
        }
        regions.push({ id, count, cx: sumX / count, cy: sumY / count });
      }
    }

    // Bigger minimum + a sensible cap keeps this looking like a real
    // colour-by-number sheet rather than every stray leaf getting a number.
    const MIN_AREA = Math.max(1400, Math.round(w * h * 0.006));
    let numbered = regions.filter(r => r.count >= MIN_AREA);
    const MAX_REGIONS = 18;
    if (numbered.length > MAX_REGIONS) {
      numbered = numbered.sort((a, b) => b.count - a.count).slice(0, MAX_REGIONS);
    }
    numbered.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));

    const numOf = {};
    const info = {};
    const regionCount = {};
    numbered.forEach((r, i) => {
      const n = (i % PALETTE.length) + 1;
      numOf[r.id] = n;
      info[r.id] = { fx: r.cx / scale, fy: r.cy / scale };
      regionCount[n] = (regionCount[n] || 0) + 1;
    });

    if (myToken !== numberBuildToken) return;
    numberMap = map;
    numberOf = numOf;
    numberRegionInfo = info;
    numberScale = scale;
    numberRegionCount = regionCount;
    numberFilledCount = {};
    numberFontSize = Math.max(18, Math.round(Math.min(fullW, fullH) * 0.032));

    numberCtx.clearRect(0, 0, numberCanvas.width, numberCanvas.height);
    numberCtx.font = `800 ${numberFontSize}px ui-rounded, system-ui, sans-serif`;
    numberCtx.textAlign = "center";
    numberCtx.textBaseline = "middle";
    numbered.forEach(r => {
      const n = numOf[r.id];
      const { fx, fy } = info[r.id];
      numberCtx.lineWidth = 4;
      numberCtx.strokeStyle = "#2D2A26";
      numberCtx.strokeText(String(n), fx, fy);
      numberCtx.fillStyle = PALETTE[n-1];
      numberCtx.fillText(String(n), fx, fy);
    });

    numberBuilding = false;
    showToast("Ready! Tap a number \u2728");
  };
  probe.src = src;
}

// Once a numbered region is filled, its number fades away like a real
// colour-by-number sheet instead of staying on top of the finished colour.
function clearNumberLabel(regionId) {
  if (!numberRegionInfo || !numberRegionInfo[regionId]) return;
  const { fx, fy } = numberRegionInfo[regionId];
  const r = numberFontSize * 0.9;
  numberCtx.clearRect(fx - r, fy - r, r * 2, r * 2);
}

// Marks one region (by its assigned palette number) as filled. Once every
// region sharing that number is done, the matching palette swatch fades
// away too — same finishing feel as the numbers disappearing.
function markNumberRegionFilled(n) {
  numberFilledCount[n] = (numberFilledCount[n] || 0) + 1;
  const total = numberRegionCount[n] || 1;
  if (numberFilledCount[n] >= total) {
    hidePaletteSwatch(n);
  }
}

function hidePaletteSwatch(n) {
  const swatches = document.querySelectorAll("#palette .swatch");
  const sw = swatches[n - 1];
  if (sw && !sw.classList.contains("swatch-done")) {
    sw.classList.add("swatch-done");
  }
}

// ---------- Flood fill ----------
function floodFill(startX, startY, sampler, animate) {
  const w = canvas.width, h = canvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return null;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const idx = (x, y) => (y * w + x) * 4;

  const startIdx = idx(startX, startY);
  const startR = data[startIdx], startG = data[startIdx+1],
        startB = data[startIdx+2], startA = data[startIdx+3];

  const brightness = (startR + startG + startB) / 3;
  const isGlow = currentMode && currentMode.variant === "glow";
  const isBarrier = isGlow ? (v => v > 200) : (v => v < 60);
  if (isBarrier(brightness)) return null;

  const tolerance = 48;
  const matches = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    const bright = (r + g + b) / 3;
    if (isBarrier(bright)) return false;
    return Math.abs(r-startR) <= tolerance && Math.abs(g-startG) <= tolerance &&
           Math.abs(b-startB) <= tolerance && Math.abs(a-startA) <= tolerance;
  };

  const stack = [[startX, startY]];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    let [x, y] = stack.pop();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (visited[y*w+x]) continue;
    let xl = x;
    while (xl >= 0 && matches(xl, y) && !visited[y*w+xl]) xl--;
    xl++;
    let xr = x;
    while (xr < w && matches(xr, y) && !visited[y*w+xr]) xr++;
    xr--;
    let spanAbove = false, spanBelow = false;
    for (let xi = xl; xi <= xr; xi++) {
      const i = idx(xi, y);
      const [pr, pg, pb, pa] = sampler(xi, y);
      data[i] = pr; data[i+1] = pg; data[i+2] = pb; data[i+3] = pa;
      visited[y*w+xi] = 1;
      if (y > 0) {
        const above = matches(xi, y-1) && !visited[(y-1)*w+xi];
        if (above && !spanAbove) { stack.push([xi, y-1]); spanAbove = true; }
        else if (!above) spanAbove = false;
      }
      if (y < h-1) {
        const below = matches(xi, y+1) && !visited[(y+1)*w+xi];
        if (below && !spanBelow) { stack.push([xi, y+1]); spanBelow = true; }
        else if (!below) spanBelow = false;
      }
    }
  }

  if (animate) animateRainReveal(imgData, visited, w, h);
  else ctx.putImageData(imgData, 0, 0);
  return visited;
}

// Slowed + staggered so the "pouring" effect actually reads as rain.
function animateRainReveal(finalImgData, visited, w, h) {
  const before = ctx.getImageData(0, 0, w, h);
  const totalSteps = 36;
  const stepDelayMs = 32;
  let step = 0;
  const rowsPerStep = Math.ceil(h / totalSteps);

  function frame() {
    step++;
    const cutoff = step * rowsPerStep;
    const out = ctx.createImageData(w, h);
    out.data.set(before.data);
    for (let y = 0; y < Math.min(cutoff, h); y++) {
      for (let x = 0; x < w; x++) {
        const i = (y*w+x);
        if (visited[i]) {
          const p = i*4;
          out.data[p] = finalImgData.data[p];
          out.data[p+1] = finalImgData.data[p+1];
          out.data[p+2] = finalImgData.data[p+2];
          out.data[p+3] = finalImgData.data[p+3];
        }
      }
    }
    ctx.putImageData(out, 0, 0);
    if (cutoff < h) setTimeout(frame, stepDelayMs);
    else pushUndo();
  }
  setTimeout(frame, stepDelayMs);
}

function solidSampler(hex) {
  const [r,g,b,a] = hexToRGBA(hex);
  return () => [r,g,b,a];
}
function patternSampler(patternId, hex) {
  const tile = getPatternTile(patternId, hex);
  const size = 22;
  return (x, y) => {
    const tx = ((x % size) + size) % size;
    const ty = ((y % size) + size) % size;
    const i = (ty*size+tx)*4;
    return [tile.data[i], tile.data[i+1], tile.data[i+2], 255];
  };
}

// ---------- Region mask for the Color Fill "contained brush" ----------
// Computes which pixels belong to the same enclosed region as (startX,
// startY), using identical adjacency rules to floodFill, but only marks
// membership — never writes colour. Used to clip brush strokes so
// scribbling stays inside the lines.
function computeRegionMask(startX, startY) {
  const w = canvas.width, h = canvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return null;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const idx = (x, y) => (y * w + x) * 4;
  const startIdx = idx(startX, startY);
  const startR = data[startIdx], startG = data[startIdx+1],
        startB = data[startIdx+2], startA = data[startIdx+3];
  const brightness = (startR + startG + startB) / 3;
  if (brightness < 60) return null; // started on an outline

  const tolerance = 48;
  const matches = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if ((r+g+b)/3 < 60) return false;
    return Math.abs(r-startR)<=tolerance && Math.abs(g-startG)<=tolerance &&
           Math.abs(b-startB)<=tolerance && Math.abs(a-startA)<=tolerance;
  };

  const mask = new Uint8Array(w * h);
  const stack = [[startX, startY]];
  while (stack.length) {
    let [x, y] = stack.pop();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (mask[y*w+x]) continue;
    let xl = x;
    while (xl >= 0 && matches(xl, y) && !mask[y*w+xl]) xl--;
    xl++;
    let xr = x;
    while (xr < w && matches(xr, y) && !mask[y*w+xr]) xr++;
    xr--;
    let spanAbove = false, spanBelow = false;
    for (let xi = xl; xi <= xr; xi++) {
      mask[y*w+xi] = 1;
      if (y > 0) {
        const above = matches(xi, y-1) && !mask[(y-1)*w+xi];
        if (above && !spanAbove) { stack.push([xi, y-1]); spanAbove = true; }
        else if (!above) spanAbove = false;
      }
      if (y < h-1) {
        const below = matches(xi, y+1) && !mask[(y+1)*w+xi];
        if (below && !spanBelow) { stack.push([xi, y+1]); spanBelow = true; }
        else if (!below) spanBelow = false;
      }
    }
  }
  return mask;
}

// Paints a soft/solid dab, clipped to activeMask if one is set.
function maskedDab(cx, cy, radius, hex, opacity) {
  const w = canvas.width, h = canvas.height;
  const x0 = Math.max(0, Math.floor(cx-radius-1)), y0 = Math.max(0, Math.floor(cy-radius-1));
  const x1 = Math.min(w, Math.ceil(cx+radius+1)), y1 = Math.min(h, Math.ceil(cy+radius+1));
  const bw = x1-x0, bh = y1-y0;
  if (bw <= 0 || bh <= 0) return;
  const imgData = ctx.getImageData(x0, y0, bw, bh);
  const data = imgData.data;
  const [r,g,b] = hexToRGBA(hex);
  const op = opacity == null ? 1 : opacity;
  const solid = op >= 1;
  // A ~1px anti-aliasing band at the edge keeps the stroke smooth at any
  // zoom level without the whole dab looking translucent/patchy.
  const aaBand = 1.2;
  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      const gx = x0+xx, gy = y0+yy;
      if (activeMask && !activeMask[gy*w+gx]) continue;
      const dx = gx-cx, dy = gy-cy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist > radius + aaBand) continue;
      let a;
      if (solid) {
        a = dist <= radius - aaBand ? 1 : Math.max(0, 1 - (dist-(radius-aaBand))/(2*aaBand));
      } else {
        a = op * Math.max(0, 1 - dist/radius);
      }
      if (a <= 0) continue;
      const i = (yy*bw+xx)*4;
      data[i]   = data[i]   + (r-data[i])   * a;
      data[i+1] = data[i+1] + (g-data[i+1]) * a;
      data[i+2] = data[i+2] + (b-data[i+2]) * a;
      data[i+3] = 255;
    }
  }
  ctx.putImageData(imgData, x0, y0);
}

function maskedLine(from, to, radius, hex, opacity) {
  const dist = Math.hypot(to.x-from.x, to.y-from.y);
  const step = Math.max(1.5, radius * 0.28);
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    maskedDab(from.x + (to.x-from.x)*t, from.y + (to.y-from.y)*t, radius, hex, opacity);
  }
}

// =========================================================================
// Water Color: wipe-to-reveal. A hidden fully-coloured picture sits behind
// the line-art canvas; dragging the brush copies pixels from that hidden
// picture into view (like wiping condensation off glass), and the eraser
// paints the original line art back over the top to "re-cover" it.
// =========================================================================
let lineArtImageData = null;  // pristine line art, captured once per page-open
let revealedCount = 0;
let revealedTotal = 0;

function loadRevealSource(lineSrc, coloredSrc, w, h) {
  revealedMask = new Uint8Array(w * h);
  revealedCount = 0;
  revealedTotal = w * h;
  lineArtImageData = null;
  revealImageData = null;

  const lineImg = new Image();
  lineImg.crossOrigin = "anonymous";
  lineImg.onload = () => {
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const octx = off.getContext("2d");
    octx.drawImage(lineImg, 0, 0, w, h);
    lineArtImageData = octx.getImageData(0, 0, w, h);
  };
  lineImg.src = lineSrc;

  const cimg = new Image();
  cimg.crossOrigin = "anonymous";
  cimg.onload = () => {
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const octx = off.getContext("2d");
    octx.drawImage(cimg, 0, 0, w, h);
    revealImageData = octx.getImageData(0, 0, w, h);
  };
  cimg.src = coloredSrc;
}

function revealDab(cx, cy, radius) {
  if (!revealImageData) return;
  const w = canvas.width, h = canvas.height;
  const x0 = Math.max(0, Math.floor(cx-radius-1)), y0 = Math.max(0, Math.floor(cy-radius-1));
  const x1 = Math.min(w, Math.ceil(cx+radius+1)), y1 = Math.min(h, Math.ceil(cy+radius+1));
  const bw = x1-x0, bh = y1-y0;
  if (bw <= 0 || bh <= 0) return;
  const imgData = ctx.getImageData(x0, y0, bw, bh);
  const data = imgData.data;
  const aaBand = 1.5;
  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      const gx = x0+xx, gy = y0+yy;
      const dx = gx-cx, dy = gy-cy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist > radius + aaBand) continue;
      const a = dist <= radius - aaBand ? 1 : Math.max(0, 1 - (dist-(radius-aaBand))/(2*aaBand));
      if (a <= 0) continue;
      const i = (yy*bw+xx)*4;
      const si = (gy*w+gx)*4;
      data[i]   = data[i]   + (revealImageData.data[si]   - data[i])   * a;
      data[i+1] = data[i+1] + (revealImageData.data[si+1] - data[i+1]) * a;
      data[i+2] = data[i+2] + (revealImageData.data[si+2] - data[i+2]) * a;
      data[i+3] = 255;
      if (a > 0.6 && revealedMask && !revealedMask[gy*w+gx]) {
        revealedMask[gy*w+gx] = 1;
        revealedCount++;
      }
    }
  }
  ctx.putImageData(imgData, x0, y0);
  maybeCelebrateReveal();
}

function coverDab(cx, cy, radius) {
  if (!lineArtImageData) return;
  const w = canvas.width, h = canvas.height;
  const x0 = Math.max(0, Math.floor(cx-radius-1)), y0 = Math.max(0, Math.floor(cy-radius-1));
  const x1 = Math.min(w, Math.ceil(cx+radius+1)), y1 = Math.min(h, Math.ceil(cy+radius+1));
  const bw = x1-x0, bh = y1-y0;
  if (bw <= 0 || bh <= 0) return;
  const imgData = ctx.getImageData(x0, y0, bw, bh);
  const data = imgData.data;
  const aaBand = 1.5;
  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      const gx = x0+xx, gy = y0+yy;
      const dx = gx-cx, dy = gy-cy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist > radius + aaBand) continue;
      const a = dist <= radius - aaBand ? 1 : Math.max(0, 1 - (dist-(radius-aaBand))/(2*aaBand));
      if (a <= 0) continue;
      const i = (yy*bw+xx)*4;
      const si = (gy*w+gx)*4;
      data[i]   = data[i]   + (lineArtImageData.data[si]   - data[i])   * a;
      data[i+1] = data[i+1] + (lineArtImageData.data[si+1] - data[i+1]) * a;
      data[i+2] = data[i+2] + (lineArtImageData.data[si+2] - data[i+2]) * a;
      data[i+3] = 255;
      if (a > 0.6 && revealedMask && revealedMask[gy*w+gx]) {
        revealedMask[gy*w+gx] = 0;
        revealedCount--;
      }
    }
  }
  ctx.putImageData(imgData, x0, y0);
}

function revealLine(from, to, radius) {
  const dist = Math.hypot(to.x-from.x, to.y-from.y);
  const step = Math.max(1.5, radius * 0.3);
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    revealDab(from.x + (to.x-from.x)*t, from.y + (to.y-from.y)*t, radius);
  }
}

function coverLine(from, to, radius) {
  const dist = Math.hypot(to.x-from.x, to.y-from.y);
  const step = Math.max(1.5, radius * 0.3);
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coverDab(from.x + (to.x-from.x)*t, from.y + (to.y-from.y)*t, radius);
  }
}

function maybeCelebrateReveal() {
  if (revealCelebrated || !revealedTotal) return;
  if (revealedCount / revealedTotal > 0.85) {
    revealCelebrated = true;
    celebrate();
  }
}

// ---------- Brush-family tools (unclipped — free draw / other modes) ----------
function brushStroke(x, y) {
  if (currentMode.variant === "watercolor" && tool === "eraser") {
    coverDab(x, y, brushSize * 1.4);
    return;
  }
  if (currentMode.variant === "watercolor" && tool === "brush") {
    revealDab(x, y, brushSize * 1.6);
    return;
  }
  if (tool === "eraser") {
    ctx.fillStyle = (currentMode.variant === "glow") ? "#000000" : "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, brushSize/2, 0, Math.PI*2); ctx.fill();
    return;
  }
  if (tool === "glitter") {
    for (let i = 0; i < 6; i++) {
      const ox = x + (Math.random()-0.5)*brushSize*1.6;
      const oy = y + (Math.random()-0.5)*brushSize*1.6;
      ctx.fillStyle = selectedColor;
      ctx.globalAlpha = 0.55 + Math.random()*0.4;
      ctx.beginPath(); ctx.arc(ox, oy, Math.max(1, brushSize*0.08), 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (tool === "crayon") {
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 10; i++) {
      const ox = x + (Math.random()-0.5)*brushSize*0.9;
      const oy = y + (Math.random()-0.5)*brushSize*0.9;
      ctx.fillStyle = selectedColor;
      ctx.beginPath(); ctx.arc(ox, oy, Math.max(1, brushSize*0.12), 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (currentMode.variant === "pixel") {
    const cell = Math.max(8, brushSize);
    const gx = Math.floor(x/cell)*cell, gy = Math.floor(y/cell)*cell;
    ctx.fillStyle = selectedColor;
    ctx.fillRect(gx, gy, cell, cell);
    return;
  }
  if (currentMode.variant === "watercolor") {
    maskedDab(x, y, brushSize * 1.6, selectedColor, 0.16);
    return;
  }
  ctx.fillStyle = selectedColor;
  ctx.beginPath(); ctx.arc(x, y, brushSize/2, 0, Math.PI*2); ctx.fill();
}

function brushLine(from, to) {
  if (currentMode.variant === "watercolor" && tool === "brush") {
    revealLine(from, to, brushSize * 1.6);
    return;
  }
  if (currentMode.variant === "watercolor" && tool === "eraser") {
    coverLine(from, to, brushSize * 1.4);
    return;
  }
  if (currentMode.containedBrush && tool === "brush") {
    maskedLine(from, to, brushSize/2, selectedColor, 1);
    return;
  }
  if (currentMode.variant === "pixel" && tool !== "eraser") {
    brushStroke(to.x, to.y);
    return;
  }
  if (tool === "glitter" || tool === "crayon") {
    brushStroke(to.x, to.y);
    return;
  }
  ctx.strokeStyle = (tool === "eraser")
    ? ((currentMode.variant === "glow") ? "#000000" : "#ffffff")
    : selectedColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
}

function placeSticker(x, y) {
  ctx.font = `${brushSize * 2.4}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(selectedSticker, x, y);
}

// ---------- Controls wiring ----------
function wireControls() {
  document.getElementById("gallery-back-btn").addEventListener("click", () => {
    galleryView.classList.remove("active");
    modeView.classList.add("active");
  });
  document.getElementById("back-btn").addEventListener("click", closePage);
  document.getElementById("home-btn").addEventListener("click", goHome);

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!currentPage) return;
    if (!confirm("Clear all colours on this page?")) return;
    if (currentMode.variant === "blank") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      pushUndo();
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (currentMode.variant === "glow") invertToGlow();
      if (currentMode.variant === "watercolor" && revealedMask) {
        revealedMask.fill(0);
        revealedCount = 0;
        revealCelebrated = false;
      }
      pushUndo();
    };
    img.src = currentPage.src;
  });

  ["fill","brush","eraser","crayon","glitter","sticker"].forEach(t => {
    document.getElementById(`${t}-tool`).addEventListener("click", () => setTool(t));
  });

  document.getElementById("brush-size").addEventListener("input", (e) => {
    brushSize = Number(e.target.value);
  });

  document.getElementById("undo-btn").addEventListener("click", undo);
  document.getElementById("redo-btn").addEventListener("click", redo);

  document.getElementById("save-btn").addEventListener("click", async () => {
    if (!currentPage) return;
    try {
      const dataUrl = canvasToSavedDataUrl(canvas);
      if (currentMode.variant === "blank") await writeSave("drawing", "freeform", dataUrl);
      else await writeSave(currentMode.id, currentPage.num, dataUrl);
      celebrate();
    } catch (e) {
      showToast("Couldn't save \u2014 please try again");
    }
  });

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
    if (currentMode.variant === "pixel") {
      // Pixel Art: tapping stamps one blocky cell, not a whole flood fill.
      brushStroke(pt.x, pt.y);
      pushUndo();
      return;
    }
    let fillColor = selectedColor;
    let matchedRegionId = null;
    let matchedNumber = null;
    if (currentMode.variant === "numbered" && numberMap && !numberBuilding) {
      const mapW = Math.round(canvas.width * numberScale);
      const mapH = Math.round(canvas.height * numberScale);
      const mx = Math.min(mapW - 1, Math.floor(pt.x * numberScale));
      const my = Math.min(mapH - 1, Math.floor(pt.y * numberScale));
      const id = numberMap[my * mapW + mx];
      const n = id && numberOf[id];
      if (n) {
        fillColor = PALETTE[n - 1];
        selectColorSwatch(n - 1);
        matchedRegionId = id;
        matchedNumber = n;
      }
    }
    const sampler = (currentMode.variant === "patterns")
      ? patternSampler(selectedPattern, selectedColor)
      : solidSampler(fillColor);
    floodFill(pt.x, pt.y, sampler, currentMode.variant === "rain");
    if (matchedRegionId) {
      clearNumberLabel(matchedRegionId);
      markNumberRegionFilled(matchedNumber);
    }
    if (currentMode.variant !== "rain") pushUndo();
  } else if (tool === "sticker") {
    placeSticker(pt.x, pt.y);
    pushUndo();
  } else {
    drawing = true;
    lastPt = pt;
    if (currentMode.containedBrush && tool === "brush") {
      activeMask = computeRegionMask(pt.x, pt.y);
      if (activeMask) maskedDab(pt.x, pt.y, brushSize/2, selectedColor, 1);
    } else if (currentMode.variant === "watercolor" && tool === "brush") {
      activeMask = null;
      brushStroke(pt.x, pt.y);
    } else {
      brushStroke(pt.x, pt.y);
    }
  }
}

function onPointerMove(e) {
  if (tool === "fill" || tool === "sticker" || !drawing) return;
  e.preventDefault();
  const pt = canvasPoint(e);
  brushLine(lastPt, pt);
  lastPt = pt;
}

function onPointerUp() {
  if (drawing) {
    drawing = false;
    activeMask = null;
    pushUndo();
  }
}

// ---------- Toast + celebration ----------
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1600);
}
function celebrate() {
  const el = document.getElementById("celebration");
  el.hidden = false;
  spawnConfetti();
  setTimeout(() => { el.hidden = true; }, 1500);
}
function spawnConfetti() {
  const emojis = ["🎉","✨","🌟","🎊","💚"];
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    piece.style.left = Math.random()*100 + "vw";
    piece.style.animationDuration = (1 + Math.random()*0.8) + "s";
    piece.style.animationDelay = (Math.random()*0.2) + "s";
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2200);
  }
}

// ---------- PWA ----------
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
