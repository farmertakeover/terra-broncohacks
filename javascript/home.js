<<<<<<< Updated upstream
// ── PER-ACCOUNT DATA ──
function userKey() {
  try {
    const u = JSON.parse(localStorage.getItem('eco_user') || '{}');
    return u.email ? 'eco_data_' + u.email : 'eco_data_guest';
  } catch(e) { return 'eco_data_guest'; }
}

function blankData() {
  return { tokens: 0, streak: 0, bestStreak: 0, lastScanDate: null, recentScans: [], waterSaved: 0, co2Avoided: 0, ecoSwaps: 0, totalScans: 0 };
}

function loadData() {
  try { return Object.assign(blankData(), JSON.parse(localStorage.getItem(userKey())) || {}); }
  catch(e) { return blankData(); }
}

function saveData(d) { localStorage.setItem(userKey(), JSON.stringify(d)); }

function todayStr() { return new Date().toISOString().slice(0, 10); }

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000)  return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return new Date(ts).toLocaleDateString();
}

function scoreClass(s) { return s >= 7 ? 'sg' : s >= 4 ? 'sw' : 'sb'; }
function scoreBg(s)    { return s >= 7 ? '#eaf3de' : s >= 4 ? '#fef3e2' : '#fdeaea'; }

function renderHomeStats(d) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('stat-streak',         d.streak);
  set('stat-tokens',         d.tokens);
  set('impact-water',        d.waterSaved);
  set('impact-co2',          d.co2Avoided);
  set('impact-swaps',        d.ecoSwaps);
  set('impact-water2',       d.waterSaved);
  set('impact-co22',         d.co2Avoided);
  set('impact-swaps2',       d.ecoSwaps);
  set('impact-total-scans',  d.totalScans);
  set('impact-streak-title', '🔥 ' + d.streak + '-day streak');
  set('impact-streak-best',  'Best: ' + d.bestStreak);
  set('rewards-tokens',      d.tokens);

  const toRow = s => `
    <div class="rr" onclick="doScan('${s.key}')">
      <div class="ric" style="background:${scoreBg(s.score)}">${s.em}</div>
      <div class="ri"><div class="rn">${s.name}</div><div class="rm">${timeAgo(s.ts)}</div></div>
      <div class="sp ${scoreClass(s.score)}">${s.score}</div>
    </div>`;
  const empty = '<div style="padding:18px;text-align:center;color:var(--ash);font-size:13px">No scans yet — tap Scan to start!</div>';

  const homeCard = document.getElementById('recent-card-home');
  if (homeCard) homeCard.innerHTML = d.recentScans.length ? d.recentScans.slice(0,5).map(toRow).join('') : empty;

  const impactCard = document.getElementById('recent-card-impact');
  if (impactCard) impactCard.innerHTML = d.recentScans.length ? d.recentScans.slice(0,10).map(toRow).join('') : empty;
}

function recordScan(prod, key) {
  const d = loadData();
  d.tokens     += 10;
  d.totalScans += 1;

  const today     = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d.lastScanDate !== today) {
    d.streak       = d.lastScanDate === yesterday ? d.streak + 1 : 1;
    d.lastScanDate = today;
    d.bestStreak   = Math.max(d.bestStreak, d.streak);
  }

  if (prod.score >= 7) {
    d.waterSaved = +(d.waterSaved + Math.round((prod.water || 0) / 3.785)).toFixed(0);
    d.co2Avoided = +(d.co2Avoided + +((prod.co2 || 0) * 2.205).toFixed(1)).toFixed(1);
    d.ecoSwaps  += 1;
  }

  d.recentScans.unshift({ key, name: prod.name, em: prod.em, score: prod.score, ts: Date.now() });
  d.recentScans = d.recentScans.slice(0, 10);
  saveData(d);
  renderHomeStats(d);
}

// ── LIVE CAMERA + BARCODE SCANNER ──
let _camStream        = null;
let _zxingReader      = null;
let _scanning         = false;
=======
// ── CONFIG — paste your Anthropic API key here ──
const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE';

// ── SIGN-IN GUARD ──
(function () {
  let user = null;
  try { user = JSON.parse(localStorage.getItem('eco_user') || 'null'); } catch (e) {}
  if (!user || !user.name) { window.location.replace('signin.html'); return; }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('home-greet');
  if (el) el.textContent = greeting + ', ' + user.name;
})();

