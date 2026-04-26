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
let _camStream   = null;
let _zxingReader = null;
let _scanning    = false;
let _lastCode    = null;
let _lastCodeAt  = 0;

function showCamError(show, title, text) {
  const el = document.getElementById('cam-error');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  if (show && title) document.getElementById('cam-error-title').textContent = title;
  if (show && text)  document.getElementById('cam-error-text').textContent  = text;
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
setTimeout(loadZXing, 800);

async function startCamera() {
  if (_scanning) return;
  showCamError(false);

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCamError(true, 'Camera not supported', 'Try Safari or Chrome on https://');
    return;
  }
  if (!window.isSecureContext) {
    showCamError(true, 'HTTPS required', 'Camera access requires https:// or localhost.');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
  } catch(e) {
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
      showCamError(true, 'Camera permission denied', 'Allow camera in your browser settings, then reload.');
    } else if (e.name === 'NotFoundError') {
      showCamError(true, 'No camera found', "This device doesn't seem to have a camera.");
    } else {
      showCamError(true, 'Camera error', e.message || 'Could not start the camera.');
    }
    return;
  }

  _camStream = stream;
  _scanning  = true;

  // Native BarcodeDetector — Android Chrome only
  if ('BarcodeDetector' in window) {
    const video = document.getElementById('cam-video');
    video.srcObject = stream;
    await video.play();
    const bd = new BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'] });
    const tick = async () => {
      if (!_scanning) return;
      try {
        const codes = await bd.detect(video);
        if (codes.length) { onCodeDetected(codes[0].rawValue); return; }
      } catch(e) {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return;
  }

  // ZXing UMD fallback — PC + iOS Safari
  await loadZXing();
  if (!window.ZXing) {
    showCamError(true, 'Scanner failed to load', 'Please refresh and try again.');
    return;
  }
  const video = document.getElementById('cam-video');
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,  ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.ITF,    ZXing.BarcodeFormat.QR_CODE
  ]);
  _zxingReader = new ZXing.BrowserMultiFormatReader(hints, 300);
  // decodeFromStream sets srcObject internally — required on iOS Safari
  _zxingReader.decodeFromStream(stream, video, (result) => {
    if (result && _scanning) onCodeDetected(result.getText());
  }).catch(e => {
    if (_scanning) showCamError(true, 'Scanner error', e.message || 'Could not read camera frames.');
  });
}

function onCodeDetected(rawCode) {
  if (!_scanning || !rawCode) return;
  const code = String(rawCode).trim();
  const now  = Date.now();
  if (code === _lastCode && (now - _lastCodeAt) < 2500) return;
  _lastCode   = code;
  _lastCodeAt = now;
  if (navigator.vibrate) navigator.vibrate(60);
  const hint = document.getElementById('scan-hint');
  if (hint) hint.textContent = 'Detected: ' + code;
  doScanByCode(code);
}

function stopCamera() {
  _scanning = false;
  if (_zxingReader) { try { _zxingReader.reset(); } catch(e) {} _zxingReader = null; }
  if (_camStream)   { _camStream.getTracks().forEach(t => t.stop()); _camStream = null; }
  const video = document.getElementById('cam-video');
  if (video) { try { video.pause(); } catch(e) {} video.srcObject = null; }
  _lastCode   = null;
  _lastCodeAt = 0;
}

// ── MANUAL BARCODE ENTRY ──
function manualBarcodeEntry() {
  const input = window.prompt('Enter a product barcode (8–13 digits):', '');
  if (input == null) return;
  const code = String(input).replace(/[^0-9]/g, '');
  if (code.length < 6) { if (typeof toast === 'function') toast("That doesn't look like a barcode"); return; }
  doScanByCode(code);
}

async function doScanByCode(code) {
  const clean = code.replace(/[^0-9]/g, '');
  const localKey = Object.keys(P).find(k => P[k].code && P[k].code.replace(/[^0-9]/g, '') === clean);
  if (localKey) { stopCamera(); return doScan(localKey); }
  stopCamera();
  await lookupAndScan(clean);
}

