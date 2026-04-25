# terra-broncohacks

A sustainability-focused shopping app prototype (single-page `home.html`) with a barcode scanner.

## Test the barcode scanner on your phone

Follow these simple steps to open the app on your phone and try the scanner.

### 1. Make sure your phone and computer are on the same Wi-Fi

The phone needs to reach your computer over the local network.

### 2. Start a local web server in this folder

Open a terminal in the project folder (where `home.html` lives) and run **one** of these:

**Python (already installed on most computers):**

```bash
python3 -m http.server 8000
```

**Or with Node.js:**

```bash
npx serve -l 8000
```

Leave the terminal running.

### 3. Find your computer's local IP address

- **macOS:** `ipconfig getifaddr en0`
- **Linux:** `hostname -I`
- **Windows:** `ipconfig` (look for "IPv4 Address")

You'll get something like `192.168.1.42`.

### 4. Open the app on your phone

In your phone's browser (Safari on iPhone, Chrome on Android), go to:

```
http://YOUR-IP:8000/home.html
```

Example: `http://192.168.1.42:8000/home.html`

### 5. Allow camera access and try the scanner

1. Tap **Scan barcode** on the home screen (or the 📷 tab at the bottom).
2. When prompted, allow the browser to use your camera.
3. Point the camera at a product barcode, or tap one of the sample products to simulate a scan.

### Troubleshooting

- **Camera won't open:** Browsers only allow camera access on `https://` or `localhost`. If your phone blocks the camera over plain `http://`, use one of these:
  - Run [`ngrok`](https://ngrok.com/) to expose `http://localhost:8000` over HTTPS, then open the `https://...ngrok.io/home.html` URL on your phone.
  - Or run `npx localtunnel --port 8000` and use the HTTPS URL it prints.
- **Page won't load:** Check that your computer's firewall allows incoming connections on port 8000, and that both devices are on the same Wi-Fi network.
- **Barcode not detected:** Use the "Tap to simulate scan" chips at the bottom of the scan screen to try the flow without a real barcode.
