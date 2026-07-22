// =========================================================================
// Jungle Colouring Book — 9 play modes (inspired by "Coloring Games: Lucas
// & Friends"): Fun Paint, Color Fill, Drawing, Glow Pen, Number Paint,
// Doodle, Pixel Art, Color Rain, Patterns. Same 40 jungle pages reused
// across every mode (except Drawing, which is a blank free-draw canvas).
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
const PATTERN_TYPES = [
  { id: "dots",    icon: "🔵" },
  { id: "stripes", icon: "〰️" },
  { id: "stars",   icon: "⭐" },
  { id: "hearts",  icon: "💗" }
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
// tools: which buttons show in the sidebar for this mode.
// variant: special rendering/behaviour hook (see applyVariant/handled inline).
const MODES = [
  { id:"funpaint",  icon:"⚡", name:"Fun Paint",    desc:"Big taps, bright colours — great for little ones",
    tools:["fill"], palette:BIG_PALETTE, variant:null },
  { id:"colorfill", icon:"🎨", name:"Color Fill",   desc:"Fill, brush, crayon, glitter & stickers",
    tools:["fill","brush","eraser","crayon","glitter","sticker"], palette:PALETTE, variant:null },
  { id:"drawing",   icon:"✏️", name:"Drawing",      desc:"Free draw on a blank page",
    tools:["brush","eraser"], palette:PALETTE, variant:"blank" },
  { id:"glow",      icon:"✨", name:"Glow Pen",     desc:"Paint neon colours on a dark background", cardClass:"glow",
    tools:["fill","brush","eraser"], palette:NEON_PALETTE, variant:"glow" },
  { id:"numberpaint",icon:"🔢", name:"Number Paint", desc:"A numbered palette — colour your way up",
    tools:["fill","brush"], palette:PALETTE, variant:"numbered" },
  { id:"doodle",    icon:"🖊️", name:"Doodle",       desc:"Free-form scribble over the picture",
    tools:["brush"], palette:PALETTE, variant:"doodle" },
  { id:"pixelart",  icon:"🧩", name:"Pixel Art",    desc:"Chunky, blocky pixel-style colouring",
    tools:["fill","brush"], palette:PALETTE, variant:"pixel" },
  { id:"colorrain", icon:"🌧️", name:"Color Rain",   desc:"Watch colour drip and pour into place",
    tools:["fill"], palette:PALETTE, variant:"rain" },
  { id:"patterns",  icon:"🌸", name:"Patterns",     desc:"Fill with cute dots, stripes & stars", cardClass:"funpaint",
    tools:["fill","brush"], palette:PALETTE, variant:"patterns" }
];

// ---------- State ----------
let currentMode = null;
let pages = [];
let currentPage = null;
let ctx, canvas;
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
let numberMap = null;   // Uint16Array w*h -> region id (0 = none/outline)
let numberOf = null;    // regionId -> palette number (1-based)
let numberBuilding = false;

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
  await preflightPages();
  buildModeGrid();
  wireControls();
  registerServiceWorker();
}

