// ── PRODUCTS ──
const P = {
  beef: { name:'Ground Beef 80/20', brand:'Conventional Farming', code:'0-22000-02025-4', em:'🥩', score:2, co2:27.0, water:15400, pack:'Non-recyclable plastic', origin:'USA (factory farm)', cert:'None', details:{'CO₂ / kg':'27 kg CO₂','Water / kg':'15,400 L','Land use':'164 m²/kg','Packaging':'Non-recyclable plastic','Origin':'USA (CAFO)','Certifications':'None','Animal welfare':'Conventional CAFO','Biodiversity':'Very high impact'}, alts:[{em:'🌿',name:'Beyond Burger',score:8,why:'99% less water, 90% less land'},{em:'🫘',name:'Green Lentils',score:9,why:'Complete protein, nitrogen-fixing'},{em:'🐄',name:'Local Grass-Fed Beef',score:5,why:'Lower emissions, regenerative'}] },
  lentils: { name:'Green Lentils 1 lb', brand:"Bob's Red Mill", code:'0-39978-01531-4', em:'🫘', score:9, co2:0.9, water:1250, pack:'Recyclable paper bag', origin:'USA / Canada', cert:'Non-GMO Project', details:{'CO₂ / kg':'0.9 kg CO₂','Water / kg':'1,250 L','Land use':'3.4 m²/kg','Packaging':'Recyclable paper','Origin':'USA / Canada','Certifications':'Non-GMO Project','Soil impact':'Nitrogen-fixing ✓','Biodiversity':'Low impact'}, alts:[{em:'🥙',name:'Organic Chickpeas',score:9,why:'Equal protein, USDA Organic'},{em:'🫘',name:'Black Beans',score:9,why:'Comparable sustainability profile'}] },
  water: { name:'Purified Water 16.9 oz', brand:'Dasani / Coca-Cola', code:'0-12000-82066-1', em:'🧴', score:3, co2:0.55, water:3, pack:'Single-use PET plastic', origin:'Municipal tap', cert:'None', details:{'CO₂ / bottle':'0.55 kg CO₂','Plastic waste':'18.9g PET','Recyclability':'~30% actually recycled','Packaging':'Single-use PET','Ocean impact':'High (plastic leakage)','Source':'Municipal tap + filter','Fossil fuel':'PET from petroleum','RSPO':'N/A'}, alts:[{em:'💧',name:'Reusable Steel Bottle',score:10,why:'Zero waste after purchase'},{em:'📦',name:'Boxed Water',score:7,why:'92% renewable materials'},{em:'🚰',name:'Brita Filter + Tap',score:10,why:'Lowest possible footprint'}] },
  oatmilk: { name:'Oat Milk Original', brand:'Oatly', code:'8-10022-03014-0', em:'🌾', score:8, co2:0.9, water:48, pack:'Tetra Pak (recyclable)', origin:'Sweden / USA', cert:'Non-GMO, Vegan', details:{'CO₂ / litre':'0.9 kg CO₂','Water / litre':'48 L (vs 628L dairy)','Land use':'0.76 m² (vs 9 dairy)','Packaging':'Tetra Pak recyclable','Origin':'Sweden / USA','Certifications':'Non-GMO, Vegan','vs Dairy CO₂':'73% less','Pesticide risk':'Low'}, alts:[{em:'🥣',name:'Homemade Oat Milk',score:10,why:'No packaging, freshest option'}] },
  chips: { name:"Classic Potato Chips", brand:"Lay's", code:'0-28400-08406-5', em:'🍟', score:4, co2:3.8, water:790, pack:'Mylar (non-recyclable)', origin:'USA + SE Asia palm', cert:'None (non-RSPO)', details:{'CO₂ / kg':'3.8 kg CO₂','Palm oil':'Non-RSPO certified','Deforestation risk':'High','Packaging':'Mylar — not recyclable','Origin':'USA + SE Asia','Processing':'Ultra-processed NOVA 4','Recyclability':'0% (multilayer film)','Biodiversity':'High (palm deforestation)'}, alts:[{em:'✅',name:'RSPO Certified Chips',score:7,why:'Certified sustainable palm oil'},{em:'🍿',name:'Air-popped Popcorn',score:9,why:'Whole grain, minimal processing'},{em:'🥑',name:'Avocado Oil Chips',score:7,why:'Better oil sourcing'}] },
  organic_milk: { name:'Organic Whole Milk', brand:'Organic Valley', code:'0-93966-00414-9', em:'🥛', score:7, co2:1.9, water:628, pack:'HDPE jug (recyclable)', origin:'USA (family farms)', cert:'USDA Organic, Non-GMO', details:{'CO₂ / litre':'1.9 kg CO₂','Water / litre':'628 L','Land use':'9 m²/litre','Packaging':'HDPE recyclable','Origin':'USA family farms','Certifications':'USDA Organic, Non-GMO','Animal welfare':'Pasture standards','Pesticide risk':'None (Organic)'}, alts:[{em:'🌾',name:'Oat Milk',score:8,why:'73% less CO₂ than dairy'},{em:'🏡',name:'Local Farm Milk',score:7,why:'Reduced transport emissions'}] }
};