// ── CAMERA STATE ──
let _camStream = null;
let _scanInterval = null;
let _detector = null;
let _zxingReader = null;
let _scanning = false;
>>>>>>> Stashed changes
let _lastDetectedCode = null;
let _lastDetectedAt   = 0;

<<<<<<< Updated upstream
function showCamScreen(which) {
  ['cam-permission', 'cam-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === which ? 'flex' : 'none';
  });
}

function setCamError(title, text) {
  const t = document.getElementById('cam-error-title');
  const b = document.getElementById('cam-error-text');
  if (t) t.textContent = title;
  if (b) b.textContent = text;
  showCamScreen('cam-error');
}

=======
function showCamError(show, title, text) {
  const el = document.getElementById('cam-error');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  if (show && title) document.getElementById('cam-error-title').textContent = title;
  if (show && text)  document.getElementById('cam-error-text').textContent  = text;
}

async function startCamera() {
  if (_scanning) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCamError(true, 'Camera not supported', 'Try Chrome or Safari over HTTPS or localhost.');
    return;
  }
  if (!window.isSecureContext) {
    showCamError(true, 'HTTPS required', 'Camera only works on https:// or localhost. Open via a tunnel and try again.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    _camStream = stream;
    const video = document.getElementById('cam-video');
    video.srcObject = stream;
    await video.play().catch(() => {});
    showCamError(false);
    document.getElementById('scan-hint').textContent = 'Point at a product barcode';
    _scanning = true;
    startScanLoop(video);
  } catch (err) {
    if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
      showCamError(true, 'Camera permission denied', 'Tap the lock icon in the address bar, allow Camera, then reload.');
    } else if (err && err.name === 'NotFoundError') {
      showCamError(true, 'No camera found', 'This device doesn\'t seem to have a camera available.');
    } else {
      showCamError(true, 'Camera error', (err && err.message) ? err.message : 'Could not start the camera.');
    }
  }
}

function stopCamera() {
  _scanning = false;
  if (_scanInterval) { clearInterval(_scanInterval); _scanInterval = null; }
  if (_zxingReader && _zxingReader.reset) { try { _zxingReader.reset(); } catch (_) {} }
  _zxingReader = null;
  if (_camStream) { _camStream.getTracks().forEach(t => t.stop()); _camStream = null; }
  const video = document.getElementById('cam-video');
  if (video) { try { video.pause(); } catch (_) {} video.srcObject = null; }
  _lastDetectedCode = null;
}

async function startScanLoop(video) {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      _detector = new window.BarcodeDetector({
        formats: formats.length ? formats : ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf']
      });
      _scanInterval = setInterval(() => nativeDetect(video), 350);
      return;
    } catch (_) { /* fall through to ZXing */ }
  }
  await loadZXing();
  if (!window.ZXing) {
    document.getElementById('scan-hint').textContent = 'Live scanning unavailable — tap a product below';
    return;
  }
  try {
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,  ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.QR_CODE
    ]);
    _zxingReader = new ZXing.BrowserMultiFormatReader(hints, 300);
    _zxingReader.decodeFromVideoElement(video, (result) => {
      if (result && _scanning) onCodeDetected(result.getText());
    });
  } catch (e) {
    document.getElementById('scan-hint').textContent = 'Live scanning unavailable — tap a product below';
  }
}

async function nativeDetect(video) {
  if (!_scanning || !_detector || video.readyState < 2) return;
  try {
    const codes = await _detector.detect(video);
    if (codes && codes.length) onCodeDetected(codes[0].rawValue);
  } catch (_) {}
}

>>>>>>> Stashed changes
function loadZXing() {
  return new Promise(resolve => {
    if (window.ZXing) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.0/umd/index.min.js';
<<<<<<< Updated upstream
    s.onload = resolve;
    s.onerror = resolve;
=======
    s.onload = () => resolve();
    s.onerror = () => resolve();
>>>>>>> Stashed changes
    document.head.appendChild(s);
  });
}

// Pre-load ZXing so it is ready before the user taps Scan
setTimeout(loadZXing, 800);

