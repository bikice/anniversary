import "dotenv/config";
import express from "express";
import cors from "cors";
import webpush from "web-push";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { KONFIGURATION } from "../shared/jahrestage.config.js";
import { berechneEintrag } from "../shared/dateUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIPTIONS_DATEI = path.join(__dirname, "subscriptions.json");

// An wie vielen Tagen vor einem Jahrestag erinnert werden soll (0 = am selben Tag).
const ERINNERUNGS_TAGE = [7, 1, 0];

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error(
    "VAPID-Schlüssel fehlen. Zuerst ausführen: npm run generate-vapid-keys, dann die Werte in server/.env eintragen."
  );
  process.exit(1);
}

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_KONTAKT_EMAIL || "du@beispiel.de"}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function ladeAbos() {
  if (!fs.existsSync(SUBSCRIPTIONS_DATEI)) return [];
  return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_DATEI, "utf-8"));
}

function speichereAbos(abos) {
  fs.writeFileSync(SUBSCRIPTIONS_DATEI, JSON.stringify(abos, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post("/api/subscribe", (req, res) => {
  const abo = req.body;
  if (!abo || !abo.endpoint) {
    return res.status(400).json({ fehler: "Ungültiges Abo." });
  }
  const abos = ladeAbos();
  if (!abos.some((a) => a.endpoint === abo.endpoint)) {
    abos.push(abo);
    speichereAbos(abos);
  }
  res.status(201).json({ ok: true });
});

app.post("/api/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  const abos = ladeAbos().filter((a) => a.endpoint !== endpoint);
  speichereAbos(abos);
  res.json({ ok: true });
});

// Manueller Testauslöser, z. B. mit: curl -X POST http://localhost:3001/api/test-notification
app.post("/api/test-notification", async (req, res) => {
  await sendeAnAlle({ titel: "Jahrestage", text: "Das ist eine Testbenachrichtigung." });
  res.json({ ok: true });
});

async function sendeAnAlle(payload) {
  const abos = ladeAbos();
  const nochGueltig = [];

  for (const abo of abos) {
    try {
      await webpush.sendNotification(abo, JSON.stringify(payload));
      nochGueltig.push(abo);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log("Abgelaufenes Abo entfernt.");
      } else {
        console.error("Push fehlgeschlagen:", err.message);
        nochGueltig.push(abo);
      }
    }
  }

  speichereAbos(nochGueltig);
}

async function taeglicherCheck() {
  const heute = new Date();
  const eintraege = KONFIGURATION.map((e) => berechneEintrag(e, heute));

  for (const eintrag of eintraege) {
    if (!ERINNERUNGS_TAGE.includes(eintrag.tageBis)) continue;

    const text =
      eintrag.tageBis === 0
        ? `${eintrag.titel} ist heute! Wird ${eintrag.jahreDannAlt} Jahre.`
        : `${eintrag.titel} in ${eintrag.tageBis} ${eintrag.tageBis === 1 ? "Tag" : "Tagen"}.`;

    console.log(`Sende Erinnerung: ${text}`);
    await sendeAnAlle({ titel: "Jahrestage", text, tag: eintrag.titel });
  }
}

const zeitplan = process.env.CRON_ZEITPLAN || "0 9 * * *";
cron.schedule(zeitplan, taeglicherCheck);
console.log(`Täglicher Check eingeplant: "${zeitplan}"`);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Push-Backend läuft auf http://localhost:${PORT}`);
});