// ── PER-ACCOUNT DATA ──
function userKey() {
  try {
    const u = JSON.parse(localStorage.getItem('eco_user') || '{}');
    return u.email ? 'eco_data_' + u.email : 'eco_data_guest';
  } catch(e) { return 'eco_data_guest'; }
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(userKey())) || blankData(); }
  catch(e) { return blankData(); }
}

function saveData(d) { localStorage.setItem(userKey(), JSON.stringify(d)); }

function blankData() {
  return { tokens:0, streak:0, lastScanDate:null, recentScans:[], waterSaved:0, co2Avoided:0, ecoSwaps:0 };
}

function todayStr() { return new Date().toISOString().slice(0,10); }

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if(diff < 60000) return 'Just now';
  if(diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if(diff < 86400000) return 'Today';
  if(diff < 172800000) return 'Yesterday';
  return new Date(ts).toLocaleDateString();
}

function renderHomeStats(d) {
  const g = id => document.getElementById(id);
  if(g('stat-streak'))    g('stat-streak').textContent    = d.streak;
  if(g('stat-tokens'))    g('stat-tokens').textContent    = d.tokens;
  if(g('impact-water'))   g('impact-water').textContent   = d.waterSaved;
  if(g('impact-co2'))     g('impact-co2').textContent     = d.co2Avoided;
  if(g('impact-swaps'))   g('impact-swaps').textContent   = d.ecoSwaps;
  if(g('rewards-tokens')) g('rewards-tokens').textContent = d.tokens;

  const card = g('recent-card-home');
  if(!card) return;
  if(d.recentScans.length === 0) {
    card.innerHTML = '<div style="padding:18px;text-align:center;color:var(--ash);font-size:13px">No scans yet — tap Scan to start!</div>';
  } else {
    const scoreClass = s => s>=7?'sp-good':s>=4?'sp-warn':'sp-bad';
    const bg = s => s>=7?'#eaf3de':s>=4?'#fef3e2':'#fdeaea';
    card.innerHTML = d.recentScans.slice(0,5).map(s=>`
      <div class="recent-row" onclick="doScan('${s.key}')">
        <div class="recent-ic" style="background:${bg(s.score)}">${s.em}</div>
        <div class="recent-info">
          <div class="recent-name">${s.name}</div>
          <div class="recent-meta">${timeAgo(s.ts)}</div>
        </div>
        <div class="score-pill ${scoreClass(s.score)}">${s.score}</div>
      </div>`).join('');
  }
}

// ── NAV ──
function showScreen(id) {
  if (id !== 'scan') stopCamera();
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('s-'+id).classList.add('active');
}