async function startCamera() {
  if (_scanning) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamError('Camera not supported', 'Try Safari or Chrome on https://');
    return;
  }
  if (!window.isSecureContext) {
    setCamError('HTTPS required', 'Camera access requires https:// or localhost.');
    return;
  }

  await loadZXing();
  if (!window.ZXing) {
    setCamError('Scanner failed to load', 'Please refresh and try again.');
    return;
  }

  let stream;
  try {
    // No width/height ideals — causes OverconstrainedError on many iOS devices
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      setCamError('Camera permission denied', 'Allow camera in your browser settings, then reload.');
    } else if (err.name === 'NotFoundError') {
      setCamError('No camera found', "This device doesn't seem to have a camera.");
    } else {
      setCamError('Camera error', err.message || 'Could not start the camera.');
    }
    return;
  }

  _camStream = stream;
  _scanning  = true;
  showCamScreen(null);
  const hint = document.getElementById('scan-hint');
  if (hint) hint.textContent = 'Point at a product barcode';

  const video = document.getElementById('cam-video');
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,  ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.ITF,    ZXing.BarcodeFormat.QR_CODE
  ]);
  _zxingReader = new ZXing.BrowserMultiFormatReader(hints, 300);

  // decodeFromStream attaches the MediaStream internally — required on iOS Safari
  // because canvas.drawImage(video) is blocked when srcObject is set externally
  _zxingReader.decodeFromStream(stream, video, (result, err) => {
    if (result && _scanning) onCodeDetected(result.getText());
  }).catch(err => {
    if (_scanning) setCamError('Scanner error', err.message || 'Could not read camera frames.');
  });
}

function stopCamera() {
  _scanning = false;
  if (_zxingReader) { try { _zxingReader.reset(); } catch(_){} _zxingReader = null; }
  if (_camStream)   { _camStream.getTracks().forEach(t => t.stop()); _camStream = null; }
  const video = document.getElementById('cam-video');
  if (video) { try { video.pause(); } catch(_){} video.srcObject = null; }
  _lastDetectedCode = null;
  _lastDetectedAt   = 0;
}

function onCodeDetected(rawCode) {
  if (!_scanning || !rawCode) return;
  const code = String(rawCode).trim();
<<<<<<< Updated upstream
  const now  = Date.now();
  if (code === _lastDetectedCode && (now - _lastDetectedAt) < 2500) return;
  _lastDetectedCode = code;
  _lastDetectedAt   = now;
  if (navigator.vibrate) navigator.vibrate(60);
  const hint = document.getElementById('scan-hint');
  if (hint) hint.textContent = 'Detected: ' + code;
  doScanByCode(code);
}

function barcodeVariants(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return [];
  const out = new Set();
  out.add(digits);
  if (digits.length === 12) {
    out.add('0' + digits);
    out.add(digits.replace(/^0+/, ''));
  } else if (digits.length === 13) {
    if (digits.startsWith('0')) out.add(digits.slice(1));
    out.add(digits.replace(/^0+/, ''));
  } else if (digits.length === 11) {
    out.add('0' + digits);
    out.add('00' + digits);
  } else if (digits.length === 8) {
    out.add(digits);
  } else {
    out.add(digits.replace(/^0+/, ''));
    out.add('0' + digits);
  }
  return Array.from(out).filter(c => c && c.length >= 6 && c.length <= 14);
}

function findLocalProduct(code) {
  const variants = barcodeVariants(code);
  return Object.keys(P).find(k => {
    const local = String(P[k].code || '').replace(/[^0-9]/g, '');
    return variants.some(v => v === local || v === local.replace(/^0+/, ''));
  });
}

async function doScanByCode(code) {
  stopCamera();
  const localKey = findLocalProduct(code);
  if (localKey) return doScan(localKey);
  await lookupAndScan(code);
}

async function fetchOFFVariant(code) {
=======
  const now = Date.now();
  if (code === _lastDetectedCode && (now - _lastDetectedAt) < 2500) return;
  _lastDetectedCode = code;
  _lastDetectedAt = now;
  if (navigator.vibrate) navigator.vibrate(60);
  document.getElementById('scan-hint').textContent = 'Detected: ' + code;
  doScanByCode(code);
}

// ── MANUAL BARCODE ENTRY ──
function manualBarcodeEntry() {
  const modal = document.getElementById('barcode-modal');
  const input = document.getElementById('barcode-input');
  if (!modal || !input) return;
  input.value = '';
  input.classList.remove('error');
  modal.classList.add('show');
  setTimeout(() => input.focus(), 80);
}

