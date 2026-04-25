# terra-broncohacks

A sustainability-focused shopping app prototype (single-page `home.html`) with a **live barcode scanner** that uses your phone's camera and looks up products via [Open Food Facts](https://world.openfoodfacts.org/).

## Test the barcode scanner on your phone

The scanner uses your phone camera, so it needs **HTTPS** (browsers block camera access on plain `http://` for non-localhost URLs). Two paths below — pick whichever is easier.

### Option A — Easiest: use a free HTTPS tunnel (recommended)

This works whether you're on Wi-Fi or not, and avoids any firewall fiddling.

1. **Start a local web server** in the project folder (where `home.html` lives):

   - macOS / Linux:
     ```bash
     python3 -m http.server 8000
     ```
   - Windows (PowerShell):
     ```powershell
     python -m http.server 8000
     ```

   Leave that terminal open.

2. **In a second terminal**, start a Cloudflare quick tunnel (no signup, no install if you have Node.js):

   ```bash
   npx --yes cloudflared tunnel --url http://localhost:8000
   ```

   Don't have Node? Install `cloudflared` directly: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

   Or use localtunnel: `npx --yes localtunnel --port 8000`

3. The tunnel prints a URL like `https://something-random.trycloudflare.com`. **Open that URL + `/home.html` on your phone**, e.g.:

   ```
   https://something-random.trycloudflare.com/home.html
   ```

4. Tap **Scan barcode**. Your phone will prompt for camera permission — tap **Allow**.

5. Point the rear camera at any product barcode (UPC, EAN, etc.). The app will detect it, look it up on Open Food Facts, and show a sustainability report.

### Option B — Same Wi-Fi, no tunnel

This works for the UI and the simulated-scan chips, but **the live camera will be disabled** (browsers require HTTPS for camera on non-localhost URLs).

1. Start the local server as in Option A step 1.
2. Find your computer's local IP:
   - macOS: `ipconfig getifaddr en0`
   - Linux: `hostname -I`
   - Windows: `ipconfig` (look at the IPv4 Address under your Wi-Fi adapter)
3. Make sure your phone is on the same Wi-Fi.
4. Open `http://YOUR-IP:8000/home.html` on your phone (e.g. `http://192.168.1.42:8000/home.html`).
5. Tap any of the **"Tap to simulate scan"** chips at the bottom of the scan screen to try the analyze + result flow without a camera.

## How the live scanner works

- Uses the browser's native [`BarcodeDetector` API](https://developer.mozilla.org/docs/Web/API/Barcode_Detection_API) where available (Chrome on Android).
- Falls back to the [ZXing](https://github.com/zxing-js/library) JS library for iOS Safari and other browsers.
- Detected barcodes are matched against the built-in demo products first, then looked up via the public Open Food Facts API.
- The video feed stays on the device — nothing is uploaded.

## Troubleshooting

- **Camera permission was denied:** Tap the lock/info icon in your browser's address bar, allow Camera, then reload.
- **"HTTPS required" message:** You're on a plain `http://` URL. Use the tunnel (Option A) so the URL is `https://...`.
- **Barcode not detected:** Hold the phone steady ~10–20 cm from the barcode in good lighting. If it still doesn't read, tap one of the sample chips at the bottom to simulate a scan.
- **"Barcode … not found" toast:** That product isn't in Open Food Facts. Try a common grocery item (most boxed/canned foods are indexed).
