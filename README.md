# Jahrestage

Zeigt den nächsten Jahrestag samt Jahresrad und eine Übersicht aller
konfigurierten Termine. Optional mit echten Push-Benachrichtigungen,
auch wenn die App nicht geöffnet ist.

## Struktur

- `src/` — React-Frontend (Vite)
- `shared/` — Konfiguration und Datumslogik, von Frontend **und** Backend genutzt
- `server/` — Node/Express-Backend, das die Push-Nachrichten verschickt
- `public/` — Service Worker, Manifest, Icons

## 1. Konfiguration anlegen

```
cp shared/jahrestage.config.example.js shared/jahrestage.config.js
```

Danach `shared/jahrestage.config.js` mit den eigenen Terminen füllen.
Diese Datei ist in `.gitignore` und wird nicht versioniert.

## 2. Frontend einrichten

```
npm install
npm run dev
```

Läuft standardmäßig auf `http://localhost:5173`.

## 3. Push-Backend einrichten (für echte Benachrichtigungen)

```
cd server
npm install
npm run generate-vapid-keys
cp .env.example .env
```

Die ausgegebenen Schlüssel aus `generate-vapid-keys` in `server/.env`
eintragen (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), dazu eine
Kontakt-E-Mail-Adresse. Danach den Server starten:

```
npm start
```

Läuft standardmäßig auf `http://localhost:3001`. Der Vite-Dev-Server
leitet `/api`-Anfragen automatisch dorthin weiter.

Frontend (`npm run dev`, Port 5173) und Backend (`npm start`, Port
3001) müssen beide gleichzeitig laufen.

## 4. Benachrichtigungen aktivieren

In der App oben rechts auf den Glocken-Button klicken und die
Browser-Berechtigung erteilen. Das Backend prüft täglich (Standard:
9:00 Uhr, einstellbar über `CRON_ZEITPLAN` in `server/.env`), ob ein
Jahrestag in 7 Tagen, 1 Tag oder heute ansteht, und schickt dann eine
Push-Nachricht.

Zum Testen ohne zu warten:

```
curl -X POST http://localhost:3001/api/test-notification
```

## Hinweise für den Dauerbetrieb

- Damit Push auch funktioniert, wenn dein Rechner/Server dauerhaft
  läuft, muss der Backend-Prozess dauerhaft laufen (z. B. mit `pm2`
  oder als systemd-Service) und der Cron-Zeitplan trifft dann täglich zu.
- Für echte Erreichbarkeit von unterwegs müsste die App über HTTPS
  gehostet werden (Push-APIs verlangen das, außer auf `localhost`).
- `server/subscriptions.json` speichert die Push-Abos und wird nicht
  versioniert (siehe `.gitignore`).
