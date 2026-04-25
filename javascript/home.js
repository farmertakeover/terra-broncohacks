// ── PRODUCTS ──
const P = {
  beef: { name:'Ground Beef 80/20', brand:'Conventional Farming', code:'0-22000-02025-4', em:'🥩', score:2, co2:27.0, water:15400, pack:'Non-recyclable plastic', origin:'USA (factory farm)', cert:'None', details:{'CO₂ / kg':'27 kg CO₂','Water / kg':'15,400 L','Land use':'164 m²/kg','Packaging':'Non-recyclable plastic','Origin':'USA (CAFO)','Certifications':'None','Animal welfare':'Conventional CAFO','Biodiversity':'Very high impact'}, alts:[{em:'🌿',name:'Beyond Burger',score:8,why:'99% less water, 90% less land'},{em:'🫘',name:'Green Lentils',score:9,why:'Complete protein, nitrogen-fixing'},{em:'🐄',name:'Local Grass-Fed Beef',score:5,why:'Lower emissions, regenerative'}] },
  lentils: { name:'Green Lentils 1 lb', brand:"Bob's Red Mill", code:'0-39978-01531-4', em:'🫘', score:9, co2:0.9, water:1250, pack:'Recyclable paper bag', origin:'USA / Canada', cert:'Non-GMO Project', details:{'CO₂ / kg':'0.9 kg CO₂','Water / kg':'1,250 L','Land use':'3.4 m²/kg','Packaging':'Recyclable paper','Origin':'USA / Canada','Certifications':'Non-GMO Project','Soil impact':'Nitrogen-fixing ✓','Biodiversity':'Low impact'}, alts:[{em:'🥙',name:'Organic Chickpeas',score:9,why:'Equal protein, USDA Organic'},{em:'🫘',name:'Black Beans',score:9,why:'Comparable sustainability profile'}] },
  water: { name:'Purified Water 16.9 oz', brand:'Dasani / Coca-Cola', code:'0-12000-82066-1', em:'🧴', score:3, co2:0.55, water:3, pack:'Single-use PET plastic', origin:'Municipal tap', cert:'None', details:{'CO₂ / bottle':'0.55 kg CO₂','Plastic waste':'18.9g PET','Recyclability':'~30% actually recycled','Packaging':'Single-use PET','Ocean impact':'High (plastic leakage)','Source':'Municipal tap + filter','Fossil fuel':'PET from petroleum','RSPO':'N/A'}, alts:[{em:'💧',name:'Reusable Steel Bottle',score:10,why:'Zero waste after purchase'},{em:'📦',name:'Boxed Water',score:7,why:'92% renewable materials'},{em:'🚰',name:'Brita Filter + Tap',score:10,why:'Lowest possible footprint'}] },
  oatmilk: { name:'Oat Milk Original', brand:'Oatly', code:'8-10022-03014-0', em:'🌾', score:8, co2:0.9, water:48, pack:'Tetra Pak (recyclable)', origin:'Sweden / USA', cert:'Non-GMO, Vegan', details:{'CO₂ / litre':'0.9 kg CO₂','Water / litre':'48 L (vs 628L dairy)','Land use':'0.76 m² (vs 9 dairy)','Packaging':'Tetra Pak recyclable','Origin':'Sweden / USA','Certifications':'Non-GMO, Vegan','vs Dairy CO₂':'73% less','Pesticide risk':'Low'}, alts:[{em:'🥣',name:'Homemade Oat Milk',score:10,why:'No packaging, freshest option'}] },
  chips: { name:"Classic Potato Chips", brand:"Lay's", code:'0-28400-08406-5', em:'🍟', score:4, co2:3.8, water:790, pack:'Mylar (non-recyclable)', origin:'USA + SE Asia palm', cert:'None (non-RSPO)', details:{'CO₂ / kg':'3.8 kg CO₂','Palm oil':'Non-RSPO certified','Deforestation risk':'High','Packaging':'Mylar — not recyclable','Origin':'USA + SE Asia','Processing':'Ultra-processed NOVA 4','Recyclability':'0% (multilayer film)','Biodiversity':'High (palm deforestation)'}, alts:[{em:'✅',name:'RSPO Certified Chips',score:7,why:'Certified sustainable palm oil'},{em:'🍿',name:'Air-popped Popcorn',score:9,why:'Whole grain, minimal processing'},{em:'🥑',name:'Avocado Oil Chips',score:7,why:'Better oil sourcing'}] },
  organic_milk: { name:'Organic Whole Milk', brand:'Organic Valley', code:'0-93966-00414-9', em:'🥛', score:7, co2:1.9, water:628, pack:'HDPE jug (recyclable)', origin:'USA (family farms)', cert:'USDA Organic, Non-GMO', details:{'CO₂ / litre':'1.9 kg CO₂','Water / litre':'628 L','Land use':'9 m²/litre','Packaging':'HDPE recyclable','Origin':'USA family farms','Certifications':'USDA Organic, Non-GMO','Animal welfare':'Pasture standards','Pesticide risk':'None (Organic)'}, alts:[{em:'🌾',name:'Oat Milk',score:8,why:'73% less CO₂ than dairy'},{em:'🏡',name:'Local Farm Milk',score:7,why:'Reduced transport emissions'}] }
};