async function preflightPages() {
  const checks = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    const num = String(i).padStart(3, "0");
    const src = `page-${num}.png`;
    checks.push(imageExists(src).then(ok => ok ? { num: i, src } : null));
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

function saveKey(mode, num) {
  return `jungle-color-${mode}-page-${num}`;
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
    `;
    card.addEventListener("click", () => selectMode(m));
    modeGrid.appendChild(card);
  });
}

function selectMode(mode) {
  currentMode = mode;
  if (mode.variant === "blank") {
    // Drawing mode skips the page gallery — straight to a blank canvas.
    openBlankCanvas();
    return;
  }
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
    const hasSave = !!localStorage.getItem(saveKey(currentMode.id, p.num));
    if (statusFilter === "started" && !hasSave) return false;
    if (statusFilter === "new" && hasSave) return false;
    if (categoryFilter !== "all" && PAGE_CATEGORY[p.num] !== categoryFilter) return false;
    return true;
  });
  noMatchMsg.hidden = visible.length !== 0;

  const frag = document.createDocumentFragment();
  visible.forEach(p => {
    const card = document.createElement("div");
    card.className = "page-card";
    card.dataset.num = p.num;
    const saved = localStorage.getItem(saveKey(currentMode.id, p.num));
    if (saved) card.classList.add("done");

    const img = document.createElement("img");
    img.src = saved || p.src;
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

// ---------- Colouring view setup ----------
function setupSidebarForMode() {
  const allTools = ["fill","brush","eraser","crayon","glitter","sticker"];
  allTools.forEach(t => {
    const btn = document.getElementById(`${t}-tool`);
    btn.hidden = !currentMode.tools.includes(t);
  });
  const firstTool = currentMode.tools[0];
  setTool(firstTool);

  document.getElementById("color-view").className =
    "view active" + (currentMode.variant === "glow" ? " color-view-glow" : "");

  buildPalette();
  document.getElementById("sticker-row").hidden = !currentMode.tools.includes("sticker");
  if (currentMode.tools.includes("sticker")) buildStickerRow();
}

function setTool(t) {
  tool = t;
  document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(`${t}-tool`);
  if (btn) btn.classList.add("active");
  document.getElementById("brush-size-wrap").hidden = (t === "fill" || t === "sticker");
}

function selectColorSwatch(index) {
  const swatches = document.querySelectorAll("#palette .swatch");
  swatches.forEach(s => s.classList.remove("selected"));
  if (swatches[index]) swatches[index].classList.add("selected");
  selectedColor = PALETTE[index];
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
    // still need a base colour for the pattern's ink
    const list = currentMode.palette;
    list.forEach((hex, i) => {
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
    selectedColor = list[0];
    return;
  }

  const list = currentMode.palette;
  list.forEach((hex, i) => {
    const sw = document.createElement("button");
    sw.className = "swatch" + (i === 0 ? " selected" : "");
    sw.style.background = hex;
    sw.setAttribute("aria-label", `Colour ${hex}`);
    if (currentMode.variant === "numbered") {
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
  selectedColor = list[0];
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
  undoStack = [];
  redoStack = [];
  numberMap = null;
  numberOf = null;
  numberBuilding = false;

  const key = saveKey(currentMode.id, p.num);
  const saved = localStorage.getItem(key);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    if (currentMode.variant === "glow" && !saved) invertToGlow();
    setupSidebarForMode();
    if (currentMode.variant === "numbered" && !saved) buildNumberRegions();
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
  undoStack = [];
  redoStack = [];
  canvas.width = 1000;
  canvas.height = 1300;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  setupSidebarForMode();
  pushUndo();
}

// Turn the white background + black line art into a black background with
// bright outlines, for the Glow Pen mode.
function invertToGlow() {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i+1] = 255 - d[i+1];
    d[i+2] = 255 - d[i+2];
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
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
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

// ---------- Pattern tiles (for Patterns mode) ----------
const patternTileCache = {};
function getPatternTile(patternId, hex) {
  const key = patternId + hex;
  if (patternTileCache[key]) return patternTileCache[key];

  const size = 20;
  const off = document.createElement("canvas");
  off.width = size; off.height = size;
  const octx = off.getContext("2d");
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, size, size);
  octx.fillStyle = hex;
  octx.strokeStyle = hex;

  if (patternId === "dots") {
    octx.beginPath(); octx.arc(size/2, size/2, size*0.28, 0, Math.PI*2); octx.fill();
  } else if (patternId === "stripes") {
    octx.lineWidth = size*0.35;
    octx.beginPath(); octx.moveTo(-2, size+2); octx.lineTo(size+2, -2); octx.stroke();
  } else if (patternId === "stars") {
    drawStar(octx, size/2, size/2, 4, size*0.42, size*0.18);
    octx.fill();
  } else if (patternId === "hearts") {
    drawHeart(octx, size/2, size/2, size*0.3);
    octx.fill();
  }

  const tile = octx.getImageData(0, 0, size, size);
  patternTileCache[key] = tile;
  return tile;
}

function drawStar(ctx2, cx, cy, spikes, outerR, innerR) {
  let rot = Math.PI / 2 * 3, x = cx, y = cy;
  const step = Math.PI / spikes;
  ctx2.beginPath();
  ctx2.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR; y = cy + Math.sin(rot) * outerR;
    ctx2.lineTo(x, y); rot += step;
    x = cx + Math.cos(rot) * innerR; y = cy + Math.sin(rot) * innerR;
    ctx2.lineTo(x, y); rot += step;
  }
  ctx2.lineTo(cx, cy - outerR);
  ctx2.closePath();
}

function drawHeart(ctx2, cx, cy, r) {
  ctx2.beginPath();
  ctx2.moveTo(cx, cy + r*0.6);
  ctx2.bezierCurveTo(cx + r*1.4, cy - r*0.6, cx + r*0.6, cy - r*1.4, cx, cy - r*0.3);
  ctx2.bezierCurveTo(cx - r*0.6, cy - r*1.4, cx - r*1.4, cy - r*0.6, cx, cy + r*0.6);
  ctx2.closePath();
}

// ---------- Number Paint: real region labelling ----------
// Scans the whole page once, finds every enclosed light region (the same
// way floodFill finds one), gives each a palette number, and stamps that
// number on the picture. Tapping a numbered region then fills it with
// that number's colour automatically.
function buildNumberRegions() {
  numberBuilding = true;
  showToast("Preparing numbers\u2026");

  // Let the toast paint before the (synchronous, sometimes slow-ish) scan.
  setTimeout(() => {
    const w = canvas.width, h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const idx = (x, y) => (y * w + x) * 4;
    const isBarrier = (x, y) => {
      const i = idx(x, y);
      return (data[i] + data[i+1] + data[i+2]) / 3 < 60;
    };

    numberMap = new Uint16Array(w * h);
    const regions = []; // {id, count, sumX, sumY}
    let nextId = 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (numberMap[p] !== 0 || isBarrier(x, y)) continue;

        // scanline flood fill to label this whole region
        const id = nextId++;
        let count = 0, sumX = 0, sumY = 0;
        const stack = [[x, y]];
        while (stack.length) {
          let [cx, cy] = stack.pop();
          if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
          const cp = cy * w + cx;
          if (numberMap[cp] !== 0 || isBarrier(cx, cy)) continue;

          let xl = cx;
          while (xl >= 0 && numberMap[cy*w+xl] === 0 && !isBarrier(xl, cy)) xl--;
          xl++;
          let xr = cx;
          while (xr < w && numberMap[cy*w+xr] === 0 && !isBarrier(xr, cy)) xr++;
          xr--;

          let spanAbove = false, spanBelow = false;
          for (let xi = xl; xi <= xr; xi++) {
            numberMap[cy*w+xi] = id;
            count++; sumX += xi; sumY += cy;
            if (cy > 0) {
              const above = numberMap[(cy-1)*w+xi] === 0 && !isBarrier(xi, cy-1);
              if (above && !spanAbove) { stack.push([xi, cy-1]); spanAbove = true; }
              else if (!above) spanAbove = false;
            }
            if (cy < h-1) {
              const below = numberMap[(cy+1)*w+xi] === 0 && !isBarrier(xi, cy+1);
              if (below && !spanBelow) { stack.push([xi, cy+1]); spanBelow = true; }
              else if (!below) spanBelow = false;
            }
          }
        }
        regions.push({ id, count, cx: sumX / count, cy: sumY / count });
      }
    }

    // Assign palette numbers only to regions big enough to matter; sort
    // top-to-bottom, left-to-right so numbering reads naturally.
    const MIN_AREA = Math.max(1400, Math.round(w * h * 0.006));
    const numbered = regions.filter(r => r.count >= MIN_AREA)
      .sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));

    numberOf = {};
    numbered.forEach((r, i) => { numberOf[r.id] = (i % PALETTE.length) + 1; });

    // Draw the number labels on top of the artwork.
    const fontSize = Math.max(16, Math.round(Math.min(w, h) * 0.03));
    ctx.font = `800 ${fontSize}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    numbered.forEach(r => {
      const n = numberOf[r.id];
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = PALETTE[n-1];
      ctx.lineWidth = 3;
      ctx.strokeText(String(n), r.cx, r.cy);
      ctx.fillText(String(n), r.cx, r.cy);
    });

    numberBuilding = false;
    pushUndo();
    showToast("Ready! Tap a number \u2728");
  }, 30);
}


