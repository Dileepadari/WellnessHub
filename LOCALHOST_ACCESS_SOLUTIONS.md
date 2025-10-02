# 🌐 Localhost HTTPS Redirect Solutions

## Problem
Browser is automatically redirecting `http://localhost:3000` to `https://localhost:3000`, preventing access to the development application.

## Solution 1: Browser-Based Fixes

### Chrome/Chromium
1. **Clear HSTS Settings:**
   - Go to `chrome://net-internals/#hsts`
   - In "Delete domain security policies" section
   - Enter: `localhost`
   - Click "Delete"
   - Restart browser

2. **Incognito Mode:**
   - Press `Ctrl+Shift+N` (Linux)
   - Navigate to `http://localhost:3000`

3. **Disable Security (Temporary):**
   ```bash
   google-chrome --disable-web-security --user-data-dir="/tmp/chrome_dev_session" --ignore-certificate-errors --ignore-ssl-errors --allow-running-insecure-content
   ```

### Firefox
1. **Clear HSTS:**
   - Go to `about:config`
   - Search for `security.tls.insecure_fallback_hosts`
   - Add `localhost` to the list

2. **Private Window:**
   - Press `Ctrl+Shift+P`
   - Navigate to `http://localhost:3000`

## Solution 2: Alternative Access Methods

### Use Different Port
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Database: `http://localhost:27017`

### Use IP Address Instead
- Try: `http://127.0.0.1:3000`
- Try: `http://0.0.0.0:3000`

## Solution 3: Add HTTPS Support (Recommended)

Generate self-signed certificates for development:

```bash
# Generate certificates
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"

# Update docker-compose.yml to include HTTPS
```

## Solution 4: Browser Extensions

### Chrome HTTPS Redirect Disable
1. Install "HTTPS Everywhere" extension
2. Disable it for localhost
3. Or use "Ignore Certificate Errors" extension

## Quick Test Commands

```bash
# Test if HTTP works
curl http://localhost:3000

# Test if HTTPS is available
curl -k https://localhost:3000

# Check what's listening on ports
netstat -tulpn | grep :3000
```

## Current Service Status
✅ Frontend: http://localhost:3000 (HTTP working)
✅ Backend: http://localhost:5000 (HTTP working)  
✅ MongoDB: localhost:27017
✅ Redis: localhost:6379

## Recommended Immediate Solutions:
1. **Quick Fix:** Use incognito/private browsing mode
2. **Better Fix:** Clear HSTS settings in browser
3. **Best Fix:** Use `http://127.0.0.1:3000` instead of localhost