// ── NAV ──
function showScreen(id) {
  const prev = document.querySelector('.screen.active');
  const prevId = prev ? prev.id.replace(/^s-/,'') : null;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('s-'+id).classList.add('active');
  if(prevId === 'scan' && id !== 'scan' && typeof stopCamera === 'function') {
    stopCamera();
  }
}

function showTab(id) {
  showScreen(id);
  ['home','scan','impact','rewards'].forEach(t=>{
    const btn = document.getElementById('nav-'+t);
    if(btn) btn.classList.toggle('active', t===id);
  });
}

function goScan() {
  showScreen('scan');
  startCamera();
}

// ── LIVE CAMERA + BARCODE SCANNER ──
let _camStream = null;
let _scanRAF = null;
let _scanInterval = null;
let _detector = null;
let _zxingReader = null;
let _scanning = false;
let _lastDetectedCode = null;
let _lastDetectedAt = 0;

function showCamScreen(which) {
  ['cam-permission','cam-error'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.toggle('show', id===which);
  });
}

function setCamError(title, text) {
  document.getElementById('cam-error-title').textContent = title;
  document.getElementById('cam-error-text').textContent = text;
  showCamScreen('cam-error');
}

async function startCamera() {
  if(_scanning) return;

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamError('Camera not supported',
      'This browser doesn\'t support camera access. Try Chrome or Safari, and make sure the page is served over HTTPS or localhost.');
    return;
  }
  if(!window.isSecureContext) {
    setCamError('HTTPS required',
      'Browsers only allow camera access on https:// or localhost. Open this page over HTTPS (e.g. via a tunnel like cloudflared/ngrok) and try again.');
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
    await video.play().catch(()=>{});
    showCamScreen(null);
    document.getElementById('scan-hint').textContent = 'Point at a product barcode';
    _scanning = true;
    startScanLoop(video);
  } catch(err) {
    if(err && (err.name==='NotAllowedError' || err.name==='SecurityError')) {
      setCamError('Camera permission denied',
        'You blocked camera access. Tap the lock icon in your browser\'s address bar, allow Camera, then reload.');
    } else if(err && err.name==='NotFoundError') {
      setCamError('No camera found', 'This device doesn\'t seem to have a camera available.');
    } else {
      setCamError('Camera error', (err && err.message) ? err.message : 'Could not start the camera.');
    }
  }
}

function stopCamera() {
  _scanning = false;
  if(_scanRAF) { cancelAnimationFrame(_scanRAF); _scanRAF = null; }
  if(_scanInterval) { clearInterval(_scanInterval); _scanInterval = null; }
  if(_zxingReader && _zxingReader.reset) { try { _zxingReader.reset(); } catch(_){} }
  _zxingReader = null;
  if(_camStream) {
    _camStream.getTracks().forEach(t => t.stop());
    _camStream = null;
  }
  const video = document.getElementById('cam-video');
  if(video) { try { video.pause(); } catch(_){} video.srcObject = null; }
  _lastDetectedCode = null;
}