// sampler(x,y) -> [r,g,b,a]; used for solid colour or a pattern tile lookup.
function floodFill(startX, startY, sampler, animate) {
  const w = canvas.width, h = canvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const idx = (x, y) => (y * w + x) * 4;

  const startIdx = idx(startX, startY);
  const startR = data[startIdx], startG = data[startIdx+1],
        startB = data[startIdx+2], startA = data[startIdx+3];

  const brightness = (startR + startG + startB) / 3;
  const isGlow = currentMode && currentMode.variant === "glow";
  // On glow (inverted) pages the "outline barrier" is bright, not dark.
  const isBarrier = isGlow ? (v => v > 200) : (v => v < 60);
  if (isBarrier(brightness)) return;

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
  const filledRows = []; // for the Color Rain animation

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

  if (animate) {
    animateRainReveal(imgData, visited, w, h);
  } else {
    ctx.putImageData(imgData, 0, 0);
  }
}

// Color Rain: reveal the newly-filled pixels top row to bottom row.
function animateRainReveal(finalImgData, visited, w, h) {
  const before = ctx.getImageData(0, 0, w, h);
  const totalSteps = 24;
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
    if (cutoff < h) requestAnimationFrame(frame);
    else pushUndo();
  }
  requestAnimationFrame(frame);
}