function showTab(id) {
  showScreen(id);
  ['home','scan','impact','rewards'].forEach(t=>{
    const btn = document.getElementById('nav-'+t);
    if(btn) btn.classList.toggle('active', t===id);
  });
}

function goScan() { showScreen('scan'); startCamera(); }

// ── CAMERA ──
const BARCODES = {
  '0022000020254': 'beef',  '022000020254': 'beef',
  '0399780153140': 'lentils', '399780153140': 'lentils',
  '0120008206610': 'water',   '120008206610': 'water',
  '8100220301400': 'oatmilk',
  '0284000840650': 'chips',   '284000840650': 'chips',
  '0939660041490': 'organic_milk', '939660041490': 'organic_milk'
};

let zxingReader = null;
let lastScanned = null;

async function startCamera() {
  document.getElementById('cam-error').classList.remove('show');
  lastScanned = null;
  stopCamera();

  if (typeof ZXing === 'undefined') {
    showCamError('Scanner library failed to load. Please refresh.');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    });
  } catch (err) {
    showCamError(
      err.name === 'NotAllowedError'
        ? 'Camera permission denied.\nAllow access and try again.'
        : 'Could not start camera.\nUse the chips below to demo a scan.'
    );
    return;
  }

  const video = document.getElementById('cam-feed');
  zxingReader = new ZXing.BrowserMultiFormatReader();
  zxingReader.decodeFromStream(stream, video, (result, err) => {
    if (result) onBarcodeDetected(result.getText().replace(/[^0-9]/g, ''));
  });
}

function stopCamera() {
  if (zxingReader) { try { zxingReader.reset(); } catch(e) {} zxingReader = null; }
  const video = document.getElementById('cam-feed');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}

function showCamError(msg) {
  document.getElementById('cam-error-msg').textContent = msg;
  document.getElementById('cam-error').classList.add('show');
}

function onBarcodeDetected(raw) {
  if (!raw || raw === lastScanned) return;
  lastScanned = raw;
  stopCamera();
  const key = BARCODES[raw] || BARCODES[raw.replace(/^0+/, '')];
  doScan(key || raw);
}