async function startScanLoop(video) {
  let nativeStarted = false;
  if('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      _detector = new window.BarcodeDetector({ formats: formats.length ? formats : ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'] });
      _scanInterval = setInterval(()=>nativeDetect(video), 250);
      nativeStarted = true;
    } catch(_){ /* fall through to ZXing */ }
  }
  setTimeout(async () => {
    if(!_scanning || _zxingReader) return;
    await loadZXing();
    if(!_scanning || _zxingReader) return;
    if(!window.ZXing) {
      if(!nativeStarted) document.getElementById('scan-hint').textContent = 'Live scanning unavailable — type a code below';
      return;
    }
    try {
      const hints = new Map();
      const formats = [
        ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.QR_CODE
      ];
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
      _zxingReader = new ZXing.BrowserMultiFormatReader(hints, 250);
      _zxingReader.decodeFromVideoElement(video, (result) => {
        if(result && _scanning) onCodeDetected(result.getText());
      });
    } catch(e) { /* keep native detection going */ }
  }, nativeStarted ? 1500 : 0);
}

async function nativeDetect(video) {
  if(!_scanning || !_detector || video.readyState < 2) return;
  try {
    const codes = await _detector.detect(video);
    if(codes && codes.length) onCodeDetected(codes[0].rawValue);
  } catch(_){}
}

function loadZXing() {
  return new Promise(resolve => {
    if(window.ZXing) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.0/umd/index.min.js';
    s.onload = ()=>resolve();
    s.onerror = ()=>resolve();
    document.head.appendChild(s);
  });
}

function onCodeDetected(rawCode) {
  if(!_scanning || !rawCode) return;
  const code = String(rawCode).trim();
  const now = Date.now();
  if(code === _lastDetectedCode && (now - _lastDetectedAt) < 2500) return;
  _lastDetectedCode = code;
  _lastDetectedAt = now;
  if(navigator.vibrate) navigator.vibrate(60);
  document.getElementById('scan-hint').textContent = 'Detected: ' + code;
  doScanByCode(code);
}

function barcodeVariants(raw) {
  const digits = String(raw||'').replace(/[^0-9]/g,'');
  if(!digits) return [];
  const out = new Set();
  out.add(digits);
  if(digits.length === 12) {
    out.add('0' + digits);
    out.add(digits.replace(/^0+/,''));
  } else if(digits.length === 13) {
    if(digits.startsWith('0')) out.add(digits.slice(1));
    out.add(digits.replace(/^0+/,''));
  } else if(digits.length === 11) {
    out.add('0' + digits);
    out.add('00' + digits);
  } else if(digits.length === 8) {
    out.add(digits);
  } else {
    out.add(digits.replace(/^0+/,''));
    out.add('0' + digits);
  }
  return Array.from(out).filter(c => c && c.length >= 6 && c.length <= 14);
}

function findLocalProduct(code) {
  const variants = barcodeVariants(code);
  return Object.keys(P).find(k => {
    const local = String(P[k].code||'').replace(/[^0-9]/g,'');
    return variants.some(v => v === local || v === local.replace(/^0+/,''));
  });
}

async function doScanByCode(code) {
  stopCamera();
  const localKey = findLocalProduct(code);
  if(localKey) return doScan(localKey);
  await lookupAndScan(code);
}

async function fetchOFFVariant(code) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if(!r.ok) return null;
    const data = await r.json();
    if(data && data.status === 1 && data.product) return { variant: code, product: data.product };
    return null;
  } catch(e) { return null; }
}

async function lookupOFFAnyVariant(code) {
  const variants = barcodeVariants(code);
  if(!variants.length) return null;
  return new Promise(resolve => {
    let remaining = variants.length;
    let resolved = false;
    variants.forEach(v => {
      fetchOFFVariant(v).then(hit => {
        if(resolved) return;
        if(hit) { resolved = true; resolve(hit); return; }
        remaining--;
        if(remaining === 0 && !resolved) { resolved = true; resolve(null); }
      });
    });
  });
}

async function lookupAndScan(code) {
  showScreen('scan');
  const ov = document.getElementById('analyzing');
  ov.classList.add('show');
  try {
    const hit = await lookupOFFAnyVariant(code);
    if(hit) {
      const prod = productFromOFF(hit.product, hit.variant);
      const ai = await fetchAI(prod);
      ov.classList.remove('show');
      renderResult(prod, ai);
      showScreen('result');
      toast('+10 🌿 tokens earned!');
      return;
    }
    ov.classList.remove('show');
    toast('Barcode ' + code + ' not in Open Food Facts');
    setTimeout(()=>{ if(document.getElementById('s-scan').classList.contains('active')) startCamera(); }, 600);
  } catch(e) {
    ov.classList.remove('show');
    toast('Lookup failed — check connection');
    setTimeout(()=>{ if(document.getElementById('s-scan').classList.contains('active')) startCamera(); }, 600);
  }
}

