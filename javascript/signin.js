// ════════════ terra.ai intro flow ════════════
// Splash → (first run only: tutorial + survey) → Auth → All-set → Home
// Returning users: Splash → Home (or → Auth if signed out)
// Persists `eco_user`, `eco_survey`, `eco_intro_seen` in localStorage.

const GOOGLE_CLIENT_ID = '293655502401-42pv9boildv5svdcl8n5466bgvr1nhgm.apps.googleusercontent.com';

// ── Earth mascot template ── (inline SVG so any host element can clone it)
const MASCOT_SVG = `
<div class="m-shadow"></div>
<svg class="mascot-svg" viewBox="0 0 96 110" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="earthGrad" cx="35%" cy="32%" r="75%">
      <stop offset="0%"  stop-color="#7fc5ff"/>
      <stop offset="55%" stop-color="#3a8fd9"/>
      <stop offset="100%" stop-color="#1a5da8"/>
    </radialGradient>
  </defs>
  <line class="m-arm-l" x1="20" y1="60" x2="6"  y2="74" stroke="#1c1c1e" stroke-width="2.2" stroke-linecap="round"/>
  <circle class="m-arm-l" cx="6" cy="74" r="3" fill="#1c1c1e"/>
  <line class="m-arm-r" x1="76" y1="60" x2="92" y2="48" stroke="#1c1c1e" stroke-width="2.2" stroke-linecap="round"/>
  <circle class="m-arm-r" cx="92" cy="48" r="3" fill="#1c1c1e"/>
  <line class="m-leg-l" x1="42" y1="86" x2="36" y2="106" stroke="#1c1c1e" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse class="m-leg-l" cx="34" cy="107" rx="5" ry="2.2" fill="#1c1c1e"/>
  <line class="m-leg-r" x1="54" y1="86" x2="60" y2="106" stroke="#1c1c1e" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse class="m-leg-r" cx="62" cy="107" rx="5" ry="2.2" fill="#1c1c1e"/>
  <circle cx="48" cy="50" r="32" fill="url(#earthGrad)"/>
  <path d="M28 38 q6 -4 13 1 q5 4 12 1 q5 -2 11 3 q3 4 -1 8 q-6 2 -11 -2 q-5 -4 -11 0 q-7 4 -13 -1 q-3 -4 0 -10 z" fill="#3d7a32"/>
  <path d="M22 60 q5 -3 10 0 q4 3 9 0 q4 -2 8 1 q3 3 0 6 q-5 3 -10 0 q-4 -3 -9 0 q-5 3 -8 -1 q-2 -3 0 -6 z" fill="#3d7a32"/>
  <path d="M55 70 q4 -2 9 0 q4 2 9 -1 q3 -2 5 1 q1 3 -2 4 q-5 2 -9 0 q-4 -2 -8 1 q-3 1 -4 -2 z" fill="#3d7a32"/>
  <ellipse cx="40" cy="48" rx="4" ry="5" fill="white"/>
  <circle class="m-eye" cx="40" cy="49" r="2.2" fill="#1c1c1e"/>
  <circle cx="40.7" cy="48" r=".8" fill="white"/>
  <ellipse cx="56" cy="48" rx="4" ry="5" fill="white"/>
  <circle class="m-eye right" cx="56" cy="49" r="2.2" fill="#1c1c1e"/>
  <circle cx="56.7" cy="48" r=".8" fill="white"/>
  <path d="M42 60 q6 5 12 0" stroke="#1c1c1e" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="34" cy="56" rx="3" ry="1.6" fill="#ff9a9a" opacity=".55"/>
  <ellipse cx="62" cy="56" rx="3" ry="1.6" fill="#ff9a9a" opacity=".55"/>
</svg>`;
function mountMascot(id) {
  const host = document.getElementById(id);
  if (host) host.innerHTML = MASCOT_SVG;
}
['splash-mascot-host','carousel-mascot-host','auth-mascot-host','allset-mascot-host']
  .forEach(mountMascot);

