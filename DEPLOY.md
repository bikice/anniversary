# Deploying to your server (nginx + pm2)

Two things to get right for push to actually work in production:

1. **HTTPS on the domain the browser sees.** The Push API refuses to
   subscribe over plain HTTP (localhost is the only exception). Your
   outer reverse proxy is presumably already terminating TLS — as long
   as *that* is HTTPS, it's fine if the hop from the outer proxy to
   this app's nginx is plain HTTP internally.
2. **The backend process must run continuously**, since the daily cron
   check only fires while `server.js` is alive. That's what pm2 is for.

## 1. Get the code onto the server

```bash
git clone <your-repo> /var/www/jahrestage-app
cd /var/www/jahrestage-app
cp shared/jahrestage.config.example.js shared/jahrestage.config.js
# edit shared/jahrestage.config.js with your real dates
```

## 2. Build the frontend

```bash
npm install
npm run build
```

This produces `dist/`. nginx will serve this directory directly as
static files — no Node process needed for the frontend itself.

## 3. Set up the backend

```bash
cd server
npm install --omit=dev
npm run generate-vapid-keys
cp .env.example .env
```

Edit `server/.env`:

```
VAPID_PUBLIC_KEY=...       # from generate-vapid-keys
VAPID_PRIVATE_KEY=...      # from generate-vapid-keys
VAPID_KONTAKT_EMAIL=you@yourdomain.com
PORT=3001
CRON_ZEITPLAN=0 9 * * *
```

## 4. Start the backend with pm2

An `ecosystem.config.cjs` is already in `server/`:

```bash
cd server
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed instructions once, so pm2 survives a reboot
```

Useful commands afterwards:

```bash
pm2 logs jahrestage-server   # tail logs
pm2 restart jahrestage-server
```

## 5. Configure nginx

A starting point is in `nginx/jahrestage.conf` — copy it in and adjust
`server_name` and `root`:

```bash
sudo cp nginx/jahrestage.conf /etc/nginx/sites-available/jahrestage.conf
sudo ln -s /etc/nginx/sites-available/jahrestage.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

It does two things:
- Serves `dist/` as static files at `/`
- Proxies `/api/` to the pm2-managed backend on `127.0.0.1:3001`

Because the frontend calls `fetch("/api/...")` with a relative path,
no separate CORS setup or hardcoded backend URL is needed — nginx
makes frontend and backend look like a single origin to the browser.

## 6. Point your outer reverse proxy at this nginx

However your outer reverse proxy is set up (Host-based routing,
different port, etc.), it just needs to forward requests for your
domain to this nginx instance (the one running the config from step
5). Two things matter on that hop:
- Forward the `Host` header unchanged.
- If the outer proxy strips `X-Forwarded-Proto`, add it back — some
  frameworks use it to detect HTTPS, though this app doesn't currently
  depend on it.

If the outer proxy already handles TLS, you don't need a certificate
on this inner nginx. If this nginx *is* the one facing the internet
directly (no separate edge proxy for this domain), get a certificate
with certbot instead:

```bash
sudo certbot --nginx -d jahrestage.example.com
```

## 7. Verify

```bash
curl -I https://jahrestage.example.com/           # frontend loads
curl https://jahrestage.example.com/api/vapid-public-key   # backend reachable
```

Then open the app in a browser, click the bell icon, grant the
notification permission, and trigger a manual test:

```bash
curl -X POST https://jahrestage.example.com/api/test-notification
```

## Updating later

```bash
git pull
npm install && npm run build       # rebuild frontend
cd server && npm install --omit=dev
pm2 restart jahrestage-server
```

`shared/jahrestage.config.js`, `server/.env` and
`server/subscriptions.json` are all gitignored, so `git pull` never
touches your personal dates, secrets, or existing push subscriptions.
