import { useEffect, useMemo, useState } from "react";
import { Sun, Moon, Bell, BellRing, BellOff } from "lucide-react";
import { KONFIGURATION } from "../shared/jahrestage.config.js";
import { tageImJahr, dayOfYear, berechneEintrag, formatDatum } from "../shared/dateUtils.js";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const THEMES = {
  dunkel: {
    bg: "#12151C",
    surface: "#1A1F29",
    surfaceHover: "#1F2530",
    text: "#EDE8DA",
    textSoft: "#8891A3",
    textFaint: "#4A5163",
    line: "#262C38",
    accent: "#E8A33D",
    accentSoft: "#E8A33D33",
    ring: "#3A4254",
  },
  hell: {
    bg: "#F5F3ED",
    surface: "#FFFFFF",
    surfaceHover: "#FBF9F4",
    text: "#20242E",
    textSoft: "#6B7280",
    textFaint: "#B3AFA3",
    line: "#E6E2D6",
    accent: "#B0721E",
    accentSoft: "#B0721E22",
    ring: "#D8D3C4",
  },
};

// Wandelt den VAPID-Public-Key (Base64url) in das Uint8Array-Format um,
// das die Push-API erwartet.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function JahrestagApp() {
  const [heute] = useState(new Date());
  const [modus, setModus] = useState("dunkel");
  const [pushStatus, setPushStatus] = useState("unbekannt"); // unbekannt | aktiv | inaktiv | nicht_unterstuetzt | fehler
  const t = THEMES[modus];

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("nicht_unterstuetzt");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setPushStatus(subscription ? "aktiv" : "inaktiv");
    });
  }, []);

  async function benachrichtigungenAktivieren() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const berechtigung = await Notification.requestPermission();
      if (berechtigung !== "granted") {
        setPushStatus("inaktiv");
        return;
      }

      const { publicKey } = await fetch("/api/vapid-public-key").then((r) => r.json());
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      setPushStatus("aktiv");
    } catch (err) {
      console.error("Push-Anmeldung fehlgeschlagen:", err);
      setPushStatus("fehler");
    }
  }

  const eintraege = useMemo(() => {
    return KONFIGURATION.map((e) => berechneEintrag(e, heute)).sort((a, b) => a.tageBis - b.tageBis);
  }, [heute]);

  const naechster = eintraege[0];
  const heuteAngle = (dayOfYear(heute) / tageImJahr(heute.getFullYear())) * 360 - 90;

  const R = 128;
  const CX = 160;
  const CY = 160;
  const toXY = (angleDeg, radius = R) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
  };

  return (
    <div
      className="min-h-screen px-6 py-10 sm:py-14 flex flex-col items-center transition-colors duration-300"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-ui { font-family: 'Inter', sans-serif; }
        .row-hover:hover { background-color: var(--row-hover); }
      `}</style>

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 sm:mb-16 font-ui">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight">Jahrestage</h1>
            <p className="text-xs mt-1" style={{ color: t.textSoft }}>
              {formatDatum(heute)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pushStatus !== "nicht_unterstuetzt" && (
              <button
                onClick={pushStatus === "aktiv" ? undefined : benachrichtigungenAktivieren}
                aria-label="Benachrichtigungen aktivieren"
                disabled={pushStatus === "aktiv"}
                className="h-10 px-3 rounded-full flex items-center gap-2 transition-colors duration-200"
                style={{
                  backgroundColor: pushStatus === "aktiv" ? t.accentSoft : t.surface,
                  border: `1px solid ${pushStatus === "aktiv" ? t.accent : t.line}`,
                  color: pushStatus === "aktiv" ? t.accent : t.textSoft,
                }}
              >
                {pushStatus === "fehler" ? <BellOff size={15} /> : pushStatus === "aktiv" ? <BellRing size={15} /> : <Bell size={15} />}
                <span className="text-xs font-ui">
                  {pushStatus === "aktiv" ? "Aktiv" : pushStatus === "fehler" ? "Fehlgeschlagen" : "Benachrichtigungen"}
                </span>
              </button>
            )}
            <button
              onClick={() => setModus(modus === "dunkel" ? "hell" : "dunkel")}
              aria-label="Farbmodus umschalten"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.line}`, color: t.textSoft }}
            >
              {modus === "dunkel" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>

        {!naechster ? (
          <p className="font-ui" style={{ color: t.textSoft }}>
            Keine Jahrestage konfiguriert.
          </p>
        ) : (
          <>
            {/* HERO */}
            <div
              className="flex flex-col sm:flex-row items-center gap-10 sm:gap-14 mb-16 sm:mb-20 p-6 sm:p-10 rounded-3xl transition-colors duration-300"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.line}` }}
            >
              <svg width="288" height="288" viewBox="0 0 320 320" className="shrink-0" role="img" aria-label="Jahresrad mit allen Jahrestagen">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke={t.line} strokeWidth="1" />

                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * 360 - 90;
                  const inner = toXY(angle, R - 5);
                  const outer = toXY(angle, R + 5);
                  const label = toXY(angle, R + 19);
                  return (
                    <g key={i}>
                      <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={t.ring} strokeWidth="1" />
                      <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="font-mono" fontSize="9" fill={t.textFaint}>
                        {MONATE[i]}
                      </text>
                    </g>
                  );
                })}

                {eintraege.map((e, i) => {
                  const isNext = e === naechster;
                  const pos = toXY(e.angleDeg);
                  return (
                    <g key={i}>
                      {isNext && <circle cx={pos.x} cy={pos.y} r="11" fill="none" stroke={t.accent} strokeWidth="1" opacity="0.45" />}
                      <circle cx={pos.x} cy={pos.y} r={isNext ? "5" : "3.5"} fill={isNext ? t.accent : t.ring} />
                    </g>
                  );
                })}

                {(() => {
                  const a = toXY(heuteAngle, R + 5);
                  const b = toXY(heuteAngle, R - 5);
                  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={t.text} strokeWidth="2" strokeLinecap="round" />;
                })()}

                <text x={CX} y={CY - 4} textAnchor="middle" className="font-mono" fontSize="32" fontWeight="500" fill={t.text}>
                  {naechster.tageBis}
                </text>
                <text x={CX} y={CY + 18} textAnchor="middle" className="font-ui" fontSize="11" fill={t.textSoft}>
                  {naechster.tageBis === 1 ? "Tag" : "Tage"}
                </text>
              </svg>

              <div className="flex-1 text-center sm:text-left">
                <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: t.accent }}>
                  Nächster Jahrestag
                </p>
                <h2 className="font-display text-3xl sm:text-4xl mb-3 leading-tight">{naechster.titel}</h2>
                <p className="font-ui text-base mb-1" style={{ color: t.textSoft }}>
                  {formatDatum(naechster.naechsterTermin)}
                </p>
                <p className="font-ui text-sm" style={{ color: t.textFaint }}>
                  wird {naechster.jahreDannAlt} {naechster.jahreDannAlt === 1 ? "Jahr" : "Jahre"} alt · seit {naechster.ursprungsJahr}
                </p>
              </div>
            </div>

            {/* Übersicht */}
            <div>
              <p className="font-ui text-xs uppercase tracking-widest mb-4" style={{ color: t.textSoft }}>
                Übersicht
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.line}` }}>
                {eintraege.map((e, i) => {
                  const isNext = e === naechster;
                  return (
                    <div
                      key={i}
                      className="row-hover flex items-center gap-4 py-4 px-4 sm:px-5 font-ui transition-colors duration-150"
                      style={{
                        backgroundColor: isNext ? t.accentSoft : t.surface,
                        borderBottom: i < eintraege.length - 1 ? `1px solid ${t.line}` : "none",
                        "--row-hover": t.surfaceHover,
                      }}
                    >
                      <div className="font-mono text-sm w-12 text-right shrink-0" style={{ color: isNext ? t.accent : t.textFaint }}>
                        {e.tageBis}T
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isNext ? t.accent : t.ring }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: t.text }}>
                          {e.titel} <span style={{ color: t.textFaint }}>({e.ursprungsJahr})</span>
                        </p>
                      </div>
                      <div className="text-sm font-mono shrink-0" style={{ color: t.textSoft }}>
                        {String(e.tag).padStart(2, "0")}.{String(e.monat).padStart(2, "0")}.
                      </div>
                      <div className="text-sm w-20 text-right shrink-0 hidden sm:block" style={{ color: t.textFaint }}>
                        wird {e.jahreDannAlt}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