function manualBarcodeEntry() {
  const input = window.prompt('Enter a product barcode (8 to 13 digits):', '');
  if(input == null) return;
  const code = String(input).replace(/[^0-9]/g,'');
  if(code.length < 6) { toast('That doesn\'t look like a barcode'); return; }
  doScanByCode(code);
}

function productFromOFF(p, code) {
  const name = p.product_name || p.generic_name || 'Unknown product';
  const brand = (p.brands || 'Unknown brand').split(',')[0].trim();
  const eco = (p.ecoscore_grade || '').toLowerCase();
  const ecoMap = { a: 9, b: 7, c: 5, d: 3, e: 2 };
  const score = ecoMap[eco] || 5;
  const co2 = p.ecoscore_data?.agribalyse?.co2_total ?? null;
  const pack = p.packaging || 'Unknown packaging';
  const origin = p.origins || p.countries || 'Unknown origin';
  const labels = p.labels || 'None';
  const em = score>=8?'🌿':score>=6?'🥗':score>=4?'📦':'⚠️';
  const details = {
    'Eco-Score': eco ? eco.toUpperCase() : 'Unknown',
    'CO₂ / kg': co2!=null ? `${co2.toFixed(1)} kg CO₂` : 'Not reported',
    'Packaging': pack,
    'Origin': origin,
    'Labels': labels,
    'Categories': (p.categories || 'N/A').split(',').slice(0,3).join(', '),
    'Brand': brand,
    'Source': 'Open Food Facts'
  };
  return {
    name, brand, code, em, score,
    co2: co2!=null ? +co2.toFixed(2) : 0,
    water: 0,
    pack, origin, cert: labels,
    details, alts: []
  };
}

// ── SCAN FLOW ──
async function doScan(key) {
  const prod = P[key];
  if(!prod) return;
  if(typeof stopCamera === 'function') stopCamera();
  showScreen('scan');
  const ov = document.getElementById('analyzing');
  ov.classList.add('show');
  const steps = ['as1','as2','as3','as4'];
  const delays = [0,700,1400,2150];
  steps.forEach((id,i)=>{
    setTimeout(()=>{
      steps.forEach(s=>{ document.getElementById(s).classList.remove('on'); });
      if(i>0) document.getElementById(steps[i-1]).classList.add('done');
      document.getElementById(id).classList.add('on');
    }, delays[i]);
  });

  const aiP = fetchAI(prod);
  await sleep(2900);
  document.getElementById(steps[steps.length-1]).classList.add('done');
  const ai = await aiP;
  await sleep(350);
  ov.classList.remove('show');
  steps.forEach(s=>{ const el=document.getElementById(s); el.classList.remove('on','done'); });
  renderResult(prod, ai);
  showScreen('result');
  toast('+10 🌿 tokens earned!');
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// ── AI CALL ──
async function fetchAI(p) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:600,
        messages:[{role:'user',content:`You are a sustainability analyst. Given ONLY this verified data, write a short factual assessment. Do NOT invent facts.

Product: ${p.name} by ${p.brand}
CO2: ${p.co2} kg/kg | Water: ${p.water} L/kg | Score: ${p.score}/10
Packaging: ${p.pack} | Certifications: ${p.cert}

Respond ONLY in JSON (no markdown):
{"headline":"max 12 words verdict","explanation":"2-3 sentences max 55 words, cite actual numbers","top_concern":"max 7 words","positive":"max 7 words or 'None significant'"}`}]
      })
    });
    const d = await r.json();
    return JSON.parse((d.content?.[0]?.text||'').replace(/```json|```/g,'').trim());
  } catch(e) { return localAI(p); }
}

