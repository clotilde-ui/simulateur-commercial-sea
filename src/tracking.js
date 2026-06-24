// Suivi des consultations de liens partagés — stockage 100 % local (localStorage).
// Chaque lien généré reçoit un identifiant (param ?t=). À l'ouverture d'un lien,
// on enregistre une visite (date + durée). Limite assumée : les données restent
// dans le navigateur courant — un suivi inter‑appareils nécessiterait un backend.
export const TRACK_KEY = "sim-link-tracking";

export function loadTracking() {
  try { return JSON.parse(localStorage.getItem(TRACK_KEY)) || {}; } catch { return {}; }
}

export function saveTracking(store) {
  try { localStorage.setItem(TRACK_KEY, JSON.stringify(store)); } catch (_) {}
}

export function genLinkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtDuration(sec) {
  if (!sec || sec < 1) return "< 1 s";
  if (sec < 60) return `${Math.round(sec)} s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return m ? `${h} h ${m} min` : `${h} h`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