// ── Stage helpers ──
function showStage(id) {
  document.querySelectorAll('.intro-stage').forEach(s => {
    s.classList.remove('show', 'fading');
  });
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function fadeOut(id, then) {
  const el = document.getElementById(id);
  if (!el) { if (then) then(); return; }
  el.classList.add('fading');
  setTimeout(() => {
    el.classList.remove('show', 'fading');
    if (then) then();
  }, 600);
}

// ── State ──
function getUser() {
  try { return JSON.parse(localStorage.getItem('eco_user') || 'null'); } catch (e) { return null; }
}
function hasSeenIntro() {
  return localStorage.getItem('eco_intro_seen') === '1';
}
function markIntroSeen() {
  localStorage.setItem('eco_intro_seen', '1');
}
function getSurvey() {
  try { return JSON.parse(localStorage.getItem('eco_survey') || 'null'); } catch (e) { return null; }
}

// ════════════ CAROUSEL (tutorial + survey) ════════════
const CAROUSEL_PAGES = 6;
let carouselIdx = 0;
const surveyAnswers = {};

function buildDots() {
  const wrap = document.getElementById('carousel-dots');
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: CAROUSEL_PAGES },
    (_, i) => `<div class="cdot${i === 0 ? ' on' : ''}" data-idx="${i}"></div>`).join('');
  wrap.querySelectorAll('.cdot').forEach(d => {
    d.addEventListener('click', () => {
      const i = +d.dataset.idx;
      if (canAdvanceTo(i)) goCarouselPage(i);
    });
  });
}

function canAdvanceTo(target) {
  // Don't let users skip past a survey question they haven't answered
  for (let i = 3; i < target; i++) {
    const key = ['habit', 'goal', 'diet'][i - 3];
    if (!surveyAnswers[key]) return false;
  }
  return true;
}

function updateCarouselUI() {
  document.querySelectorAll('#carousel-dots .cdot').forEach((d, i) =>
    d.classList.toggle('on', i === carouselIdx));
  const prev = document.getElementById('carousel-prev');
  const next = document.getElementById('carousel-next');
  if (prev) prev.disabled = carouselIdx === 0;
  if (next) {
    const isSurvey = carouselIdx >= 3;
    const isLast = carouselIdx === CAROUSEL_PAGES - 1;
    let needAnswer = false;
    if (isSurvey) {
      const key = ['habit', 'goal', 'diet'][carouselIdx - 3];
      needAnswer = !surveyAnswers[key];
    }
    next.disabled = needAnswer;
    next.textContent = isLast ? 'Continue' : (isSurvey ? 'Next' : 'Next');
  }
  // Mascot animation per page
  const mascot = document.getElementById('carousel-mascot-host');
  if (mascot) {
    mascot.classList.remove('dance', 'spin', 'cheer');
    if (carouselIdx === 0) mascot.classList.add('dance');
    else if (carouselIdx === 1) mascot.classList.add('spin');
    else if (carouselIdx === 2) mascot.classList.add('cheer');
    else if (carouselIdx === 3) mascot.classList.add('dance');
    else if (carouselIdx === 4) mascot.classList.add('spin');
    else if (carouselIdx === 5) mascot.classList.add('cheer');
  }
}

function goCarouselPage(i) {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  carouselIdx = Math.max(0, Math.min(CAROUSEL_PAGES - 1, i));
  track.scrollTo({ left: track.clientWidth * carouselIdx, behavior: 'smooth' });
  updateCarouselUI();
}
function carouselNext() {
  if (carouselIdx < CAROUSEL_PAGES - 1) {
    goCarouselPage(carouselIdx + 1);
  } else {
    finishCarousel();
  }
}
function carouselPrev() {
  if (carouselIdx > 0) goCarouselPage(carouselIdx - 1);
}
window.carouselNext = carouselNext;
window.carouselPrev = carouselPrev;

function bindSurveyOptions() {
  document.querySelectorAll('#carousel .cp-opts').forEach(opts => {
    const key = opts.dataset.key;
    opts.querySelectorAll('.cp-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        opts.querySelectorAll('.cp-opt').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        surveyAnswers[key] = btn.dataset.val;
        updateCarouselUI();
      });
    });
  });
}