async function lookupAndScan(code) {
  showScr('scan');
  const ov = document.getElementById('anlz');
  if (ov) ov.classList.add('on');
  const steps = ['as1','as2','as3','as4'];
  steps.forEach(s => { const el = document.getElementById(s); if(el){el.classList.remove('on','dn');} });

  const animSteps = [0, 700, 1400, 2150];
  animSteps.forEach((delay, i) => {
    setTimeout(() => {
      steps.forEach(s => { const el = document.getElementById(s); if(el) el.classList.remove('on'); });
      if (i > 0) { const prev = document.getElementById(steps[i-1]); if(prev) prev.classList.add('dn'); }
      const cur = document.getElementById(steps[i]); if(cur) cur.classList.add('on');
    }, delay);
  });

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) throw new Error('not found');

    const prod = data.product;
    const name  = prod.product_name || prod.abbreviated_product_name || 'Unknown Product';
    const brand = (prod.brands || '').split(',')[0].trim() || 'Unknown Brand';
    const co2   = prod.ecoscore_data?.agribalyse?.co2_total || prod.nutriments?.['carbon-footprint-from-known-ingredients_100g'] || 2.5;
    const water = prod.ecoscore_data?.agribalyse?.ef_total   || 500;
    const pack  = (prod.packaging_tags || []).join(', ') || prod.packaging || 'Unknown';
    const cert  = (prod.labels_tags || []).filter(l => /organic|fair.trade|rainforest|non.gmo/i.test(l)).join(', ') || 'None';

    const p = {
      name, brand,
      code: prod.code || code,
      em: '📦',
      score: 5,
      co2: +co2.toFixed(2),
      water: +water.toFixed(0),
      pack, cert,
      details: {
        'Product': name,
        'Brand': brand,
        'Barcode': code,
        'CO₂ estimate': co2 + ' kg',
        'Packaging': pack,
        'Certifications': cert,
        'Eco grade': prod.ecoscore_grade || 'N/A',
        'Nova group': prod.nova_group || 'N/A',
      },
      alts: [],
      _offRaw: prod,
    };

    const ai = await fetchAI(p);
    if (ai && ai.score >= 1 && ai.score <= 10) {
      p.score = ai.score;
      p.em = p.score >= 8 ? '🌿' : p.score >= 6 ? '🥗' : p.score >= 4 ? '📦' : '⚠️';
    }

    // Fetch alternatives in parallel with the animation delay (score < 7 = bad for environment)
    const altsFetch = p.score < 7 ? fetchAlternatives(p) : Promise.resolve([]);

    await new Promise(r => setTimeout(r, 2900));
    const lastStep = document.getElementById(steps[steps.length-1]);
    if (lastStep) lastStep.classList.add('dn');
    await new Promise(r => setTimeout(r, 350));
    if (ov) ov.classList.remove('on');
    steps.forEach(s => { const el = document.getElementById(s); if(el) el.classList.remove('on','dn'); });

    p.aiAlts = await altsFetch;
    if (typeof renderResult === 'function') renderResult(p, ai);
    showScr('result');
    if (typeof toast === 'function') toast('+10 🌿 tokens earned!');
    if (typeof recordScan === 'function') recordScan(p, code);

  } catch(e) {
    if (ov) ov.classList.remove('on');
    steps.forEach(s => { const el = document.getElementById(s); if(el) el.classList.remove('on','dn'); });
    showCamError(true, 'Product not found', 'Barcode ' + code + ' isn\'t in Open Food Facts yet. Try a common grocery item or use the demo chips below.');
  }
}