// ── OPEN FOOD FACTS ──
async function fetchOpenFoodFacts(barcode) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_en,brands,ecoscore_grade,ecoscore_score,ecoscore_data,packaging,countries,labels,categories,image_front_small_url`);
  if (!r.ok) return null;
  const data = await r.json();
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}

function ecoGradeToScore(grade, numericScore) {
  if (numericScore != null) return Math.max(1, Math.min(10, Math.round(numericScore / 10)));
  return { a:9, b:7, c:5, d:3, e:1 }[grade?.toLowerCase()] ?? 5;
}

function categoryEmoji(categories) {
  const c = (categories || '').toLowerCase();
  if (c.includes('beef') || c.includes('meat') || c.includes('pork') || c.includes('poultry')) return '🥩';
  if (c.includes('milk') || c.includes('dairy') || c.includes('cheese') || c.includes('yogurt')) return '🥛';
  if (c.includes('water') || c.includes('beverage') || c.includes('drink') || c.includes('juice')) return '🥤';
  if (c.includes('oat') || c.includes('cereal') || c.includes('grain') || c.includes('bread')) return '🌾';
  if (c.includes('fish') || c.includes('seafood')) return '🐟';
  if (c.includes('vegetable') || c.includes('fruit')) return '🥦';
  if (c.includes('snack') || c.includes('chip') || c.includes('crisp')) return '🍿';
  if (c.includes('chocolate') || c.includes('candy') || c.includes('sweet')) return '🍫';
  if (c.includes('coffee') || c.includes('tea')) return '☕';
  if (c.includes('egg')) return '🥚';
  return '🛒';
}

function buildProductFromOFF(off, barcode) {
  const name   = off.product_name_en || off.product_name || 'Unknown Product';
  const brand  = off.brands || 'Unknown Brand';
  const grade  = off.ecoscore_grade;
  const nscore = off.ecoscore_score;
  const score  = ecoGradeToScore(grade, nscore);
  const co2    = off.ecoscore_data?.agribalyse?.co2_total ?? null;
  const pack   = off.packaging || 'Unknown packaging';
  const origin = off.countries || 'Unknown';
  const cert   = off.labels   || 'None';
  const cats   = off.categories || '';

  const details = {};
  if (grade)  details['Eco-Score']     = grade.toUpperCase() + ' (A=best, E=worst)';
  if (nscore != null) details['Eco-Score numeric'] = nscore + ' / 100';
  if (co2 != null)    details['CO₂ / kg']          = co2.toFixed(2) + ' kg CO₂';
  details['Packaging']      = pack;
  details['Origin']         = origin;
  details['Certifications'] = cert || 'None';
  if (cats) details['Category'] = cats.split(',')[0].trim();

  return {
    name, brand,
    code: barcode,
    em:   categoryEmoji(cats),
    score, co2: co2 ?? 0, water: 0,
    pack, origin, cert,
    details,
    alts: []
  };
}

// ── SCAN FLOW ──
async function doScan(input) {
  // input is either a hardcoded key ('beef') or a raw barcode string ('0123456789012')
  const isKey = input in P;
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

  let prod;
  if (isKey) {
    prod = P[input];
    // Let the animation run its normal duration for demo products
    const aiP = fetchAI(prod);
    await sleep(2900);
    document.getElementById(steps[steps.length-1]).classList.add('done');
    const ai = await aiP;
    await sleep(350);
    ov.classList.remove('show');
    steps.forEach(s=>{ const el=document.getElementById(s); el.classList.remove('on','done'); });
    renderResult(prod, ai);
    showScreen('result');
  } else {
    // Live barcode — fetch from Open Food Facts in parallel with the animation
    const offP = fetchOpenFoodFacts(input);
    await sleep(2900);
    document.getElementById(steps[steps.length-1]).classList.add('done');
    const off = await offP;
    await sleep(350);
    ov.classList.remove('show');
    steps.forEach(s=>{ const el=document.getElementById(s); el.classList.remove('on','done'); });

    if (!off) {
      toast('Product not found in database.');
      showScreen('scan');
      startCamera();
      return;
    }

    prod = buildProductFromOFF(off, input);
    const ai = await fetchAI(prod);
    renderResult(prod, ai);
    showScreen('result');
  }

  // ── Save scan to account ──
  const d = loadData();
  d.tokens += 10;

  const today = todayStr();
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(d.lastScanDate !== today) {
    d.streak = d.lastScanDate === yesterday ? d.streak + 1 : 1;
    d.lastScanDate = today;
  }

  if(prod.score >= 7) {
    d.waterSaved = +(d.waterSaved + Math.round(prod.water / 3.785)).toFixed(0);
    d.co2Avoided = +(d.co2Avoided + +(prod.co2 * 2.205).toFixed(1)).toFixed(1);
    d.ecoSwaps  += 1;
  }

  d.recentScans.unshift({ key: input, name:prod.name, em:prod.em, score:prod.score, ts:Date.now() });
  d.recentScans = d.recentScans.slice(0,10);
  saveData(d);
  renderHomeStats(d);

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

// ── INIT ──
(function() {
  try {
    const user = JSON.parse(localStorage.getItem('eco_user') || '{}');
    const name = user.name || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('home-greet').textContent = greeting + ', ' + name;
  } catch(e) {}
  renderHomeStats(loadData());
})();

// ── CLOCK ──
function updateClock(){
  const now=new Date();
  const t=`${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  document.querySelectorAll('.sbar-time').forEach(el=>el.textContent=t);
}
updateClock(); setInterval(updateClock,30000);
