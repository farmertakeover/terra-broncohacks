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
  set('impact-streak-title', d.streak + '-day streak');
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
let _lastDetectedCode = null;
let _lastDetectedAt   = 0;

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

function loadZXing() {
  return new Promise(resolve => {
    if (window.ZXing) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.0/umd/index.min.js';
    s.onload = resolve;
    s.onerror = resolve;
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
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!r.ok) return null;
    const data = await r.json();
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
  const score  = ecoMap[eco] || 5;
  const co2    = p.ecoscore_data?.agribalyse?.co2_total ?? null;
  const pack   = p.packaging || 'Unknown packaging';
  const origin = p.origins || p.countries || 'Unknown origin';
  const labels = p.labels || 'None';
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
  };
  return { name, brand, code, em, score, co2: co2 != null ? +co2.toFixed(2) : 0, water: 0, pack, origin, cert: labels, details, alts: [] };
}

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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera();
});