function closeManualEntry() {
  const modal = document.getElementById('barcode-modal');
  if (modal) modal.classList.remove('show');
}

function submitManualBarcode() {
  const input = document.getElementById('barcode-input');
  if (!input) return;
  const code = input.value.replace(/[^0-9]/g, '');
  if (code.length < 6) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 1200);
    return;
  }
  closeManualEntry();
  stopCamera();
  doScanByCode(code);
}

(function () {
  const input = document.getElementById('barcode-input');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') submitManualBarcode(); });
})();

// ── SCAN DISPATCH ──
async function doScanByCode(code) {
  const clean = code.replace(/[^0-9]/g, '');
  const localKey = Object.keys(P).find(k => P[k].code && P[k].code.replace(/[^0-9]/g, '') === clean);
  if (localKey) { stopCamera(); return doScan(localKey); }
  stopCamera();
  await lookupAndScan(clean);
}

// ── OPEN FOOD FACTS + AI LOOKUP ──
async function lookupAndScan(code) {
  showScr('scan');
  const ov = document.getElementById('anlz');
  if (ov) ov.classList.add('on');
>>>>>>> Stashed changes
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!r.ok) return null;
    const data = await r.json();
<<<<<<< Updated upstream
    if (data && data.status === 1 && data.product) return { variant: code, product: data.product };
    return null;
  } catch(e) { return null; }
}

async function lookupOFFAnyVariant(code) {
  const variants = barcodeVariants(code);
  if (!variants.length) return null;
  return new Promise(resolve => {
    let remaining = variants.length, resolved = false;
    variants.forEach(v => {
      fetchOFFVariant(v).then(hit => {
        if (resolved) return;
        if (hit) { resolved = true; resolve(hit); return; }
        remaining--;
        if (remaining === 0 && !resolved) { resolved = true; resolve(null); }
      });
    });
  });
}

async function lookupAndScan(code) {
  if (typeof showScr === 'function') showScr('scan');
  const ov = document.getElementById('anlz');
  if (ov) ov.classList.add('on');
  try {
    const hit = await lookupOFFAnyVariant(code);
    if (hit) {
      const prod = productFromOFF(hit.product, hit.variant);
      const ai   = await fetchAI(prod);
      if (ov) ov.classList.remove('on');
      if (typeof renderResult === 'function') renderResult(prod, ai);
      if (typeof showScr === 'function') showScr('result');
      recordScan(prod, hit.variant);
      if (typeof toast === 'function') toast('+10 🌿 tokens earned!');
      return;
    }
    if (ov) ov.classList.remove('on');
    if (typeof toast === 'function') toast('Barcode ' + code + ' not in Open Food Facts');
    const scanScr = document.getElementById('s-scan');
    if (scanScr && scanScr.classList.contains('on')) setTimeout(startCamera, 600);
  } catch(e) {
    if (ov) ov.classList.remove('on');
    if (typeof toast === 'function') toast('Lookup failed — check connection');
    const scanScr = document.getElementById('s-scan');
    if (scanScr && scanScr.classList.contains('on')) setTimeout(startCamera, 600);
=======
    if (data && data.status === 1 && data.product) {
      const prod = productFromOFF(data.product, code);
      const ai = await fetchAI(prod);
      if (ai && ai.score >= 1 && ai.score <= 10) {
        prod.score = ai.score;
        prod.em = prod.score >= 8 ? '🌿' : prod.score >= 6 ? '🥗' : prod.score >= 4 ? '📦' : '⚠️';
        prod.details['Score basis'] = 'Claude AI — environmental assessment';
      }
      if (ov) ov.classList.remove('on');
      renderResult(prod, ai || localAI(prod));
      showScr('result');
      toast('+10 🌿 tokens earned!');
      if (typeof recordScan === 'function') recordScan(prod, code);
      return;
    }
    if (ov) ov.classList.remove('on');
    toast('Barcode ' + code + ' not found in database');
    setTimeout(() => { if (document.getElementById('s-scan').classList.contains('on')) startCamera(); }, 600);
  } catch (e) {
    if (ov) ov.classList.remove('on');
    toast('Lookup failed — check connection');
    setTimeout(() => { if (document.getElementById('s-scan').classList.contains('on')) startCamera(); }, 600);
>>>>>>> Stashed changes
  }
}