function localAI(p) {
  const h = p.score>=8?'One of the most sustainable choices available.':p.score>=6?'Good choice with manageable trade-offs.':p.score>=4?'Significant environmental concerns present.':'Among the least sustainable in its category.';
  const ex = p.score>=7
    ? `This product has a verified footprint of ${p.co2} kg CO₂ and ${p.water.toLocaleString()}L water per kg — well below category averages. ${p.cert!=='None'?`${p.cert} certification confirms responsible production.`:'Its packaging and origin further reduce environmental burden.'}`
    : `This product generates ${p.co2} kg CO₂ and requires ${p.water.toLocaleString()}L water per kg — among the highest in its category. ${p.pack.includes('Non')||p.pack.includes('Mylar')?'Its non-recyclable packaging compounds the environmental cost.':'Better alternatives exist with significantly lower footprints.'}`;
  const c = p.co2>10?'Very high GHG emissions':p.pack.includes('Non')||p.pack.includes('Mylar')?'Non-recyclable packaging':p.water>5000?'Excessive freshwater use':'No sustainability certifications';
  const pos = p.score<4?'None significant':p.cert!=='None'?p.cert+' certified':p.co2<2?'Low carbon footprint':'Lower than conventional options';
  return { headline:h, explanation:ex, top_concern:c, positive:pos };
}

// ── RENDER RESULT ──
function renderResult(p, ai) {
  const good=p.score>=7, mid=p.score>=4&&p.score<7;
  const cc = good?'sc-eco':mid?'sc-mid':'sc-bad';
  const iconBg = good?'#eaf3de':mid?'#fef3e2':'#fdeaea';
  const verdict = good?'✓ Eco-friendly':mid?'⚠ Use with caution':'✗ Not eco-friendly';
  const w = p.water>=1000?(p.water/1000).toFixed(1)+'K':p.water;

  document.getElementById('prod-bar').innerHTML=`
    <div class="prod-icon" style="background:${iconBg}">${p.em}</div>
    <div><div class="prod-name">${p.name}</div><div class="prod-brand">${p.brand}</div><div class="prod-code">${p.code}</div></div>`;

  const drows = Object.entries(p.details).map(([k,v])=>`<div class="drow"><span class="drow-k">${k}</span><span class="drow-v">${v}</span></div>`).join('');
  const altrows = p.alts.map(a=>`<div class="alt-row" onclick="doScan('${altKey(a.name)}')"><span class="alt-em">${a.em}</span><div class="alt-info"><div class="alt-name">${a.name}</div><div class="alt-why">${a.why}</div></div><div class="alt-sc">${a.score}</div></div>`).join('');
  const altsBlock = p.alts.length ? `<div class="alts-card fi"><div class="dcard-title">${good?'💡 Even greener options':'♻️ Greener alternatives'}</div>${altrows}</div>` : '';

  document.getElementById('rbody').innerHTML=`
    <div class="score-card ${cc} fi">
      <div class="sc-top">
        <div><div class="sc-verdict">${verdict}</div><div class="sc-sub">${ai.headline}</div></div>
        <div><span class="sc-num">${p.score}</span><span class="sc-denom">/10</span></div>
      </div>
      <div class="sc-bar"><div class="sc-fill" style="width:${p.score*10}%"></div></div>
      <div class="sc-metrics">
        <div class="sc-metric"><span class="sc-mic">💨</span><div><div class="sc-mval">${p.co2} kg</div><div class="sc-mlbl">CO₂ per kg</div></div></div>
        <div class="sc-metric"><span class="sc-mic">💧</span><div><div class="sc-mval">${w} L</div><div class="sc-mlbl">water per kg</div></div></div>
        <div class="sc-metric"><span class="sc-mic">⚠️</span><div><div class="sc-mval" style="font-size:10px;line-height:1.3">${ai.top_concern}</div><div class="sc-mlbl">top concern</div></div></div>
        <div class="sc-metric"><span class="sc-mic">✅</span><div><div class="sc-mval" style="font-size:10px;line-height:1.3">${ai.positive}</div><div class="sc-mlbl">positive</div></div></div>
      </div>
    </div>
    <div class="ai-card fi">
      <div class="ai-hdr"><span class="ai-badge">AI ANALYSIS</span><span class="ai-title">Claude's assessment</span></div>
      <div class="ai-text">${ai.explanation}</div>
    </div>
    ${altsBlock}
    <div class="dcard fi"><div class="dcard-title">📊 Full environmental data</div>${drows}</div>`;

  document.getElementById('rbody').scrollTop=0;
}