function bindCarouselScroll() {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  let scrollTimer = null;
  track.addEventListener('scroll', () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const w = track.clientWidth;
      if (!w) return;
      const newIdx = Math.round(track.scrollLeft / w);
      if (newIdx !== carouselIdx) {
        // If user swiped past a locked survey question, snap them back
        if (!canAdvanceTo(newIdx)) {
          goCarouselPage(carouselIdx);
          return;
        }
        carouselIdx = newIdx;
        updateCarouselUI();
      }
    }, 120);
  });
}

function finishCarousel() {
  // Save survey if all answered
  if (surveyAnswers.habit && surveyAnswers.goal && surveyAnswers.diet) {
    localStorage.setItem('eco_survey', JSON.stringify({
      answers: surveyAnswers,
      completed_at: new Date().toISOString()
    }));
  }
  fadeOut('carousel', () => {
    if (getUser()) {
      // Already signed in (rare, but handle): skip auth, go straight to all-set
      goAllSet();
    } else {
      showStage('auth-stage');
    }
  });
}

// ════════════ AUTH ════════════
function decodeJWT(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function onSignIn(response) {
  const card = document.querySelector('#auth-stage .auth-card');
  const loading = document.getElementById('loading-state');
  const btn = document.getElementById('google-btn');
  const banner = document.getElementById('error-banner');
  if (btn) btn.style.display = 'none';
  if (banner) banner.classList.remove('show');
  if (loading) loading.classList.add('show');

  try {
    const payload = decodeJWT(response.credential);
    localStorage.setItem('eco_user', JSON.stringify({
      name:    payload.given_name || payload.name || 'Friend',
      email:   payload.email,
      picture: payload.picture || ''
    }));
    setTimeout(() => {
      fadeOut('auth-stage', goAllSet);
    }, 500);
  } catch (e) {
    if (loading) loading.classList.remove('show');
    if (btn) btn.style.display = '';
    if (banner) banner.classList.add('show');
  }
}

function initGoogleSignIn() {
  if (typeof google === 'undefined' || !google.accounts) {
    // gsi/client may still be loading; retry shortly
    setTimeout(initGoogleSignIn, 200);
    return;
  }
  google.accounts.id.initialize({
    client_id:             GOOGLE_CLIENT_ID,
    callback:              onSignIn,
    auto_select:           false,
    cancel_on_tap_outside: true
  });
  const host = document.getElementById('google-btn');
  if (host) {
    google.accounts.id.renderButton(host, {
      type:   'standard',
      theme:  'outline',
      size:   'large',
      text:   'signin_with',
      shape:  'rectangular',
      width:  Math.min(320, host.parentElement ? host.parentElement.clientWidth - 30 : 320)
    });
  }
}

// ════════════ ALL SET → HOME ════════════
function spawnConfetti() {
  const wrap = document.getElementById('allset-confetti');
  if (!wrap) return;
  wrap.innerHTML = '';
  const colors = ['#6fac5e', '#c4e3bb', '#3d7a32', '#fff', '#e6f4e6', '#9bd882'];
  for (let i = 0; i < 32; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.background = colors[i % colors.length];
    p.style.left = Math.random() * 100 + '%';
    p.style.setProperty('--cx', (Math.random() * 60 - 30) + 'vw');
    p.style.animationDelay = (Math.random() * 0.4) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
}

function goAllSet() {
  markIntroSeen();
  showStage('allset');
  spawnConfetti();
  setTimeout(() => fadeOut('allset', () => {
    window.location.replace('home.html');
  }), 2200);
}

// ════════════ KICKOFF ════════════
function startSplash() {
  showStage('splash');
  // Splash duration depends on first-run vs returning
  const splashDur = hasSeenIntro() ? 1500 : 2200;
  setTimeout(() => {
    fadeOut('splash', () => {
      const user = getUser();
      const seen = hasSeenIntro();
      if (user && seen) {
        // Returning, signed in → straight to home
        window.location.replace('home.html');
      } else if (!seen) {
        // First-ever launch → tutorial + survey carousel
        showStage('carousel');
      } else {
        // Signed-out returning user → straight to auth
        showStage('auth-stage');
      }
    });
  }, splashDur);
}

window.addEventListener('load', () => {
  buildDots();
  bindSurveyOptions();
  bindCarouselScroll();
  initGoogleSignIn();
  startSplash();
});
