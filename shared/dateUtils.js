// Reine Funktionen ohne Abhängigkeiten — werden sowohl im Browser (Vite)
// als auch im Node-Backend (server/server.js) importiert.

export function parseDatum(s) {
  const [jahr, monat, tag] = s.split("-").map(Number);
  return { jahr, monat, tag };
}

export function tageImJahr(jahr) {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 366 : 365;
}

export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export function berechneEintrag(eintrag, heute) {
  const { jahr: ursprungsJahr, monat, tag } = parseDatum(eintrag.datum);
  const heuteMitternacht = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());

  let naechstesJahr = heute.getFullYear();
  let naechsterTermin = new Date(naechstesJahr, monat - 1, tag);
  if (naechsterTermin < heuteMitternacht) {
    naechstesJahr += 1;
    naechsterTermin = new Date(naechstesJahr, monat - 1, tag);
  }

  const tageBis = Math.round((naechsterTermin - heuteMitternacht) / 86400000);
  const jahreDannAlt = naechstesJahr - ursprungsJahr;
  const angleDeg = (dayOfYear(new Date(2001, monat - 1, tag)) / 365) * 360 - 90;

  return { ...eintrag, ursprungsJahr, monat, tag, naechsterTermin, tageBis, jahreDannAlt, angleDeg };
}

export function formatDatum(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}