function altKey(n){
  if(n.includes('Lentil')||n.includes('Chickpea')||n.includes('Black Bean'))return'lentils';
  if(n.includes('Oat'))return'oatmilk';
  if(n.includes('Water')||n.includes('Brita')||n.includes('Boxed'))return'water';
  if(n.includes('Popcorn')||n.includes('RSPO')||n.includes('Avocado'))return'chips';
  return'lentils';
}

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2700);
}
function redeem(item){ toast(`Redeeming ${item} reward…`); }

(function() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem('eco_user') || 'null'); } catch(e) {}
  if (!user || !user.name) {
    window.location.replace('signin.html');
    return;
  }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetEl = document.getElementById('home-greet');
  if (greetEl) greetEl.textContent = greeting + ', ' + user.name;
  window.__ecoUser = user;
})();

// ── EARTH MASCOT + ONBOARDING SURVEY ──
const SURVEY_QUESTIONS = [
  {
    q: "How often do you check a product's environmental impact?",
    sub: "Be honest — there's no wrong answer.",
    key: "habit",
    opts: [
      { em: "🌱", label: "Almost every time I shop",  value: "always" },
      { em: "🛒", label: "Sometimes, for big purchases", value: "sometimes" },
      { em: "🤔", label: "Rarely — I'd like to start",   value: "rarely" },
      { em: "🆕", label: "Never, this is new to me",     value: "never" }
    ]
  },
  {
    q: "Which sustainability goal matters most to you?",
    sub: "We'll tailor your insights around it.",
    key: "goal",
    opts: [
      { em: "💨", label: "Cut my carbon footprint", value: "carbon" },
      { em: "♻️", label: "Reduce plastic & waste",   value: "plastic" },
      { em: "💧", label: "Save water",               value: "water" },
      { em: "🌳", label: "Protect forests & biodiversity", value: "biodiversity" }
    ]
  },
  {
    q: "What's your diet like?",
    sub: "Helps us suggest meaningful swaps.",
    key: "diet",
    opts: [
      { em: "🥩", label: "Eat meat regularly",       value: "omnivore" },
      { em: "🍗", label: "Mostly chicken or fish",   value: "flex" },
      { em: "🥗", label: "Vegetarian",               value: "veg" },
      { em: "🌱", label: "Vegan / plant-based",      value: "vegan" }
    ]
  }
];

let _surveyStep = 0;
const _surveyAnswers = {};

function getMascotState() {
  try { return JSON.parse(localStorage.getItem('eco_mascot') || '{}'); } catch(e) { return {}; }
}
function saveMascotState(patch) {
  const s = Object.assign(getMascotState(), patch);
  localStorage.setItem('eco_mascot', JSON.stringify(s));
}
function getSurveyAnswers() {
  try { return JSON.parse(localStorage.getItem('eco_survey') || 'null'); } catch(e) { return null; }
}

function setMascotMessage(text, ctaLabel, ctaFn, skipLabel, skipFn) {
  const speech = document.getElementById('mascot-speech');
  if(!speech) return;
  speech.style.animation = 'none';
  void speech.offsetWidth;
  speech.style.animation = '';
  document.getElementById('mascot-msg').textContent = text;
  const cta = document.getElementById('mascot-cta');
  const skip = document.getElementById('mascot-skip');
  if (ctaLabel) {
    cta.textContent = ctaLabel;
    cta.onclick = ctaFn;
    cta.style.display = '';
  } else {
    cta.style.display = 'none';
  }
  if (skipLabel) {
    skip.textContent = skipLabel;
    skip.onclick = skipFn;
    skip.style.display = '';
  } else {
    skip.style.display = 'none';
  }
  speech.style.display = '';
}

function hideMascotSpeech() {
  const el = document.getElementById('mascot-speech');
  if(el) el.style.display = 'none';
}

function mascotTap() {
  const m = document.getElementById('mascot');
  if(!m) return;
  m.classList.remove('bounce');
  void m.offsetWidth;
  m.classList.add('bounce');
  if (navigator.vibrate) navigator.vibrate(20);
  const lines = [
    "Hi there! 🌍",
    "Every scan helps me breathe a little easier.",
    "Try scanning your next snack!",
    "Small swaps, big impact ✨",
    "I'm rooting for you 🌱"
  ];
  const msg = lines[Math.floor(Math.random()*lines.length)];
  setMascotMessage(msg, null, null, 'Got it', hideMascotSpeech);
}