function manualBarcodeEntry() {
  const input = window.prompt('Enter a product barcode (8–13 digits):', '');
  if (input == null) return;
  const code = String(input).replace(/[^0-9]/g, '');
  if (code.length < 6) { if (typeof toast === 'function') toast("That doesn't look like a barcode"); return; }
  doScanByCode(code);
}

function productFromOFF(p, code) {
  const name   = p.product_name || p.generic_name || 'Unknown product';
  const brand  = (p.brands || 'Unknown brand').split(',')[0].trim();
  const eco    = (p.ecoscore_grade || '').toLowerCase();
  const ecoMap = { a: 9, b: 7, c: 5, d: 3, e: 2 };
<<<<<<< Updated upstream
  const score  = ecoMap[eco] || 5;
=======
>>>>>>> Stashed changes
  const co2    = p.ecoscore_data?.agribalyse?.co2_total ?? null;
  const pack   = p.packaging || 'Unknown packaging';
  const origin = p.origins || p.countries || 'Unknown origin';
  const labels = p.labels || 'None';
<<<<<<< Updated upstream
  const em     = score >= 8 ? '🌿' : score >= 6 ? '🥗' : score >= 4 ? '📦' : '⚠️';
  const details = {
    'Eco-Score':  eco ? eco.toUpperCase() : 'Unknown',
    'CO₂ / kg':  co2 != null ? `${co2.toFixed(1)} kg CO₂` : 'Not reported',
    'Packaging':  pack,
    'Origin':     origin,
    'Labels':     labels,
    'Categories': (p.categories || 'N/A').split(',').slice(0,3).join(', '),
    'Brand':      brand,
    'Source':     'Open Food Facts'
=======
  const labelTags = p.labels_tags || [];
  const isOrganic = labelTags.some(l => l.includes('organic'));

  let score, scoreSource;
  if (ecoMap[eco] !== undefined) {
    score = ecoMap[eco];
    scoreSource = `Eco-Score ${eco.toUpperCase()}`;
  } else if (p.ecoscore_score != null && p.ecoscore_score >= 0) {
    score = Math.max(1, Math.min(10, Math.round(p.ecoscore_score / 10)));
    scoreSource = `Eco-Score ${p.ecoscore_score}/100`;
  } else {
    const nova = p.nova_group;
    const novaMap = { 1: 8, 2: 6, 3: 4, 4: 2 };
    const novaBase = novaMap[nova];
    if (novaBase !== undefined) {
      score = Math.min(10, novaBase + (isOrganic ? 1 : 0));
      scoreSource = `Estimated (NOVA ${nova}${isOrganic ? ', Organic' : ''})`;
    } else {
      score = 5;
      scoreSource = 'Insufficient data';
    }
  }

  const em = score >= 8 ? '🌿' : score >= 6 ? '🥗' : score >= 4 ? '📦' : '⚠️';
  return {
    name, brand, code, em, score,
    co2: co2 != null ? +co2.toFixed(2) : 0,
    water: 0,
    pack, origin, cert: labels,
    alts: [],
    details: {
      'Score basis': scoreSource,
      'CO₂ / kg': co2 != null ? `${co2.toFixed(1)} kg CO₂` : 'Not reported',
      'Packaging': pack,
      'Origin': origin,
      'Labels': labels,
      'Categories': (p.categories || 'N/A').split(',').slice(0, 3).join(', '),
      'Brand': brand,
      'Source': 'Open Food Facts'
    },
    _offRaw: {
      nova_group: p.nova_group,
      ecoscore_grade: p.ecoscore_grade,
      ecoscore_score: p.ecoscore_score,
      categories: p.categories,
      labels: p.labels,
      packaging_tags: p.packaging_tags,
      packaging_materials_tags: p.packaging_materials_tags,
      ingredients_analysis_tags: p.ingredients_analysis_tags,
      additives_n: p.additives_n,
      packaging_score: p.ecoscore_data?.adjustments?.packaging?.value
    }
>>>>>>> Stashed changes
  };
  return { name, brand, code, em, score, co2: co2 != null ? +co2.toFixed(2) : 0, water: 0, pack, origin, cert: labels, details, alts: [] };
}

<<<<<<< Updated upstream
// ── INIT ──
(function() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem('eco_user') || 'null'); } catch(e) {}
  if (!user || !user.name) {
    window.location.replace('signin.html');
    return;
  }
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetEl  = document.getElementById('home-greet');
  if (greetEl) greetEl.textContent = greeting + ', ' + user.name;
  window.__ecoUser = user;

  // Reset streak if user missed a day
  const d         = loadData();
  const today     = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d.lastScanDate && d.lastScanDate !== today && d.lastScanDate !== yesterday) {
    d.streak = 0;
    saveData(d);
  }
  renderHomeStats(d);
})();
=======
// ── ENVIRONMENTAL AI SCORING ──
async function fetchAI(p) {
  try {
    const raw = p._offRaw;
    const packTagArr = raw?.packaging_tags || [];
    const packMatArr = raw?.packaging_materials_tags || [];
    const ingredArr  = raw?.ingredients_analysis_tags || [];
    const catStr     = (raw?.categories || '').toLowerCase();
    const searchStr  = (p.name + ' ' + p.brand + ' ' + (p.pack || '')).toLowerCase();

    // Detect single-use plastic even when database tags are absent
    const isPlasticBottle =
      packTagArr.some(t => /plastic.bottle|en:pet$|en:hdpe|single.use|disposable/i.test(t)) ||
      packMatArr.some(t => /^en:pet$|polyethylene|polypropylene|^en:plastic/i.test(t)) ||
      /plastic bottle/i.test(searchStr) ||
      /purified water|spring water|mineral water|bottled water|drinking water/i.test(searchStr) ||
      (catStr.includes('water') && !packTagArr.some(t => /glass|alumin|can/i.test(t)));

    const isNonRecyclable = !isPlasticBottle && (
      packTagArr.some(t => /non.recyclable|mylar|multilayer|sachet|pouch|film/i.test(t)) ||
      /mylar|non.recyclable|multilayer/i.test(searchStr + ' ' + (p.pack || ''))
    );

    const hasPalmOil  = ingredArr.some(t => t.includes('palm-oil') && !t.includes('not'));
    const hasRSPO     = ingredArr.some(t => /rspo|sustainable.palm/i.test(t));
    const isOrganic   = /organic/i.test(raw?.labels || '') || ingredArr.some(t => /^en:organic/.test(t));
    const isFairTrade = /fair.trade|fairtrade/i.test(raw?.labels || '');
    const nova = raw?.nova_group;

    const packSummary = isPlasticBottle
      ? 'SINGLE-USE PLASTIC BOTTLE detected — mandatory −4 penalty'
      : isNonRecyclable
        ? 'NON-RECYCLABLE PACKAGING detected — mandatory −3 penalty'
        : (packTagArr.slice(0, 6).join(', ') || packMatArr.slice(0, 4).join(', ') || p.pack || 'Unknown');

    const extraData = raw ? `
NOVA processing level: ${nova || 'Unknown'} (1=whole food, 4=heavy industrial manufacturing)
Eco-Score grade: ${raw.ecoscore_grade || 'N/A'} | Eco-Score: ${raw.ecoscore_score ?? 'N/A'}/100
Product categories: ${(raw.categories || 'N/A').split(',').slice(0, 5).join(', ')}
Certifications: ${raw.labels || 'None'}
PACKAGING: ${packSummary}
Packaging tags: ${packTagArr.slice(0, 10).join(', ') || 'None in database'}
Packaging materials: ${packMatArr.slice(0, 8).join(', ') || 'None in database'}
Palm oil: ${hasPalmOil ? (hasRSPO ? 'YES — RSPO certified' : 'YES — NOT RSPO certified → −3 penalty') : 'Not detected'}
Organic: ${isOrganic ? 'YES → +2 bonus' : 'No'} | Fair trade: ${isFairTrade ? 'YES → +1 bonus' : 'No'}
Additives: ${raw.additives_n ?? 'Unknown'} | CO₂: ${p.co2 > 0 ? p.co2 + ' kg/kg' : 'Not reported'}`
    : `Pre-calculated score: ${p.score}/10`;

    const scoringBlock = raw ? `
══════ ENVIRONMENTAL SCORING RULES ══════
Score 1–10 = PLANET IMPACT ONLY.
Measures: packaging waste & plastic pollution, carbon emissions,
ecosystem damage, manufacturing harm.
IGNORE nutrition, calories, health, taste completely.

KEY PRINCIPLE: A plastic water bottle = 1/10 because
single-use plastic is an environmental disaster — the water
quality is irrelevant. A local burger can outscore bottled water.

Baseline = 5. Apply ALL matching rules. Clamp result to 1–10.

PENALTIES (subtract):
  Single-use plastic bottle/container .............. −4
  Non-recyclable packaging (Mylar/multilayer/film) . −3
  Any plastic packaging not confirmed recyclable ... −2
  Palm oil WITHOUT RSPO certification .............. −3
  NOVA 4 — heavy industrial manufacturing .......... −2
  NOVA 3 — significant processing .................. −1
  CO₂ > 10 kg/kg: −3 | 5–10: −2 | 2–5: −1
  More than 5 additives (chemical manufacturing) ... −1
  Very distant or unknown origin ................... −1

BONUSES (add):
  Certified organic ................................. +2
  Confirmed recyclable/compostable packaging ........ +1
  NOVA 1 — whole food, minimal processing ........... +2
  NOVA 2 — light processing ......................... +1
  CO₂ < 1 kg/kg: +2 | CO₂ 1–2 kg/kg: +1
  Fair trade certified .............................. +1
  Local or regional sourcing ...................... +1
════════════════════════════════════════` : '';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-allow-any-origin': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are an environmental sustainability analyst. Score this product's ENVIRONMENTAL IMPACT (1–10) based ONLY on packaging waste & plastic pollution, carbon emissions, ecosystem damage, and manufacturing harm. Nutrition and health are COMPLETELY IRRELEVANT.

Product: ${p.name} by ${p.brand}
Packaging: ${p.pack} | Origin: ${p.origin} | Certifications: ${p.cert}
${extraData}
${scoringBlock}

Reply ONLY in valid JSON — no markdown, no text outside the object:
{"score":integer 1-10,"headline":"≤12 words naming the main environmental harm","explanation":"2-3 sentences ≤60 words: state score, list each penalty/bonus with its numeric value, cite actual data","top_concern":"≤7 words — worst environmental harm","positive":"≤7 words or 'None significant'"}`
        }]
      })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return JSON.parse((d.content?.[0]?.text || '').replace(/```json|```/g, '').trim());
  } catch (e) { return localAI(p); }
}

function localAI(p) {
  let score = p.score;
  const nameLow = (p.name + ' ' + p.brand).toLowerCase();
  const packLow = (p.pack || '').toLowerCase();
  const isPlasticBottle = /purified water|spring water|mineral water|bottled water|drinking water/i.test(nameLow)
    || /plastic bottle|pet bottle/i.test(packLow);
  const isNonRecyclable = /mylar|non.recyclable|multilayer/i.test(packLow);

  if (isPlasticBottle)      score = Math.max(1, score - 4);
  else if (isNonRecyclable) score = Math.max(1, score - 3);

  const h = score >= 8 ? 'Low environmental footprint across all categories.'
    : score >= 6 ? 'Moderate impact — some environmental concerns.'
    : score >= 4 ? 'Significant environmental concerns.'
    : 'High environmental harm — poor sustainability profile.';

  const ex = isPlasticBottle
    ? 'Single-use plastic bottles are a major environmental harm — PET is petroleum-derived and only ~30% is actually recycled. The product may be fine but the packaging is an environmental disaster.'
    : score >= 7
      ? `Low environmental footprint (CO₂: ${p.co2 || 'unknown'} kg/kg). ${p.cert && p.cert !== 'None' ? p.cert + ' certification confirms responsible practices.' : 'Packaging and origin have limited environmental burden.'}`
      : `Significant environmental concerns. ${isNonRecyclable ? 'Non-recyclable packaging cannot be recovered from waste streams.' : 'Better alternatives exist with a lower environmental footprint.'}`;

  const concern = isPlasticBottle  ? 'Single-use plastic bottle pollution'
    : isNonRecyclable               ? 'Non-recyclable packaging waste'
    : p.co2 > 10                    ? 'Very high GHG emissions'
    :                                 'No sustainability certifications';

  const pos = score < 4 ? 'None significant'
    : p.cert && p.cert !== 'None' ? p.cert + ' certified'
    : p.co2 > 0 && p.co2 < 2     ? 'Relatively low carbon footprint'
    : 'Lower than conventional options';

  return { score, headline: h, explanation: ex, top_concern: concern, positive: pos };
}
>>>>>>> Stashed changes

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera();
});