function solidSampler(hex) {
  const [r,g,b,a] = hexToRGBA(hex);
  return () => [r,g,b,a];
}

function patternSampler(patternId, hex) {
  const tile = getPatternTile(patternId, hex);
  const size = 20;
  return (x, y) => {
    const tx = ((x % size) + size) % size;
    const ty = ((y % size) + size) % size;
    const i = (ty*size+tx)*4;
    return [tile.data[i], tile.data[i+1], tile.data[i+2], 255];
  };
}

// ---------- Brush-family tools ----------
function brushStroke(x, y) {
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
  // default: brush / doodle
  ctx.fillStyle = selectedColor;
  ctx.beginPath(); ctx.arc(x, y, brushSize/2, 0, Math.PI*2); ctx.fill();
}

function brushLine(from, to) {
  if (currentMode.variant === "pixel" && tool !== "eraser") {
    brushStroke(to.x, to.y); // blocky stamps rather than a smooth line
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
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(selectedSticker, x, y);
}

// ---------- Controls wiring ----------
function wireControls() {
  document.getElementById("gallery-back-btn").addEventListener("click", () => {
    galleryView.classList.remove("active");
    modeView.classList.add("active");
  });
  document.getElementById("back-btn").addEventListener("click", closePage);

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

  document.getElementById("save-btn").addEventListener("click", () => {
    if (!currentPage) return;
    try {
      if (currentMode.variant !== "blank") {
        localStorage.setItem(saveKey(currentMode.id, currentPage.num), canvas.toDataURL());
      }
      celebrate();
    } catch (e) {
      showToast("Couldn't save \u2014 storage full");
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
    let fillColor = selectedColor;
    if (currentMode.variant === "numbered" && numberMap && !numberBuilding) {
      const id = numberMap[pt.y * canvas.width + pt.x];
      const n = id && numberOf[id];
      if (n) {
        fillColor = PALETTE[n - 1];
        selectColorSwatch(n - 1);
      }
    }
    const sampler = (currentMode.variant === "patterns")
      ? patternSampler(selectedPattern, selectedColor)
      : solidSampler(fillColor);
    floodFill(pt.x, pt.y, sampler, currentMode.variant === "rain");
    if (currentMode.variant !== "rain") pushUndo();
  } else if (tool === "sticker") {
    placeSticker(pt.x, pt.y);
    pushUndo();
  } else {
    drawing = true;
    lastPt = pt;
    brushStroke(pt.x, pt.y);
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
  if (drawing) { drawing = false; pushUndo(); }
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