// ── AI ENVIRONMENTAL SCORING ──
async function fetchAI(p) {
  try {
    const prod = p._offRaw || {};
    const packTagArr  = prod.packaging_tags   || [];
    const packMatArr  = prod.packaging_materials_tags || [];
    const catStr      = (prod.categories_tags  || []).join(' ').toLowerCase();
    const searchStr   = (p.name + ' ' + p.brand).toLowerCase();

    // Detect single-use plastic bottle
    const isPlasticBottle =
      packTagArr.some(t => /plastic.bottle|en:pet$|en:hdpe|single.use|disposable/i.test(t)) ||
      packMatArr.some(t => /^en:pet$|polyethylene|polypropylene|^en:plastic/i.test(t)) ||
      /plastic bottle/i.test(searchStr) ||
      /purified water|spring water|mineral water|bottled water|drinking water/i.test(searchStr) ||
      (catStr.includes('water') && !packTagArr.some(t => /glass|alumin|can/i.test(t)));

    const isNonRecyclable = /non.recyclable|mylar|tetra/i.test((p.pack || '').toLowerCase());
    const hasPalmOil      = (prod.ingredients_tags || []).some(t => /palm/i.test(t));
    const isNova4         = prod.nova_group === 4;
    const isOrganic       = /organic/i.test(p.cert || '');
    const isRecyclable    = /recyclable|recycled/i.test((p.pack || '').toLowerCase());

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-allow-any-origin': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: `You are a sustainability analyst scoring products ONLY on environmental impact — NOT on nutrition, health, or taste.

Product: ${p.name} by ${p.brand}
CO2: ${p.co2} kg/kg
Water: ${p.water} L/kg
Packaging: ${p.pack}
Certifications: ${p.cert}
Single-use plastic bottle: ${isPlasticBottle}
Non-recyclable packaging: ${isNonRecyclable}
Contains palm oil: ${hasPalmOil}
Ultra-processed (NOVA 4): ${isNova4}
Organic certified: ${isOrganic}

Score ONLY on: CO2 emissions, water use, packaging waste, land use, deforestation risk, biodiversity impact.
Start from 5. Apply these penalties/bonuses:
- Single-use plastic bottle: -4
- Non-recyclable packaging: -3
- Palm oil (non-RSPO): -3
- Ultra-processed NOVA 4: -2
- Organic certified: +2
- Recyclable packaging: +1
- Low CO2 (<1kg): +1

Respond ONLY in JSON (no markdown):
{
  "score": <1-10 integer>,
  "headline": "max 12 words",
  "origin_story": "1 sentence max 28 words",
  "ecosystem_impact": "2 sentences max 55 words citing actual numbers",
  "why_rating": "1 sentence max 30 words",
  "top_concern": "max 7 words",
  "positive": "max 7 words or None significant"
}`
        }]
      })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return JSON.parse((d.content?.[0]?.text || '').replace(/```json|```/g, '').trim());
  } catch(e) { return localAI(p); }
}

function localAI(p) {
  const prod = p._offRaw || {};
  const packTagArr = prod.packaging_tags || [];
  const catStr     = (prod.categories_tags || []).join(' ').toLowerCase();
  const searchStr  = (p.name + ' ' + p.brand).toLowerCase();

  const isPlasticBottle =
    packTagArr.some(t => /plastic.bottle|en:pet$|en:hdpe|single.use/i.test(t)) ||
    /purified water|spring water|mineral water|bottled water|drinking water/i.test(searchStr) ||
    (catStr.includes('water') && !packTagArr.some(t => /glass|alumin|can/i.test(t)));

  const isNonRecyclable = /non.recyclable|mylar/i.test((p.pack || '').toLowerCase());

  let score = p.score || 5;
  if (isPlasticBottle)  score = Math.max(1, score - 4);
  else if (isNonRecyclable) score = Math.max(1, score - 3);

  const h = score >= 8 ? 'An excellent sustainable choice across all categories.'
          : score >= 6 ? 'A reasonable choice with moderate environmental concerns.'
          : score >= 4 ? 'Significant environmental concerns — consider alternatives.'
          : 'High environmental impact — one of the least sustainable picks.';

  const ex = isPlasticBottle
    ? 'Single-use plastic bottles are a major environmental disaster. They contribute to ocean pollution, take 450 years to decompose, and require significant fossil fuels to produce. Reusable alternatives reduce impact by over 90%.'
    : score >= 7
      ? `Low emissions of ${p.co2} kg CO₂/kg and ${p.water} L water use per kg put this well below category averages. ${p.cert && p.cert !== 'None' ? p.cert + ' certification further reduces ecosystem burden.' : 'Minimal packaging waste reduces long-term environmental burden.'}`
      : `Production releases ${p.co2} kg CO₂ and uses ${p.water} L water per kg — above sustainable thresholds. ${isNonRecyclable ? 'Non-recyclable packaging adds significant long-term waste pressure.' : 'Limited certifications and supply chain transparency increase ecosystem risk.'}`;

  const concern = isPlasticBottle ? 'Single-use plastic pollution'
                : isNonRecyclable ? 'Non-recyclable packaging waste'
                : p.co2 > 10      ? 'Very high GHG emissions'
                : 'Limited sustainability certification';

  const positive = score < 4       ? 'None significant'
                 : p.cert && p.cert !== 'None' ? p.cert + ' certified'
                 : p.co2 < 2       ? 'Low carbon footprint'
                 : 'Lower than category average';

  return {
    score,
    headline: h,
    origin_story: `Sourced and packaged as ${(p.pack || 'unknown packaging').toLowerCase()}, then distributed to retailers.`,
    ecosystem_impact: ex,
    why_rating: `Earned ${score}/10 based on emissions, water use, packaging type, and certifications.`,
    top_concern: concern,
    positive,
    explanation: ex
  };
}

// ── ECO ALTERNATIVES ──
async function fetchAlternatives(p) {
  try {
    const catTags = (p._offRaw?.categories_tags || []);
    const category = catTags.find(t => !t.startsWith('en:'))
                  || (p._offRaw?.categories || '').split(',')[0].trim()
                  || 'general grocery';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-allow-any-origin': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Product scanned: "${p.name}" by ${p.brand}. Environmental score: ${p.score}/10 (poor — needs eco swap).

Suggest exactly 2 specific, real eco-friendly alternatives that serve the same purpose. Focus on environmental impact, not nutrition.

Respond ONLY as a JSON array — no markdown, no explanation:
[{"name":"exact product name","brand":"brand name","eco_score":8,"em":"🌿","reason":"why it's better for the environment in 15 words max","image_query":"2-3 descriptive words for a stock photo search (e.g. coconut water drink, reusable metal bottle)","tags":["tag1","tag2","tag3"]}]`
        }]
      })
    });
    const d = await r.json();
    const text = (d.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim();
    const arr = JSON.parse(text);
    return Array.isArray(arr) ? arr.slice(0, 2) : [];
  } catch(e) {
    return [];
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  const d = loadData();
  renderHomeStats(d);
});