function dismissMascot() {
  hideMascotSpeech();
  saveMascotState({ greeted: true });
}

function initMascotGreeting() {
  const user = window.__ecoUser || {};
  const state = getMascotState();
  const answers = getSurveyAnswers();

  if (!answers) {
    setMascotMessage(
      `Hi ${user.name || 'there'}! I'm Terra 🌍 Mind answering 3 quick questions so I can tailor things for you?`,
      "Sure, let's go", openSurvey,
      "Maybe later", dismissMascot
    );
  } else if (!state.greeted) {
    setMascotMessage(
      `Welcome back, ${user.name || 'friend'}! Tap me anytime for an eco-tip.`,
      null, null,
      'Got it', dismissMascot
    );
  } else {
    hideMascotSpeech();
  }
}

function openSurvey() {
  hideMascotSpeech();
  _surveyStep = 0;
  Object.keys(_surveyAnswers).forEach(k => delete _surveyAnswers[k]);
  document.getElementById('survey').classList.add('show');
  renderSurveyStep();
}

function skipSurvey() {
  document.getElementById('survey').classList.remove('show');
  saveMascotState({ greeted: true });
  setMascotMessage("No worries — tap me whenever you're ready.", null, null, 'Got it', hideMascotSpeech);
}

function renderSurveyStep() {
  const step = SURVEY_QUESTIONS[_surveyStep];
  const prog = document.getElementById('survey-progress');
  prog.innerHTML = SURVEY_QUESTIONS.map((_, i) =>
    `<div class="survey-pip${i <= _surveyStep ? ' on' : ''}"></div>`
  ).join('');
  document.getElementById('survey-q').textContent = step.q;
  document.getElementById('survey-sub').textContent = step.sub;
  const opts = document.getElementById('survey-opts');
  opts.innerHTML = step.opts.map(o =>
    `<button class="survey-opt" data-val="${o.value}">
      <span class="survey-opt-em">${o.em}</span><span>${o.label}</span>
    </button>`
  ).join('');
  opts.querySelectorAll('.survey-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      opts.querySelectorAll('.survey-opt').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      _surveyAnswers[step.key] = btn.dataset.val;
      document.getElementById('survey-next').disabled = false;
    });
  });
  const next = document.getElementById('survey-next');
  next.disabled = true;
  next.textContent = (_surveyStep === SURVEY_QUESTIONS.length - 1) ? 'Finish' : 'Next';
}

function nextSurvey() {
  if (_surveyStep < SURVEY_QUESTIONS.length - 1) {
    _surveyStep++;
    renderSurveyStep();
  } else {
    finishSurvey();
  }
}

function finishSurvey() {
  localStorage.setItem('eco_survey', JSON.stringify({
    answers: _surveyAnswers,
    completed_at: new Date().toISOString()
  }));
  saveMascotState({ greeted: true });
  document.getElementById('survey').classList.remove('show');
  const goal = _surveyAnswers.goal;
  const goalLine = goal === 'carbon' ? "We'll highlight low-carbon picks for you. 💨"
                 : goal === 'plastic' ? "I'll flag plastic-heavy packaging. ♻️"
                 : goal === 'water' ? "Water-saving swaps coming up. 💧"
                 : goal === 'biodiversity' ? "Forest-friendly options first. 🌳"
                 : "Let's make some greener choices together!";
  setMascotMessage("Thanks! " + goalLine, "Scan a product", () => { hideMascotSpeech(); goScan(); }, 'Later', hideMascotSpeech);
  toast('+25 🌿 tokens for completing your profile!');
}

setTimeout(initMascotGreeting, 350);

// Live clock
function updateClock(){
  const now=new Date();
  const t=`${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  document.querySelectorAll('.sbar-time').forEach(el=>el.textContent=t);
}
updateClock(); setInterval(updateClock,30000);

document.addEventListener('visibilitychange', () => {
  if(document.hidden && typeof stopCamera === 'function') stopCamera();
});
