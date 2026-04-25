const GOOGLE_CLIENT_ID = '293655502401-42pv9boildv5svdcl8n5466bgvr1nhgm.apps.googleusercontent.com'
;

function decodeJWT(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function onSignIn(response) {
  document.getElementById('auth-body').style.display = 'none';
  document.getElementById('loading-body').style.display = 'flex';

  try {
    const payload = decodeJWT(response.credential);
    localStorage.setItem('eco_user', JSON.stringify({
      name:    payload.given_name || payload.name || 'Friend',
      email:   payload.email,
      picture: payload.picture || ''
    }));
    window.location.href = 'home.html';
  } catch (e) {
    document.getElementById('auth-body').style.display = 'flex';
    document.getElementById('loading-body').style.display = 'none';
    document.getElementById('error-banner').classList.add('show');
  }
}

window.addEventListener('load', () => {
  if (typeof google === 'undefined') {
    document.getElementById('error-banner').textContent =
      'Google Sign-In failed to load. Check your internet connection.';
    document.getElementById('error-banner').classList.add('show');
    return;
  }

  google.accounts.id.initialize({
    client_id:            GOOGLE_CLIENT_ID,
    callback:             onSignIn,
    auto_select:          false,
    cancel_on_tap_outside: true
  });

  google.accounts.id.renderButton(
    document.getElementById('google-btn'),
    {
      type:   'standard',
      theme:  'outline',
      size:   'large',
      text:   'signin_with',
      shape:  'rectangular',
      width:  334
    }
  );
});
