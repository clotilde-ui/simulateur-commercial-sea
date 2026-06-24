import { useState } from "react";
import { loadTracking, saveTracking, fmtDuration, fmtDate } from "./tracking";

const BG = "#0F332B";
const SIDEBAR = "#0C2A23";
const CARD = "rgba(255,255,255,0.03)";
const CREAM = "#F6F1E8";
const ACCENT = "#FF6B3D";
const MUTED = "rgba(255,255,255,0.4)";
const BORDER = "rgba(255,255,255,0.08)";

// Sections du back-office (les "espaces"). Seule "Rapports" est active pour
// l'instant ; les autres seront configurées ultérieurement.
const NAV = [
  { key: "rapports", label: "Rapports", icon: "M9 3h6a2 2 0 012 2v0H7v0a2 2 0 012-2zM7 5h10v15a1 1 0 01-1 1H8a1 1 0 01-1-1V5z" },
  { key: "espaces", label: "Espaces clients", icon: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a3 3 0 100-6 3 3 0 000 6zM21 20v-2a4 4 0 00-3-3.87" },
  { key: "utilisateurs", label: "Utilisateurs", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" },
  { key: "configuration", label: "Configuration", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2l-.4-2.6H10l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12a7 7 0 00.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2l.4 2.6h4l.4-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0019 12z" },
];

function Icon({ d }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function BackOffice({ onBack }) {
  const [section, setSection] = useState("rapports");
  const [search, setSearch] = useState("");
  const [espaceFilter, setEspaceFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const store = loadTracking();
  const all = Object.entries(store).map(([id, e]) => {
    const visits = e.visits || [];
    const last = visits.length ? visits.reduce((a, b) => (new Date(b.ts) > new Date(a.ts) ? b : a)) : null;
    return {
      id,
      prospect: e.label || "Sans nom",
      website: e.website || "",
      espace: e.espace || "—",
      vues: visits.length,
      temps: visits.reduce((s, v) => s + (v.duration || 0), 0),
      interactions: e.interactions ?? null,
      derniere: last ? last.ts : null,
      creation: e.createdAt,
      state: e.state,
    };
  });

  const espaces = Array.from(new Set(all.map(e => e.espace).filter(x => x && x !== "—")));

  let rows = all.filter(e =>
    (!search || e.prospect.toLowerCase().includes(search.toLowerCase())) &&
    (!espaceFilter || e.espace === espaceFilter)
  );
  rows.sort((a, b) => {
    if (sort === "vues") return b.vues - a.vues;
    if (sort === "ancien") return new Date(a.creation) - new Date(b.creation);
    return new Date(b.creation) - new Date(a.creation); // recent
  });

  const openReport = (e) => {
    if (!e.state) return;
    // Ouverture interne (sans &t=) : ne compte pas comme une consultation prospect.
    window.location.href = `${window.location.origin}${window.location.pathname}?s=${e.state}`;
  };
  const moveReport = (e) => {
    const v = window.prompt("Espace client :", e.espace === "—" ? "" : e.espace);
    if (v === null) return;
    const s = loadTracking();
    if (s[e.id]) { s[e.id].espace = v.trim() || "—"; saveTracking(s); refresh(); }
  };
  const deleteReport = (e) => {
    if (!window.confirm(`Supprimer le rapport « ${e.prospect} » ?`)) return;
    const s = loadTracking();
    delete s[e.id]; saveTracking(s); refresh();
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 9,
    padding: "11px 14px", color: CREAM, fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif",
  };
  const actionBtn = (variant) => ({
    padding: "6px 13px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif",
    ...(variant === "ouvrir"
      ? { background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: CREAM }
      : variant === "supprimer"
      ? { background: "transparent", border: "1px solid rgba(255,107,61,0.35)", color: ACCENT }
      : { background: "transparent", border: `1px solid ${BORDER}`, color: MUTED }),
  });
  const th = { fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", textAlign: "left", padding: "0 10px 14px" };
  const td = { fontSize: 12.5, color: "rgba(255,255,255,0.75)", padding: "16px 10px", verticalAlign: "middle" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: BG, fontFamily: "'DM Sans',sans-serif", color: CREAM }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 260, flexShrink: 0, background: SIDEBAR, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 22px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: CREAM }}>Sonate</div>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: MUTED, marginTop: 2 }}>BACK-OFFICE</div>
        </div>

        <nav style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV.map(n => {
            const active = section === n.key;
            return (
              <button key={n.key} onClick={() => setSection(n.key)} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 9,
                cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, fontWeight: active ? 700 : 500,
                background: active ? "rgba(255,107,61,0.12)" : "transparent",
                border: active ? "1px solid rgba(255,107,61,0.3)" : "1px solid transparent",
                color: active ? ACCENT : "rgba(255,255,255,0.6)", transition: "all 0.15s",
              }}>
                <Icon d={n.icon} />{n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: 14, borderTop: `1px solid ${BORDER}` }}>
          <button onClick={onBack} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", borderRadius: 9,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: ACCENT,
          }}>
            ← Simulateur
          </button>
          <div style={{ padding: "12px 4px 2px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Espace back-office</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Sonate</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "30px 38px 60px", maxWidth: 1500 }}>
        {section === "rapports" ? (
          <>
            <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0, color: CREAM }}>Rapports enregistrés</h1>
            <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6, marginBottom: 26 }}>
              {all.length} simulation{all.length > 1 ? "s" : ""} sauvegardée{all.length > 1 ? "s" : ""}
            </div>

            {/* Filtres */}
            <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un prospect…"
                style={{ ...inputStyle, flex: 1, minWidth: 240 }} />
              <select value={espaceFilter} onChange={e => setEspaceFilter(e.target.value)} style={{ ...inputStyle, minWidth: 180, cursor: "pointer" }}>
                <option value="">Tous les espaces</option>
                {espaces.map(es => <option key={es} value={es}>{es}</option>)}
              </select>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputStyle, minWidth: 180, cursor: "pointer" }}>
                <option value="recent">Plus récent d'abord</option>
                <option value="ancien">Plus ancien d'abord</option>
                <option value="vues">Plus consultés</option>
              </select>
            </div>

            {rows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
                {all.length === 0
                  ? "Aucun rapport enregistré. Générez un lien depuis le simulateur pour le retrouver ici."
                  : "Aucun rapport ne correspond à votre recherche."}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={th}>Prospect</th>
                    <th style={th}>Site</th>
                    <th style={th}>Espace client</th>
                    <th style={{ ...th, textAlign: "right" }}>Vues</th>
                    <th style={{ ...th, textAlign: "right" }}>Temps passé</th>
                    <th style={{ ...th, textAlign: "right" }}>Interactions</th>
                    <th style={th}>Dernière consult.</th>
                    <th style={th}>Création</th>
                    <th style={{ ...th, textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id} style={{ background: CARD }}>
                      <td style={{ ...td, borderRadius: "10px 0 0 10px", fontWeight: 700, color: CREAM }}>{e.prospect}</td>
                      <td style={{ ...td, color: MUTED, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.website || "-"}</td>
                      <td style={td}>
                        {e.espace && e.espace !== "—"
                          ? <span style={{ fontSize: 11.5, padding: "4px 11px", borderRadius: 7, background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)" }}>{e.espace}</span>
                          : <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: e.vues ? "#5fb98a" : "rgba(255,255,255,0.25)" }}>{e.vues || "-"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{e.temps ? fmtDuration(e.temps) : <span style={{ color: "rgba(255,255,255,0.25)" }}>-</span>}</td>
                      <td style={{ ...td, textAlign: "right" }}>{e.interactions != null ? e.interactions : <span style={{ color: "rgba(255,255,255,0.25)" }}>-</span>}</td>
                      <td style={td}>
                        {e.derniere
                          ? fmtDate(e.derniere)
                          : <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.3)" }}>Jamais consulté</span>}
                      </td>
                      <td style={{ ...td, color: MUTED }}>{fmtDate(e.creation)}</td>
                      <td style={{ ...td, borderRadius: "0 10px 10px 0", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => moveReport(e)} style={actionBtn("deplacer")}>Déplacer</button>{" "}
                        <button onClick={() => openReport(e)} disabled={!e.state} style={{ ...actionBtn("ouvrir"), opacity: e.state ? 1 : 0.4, cursor: e.state ? "pointer" : "default" }}>Ouvrir</button>{" "}
                        <button onClick={() => deleteReport(e)} style={actionBtn("supprimer")}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: CREAM, marginBottom: 8 }}>
              {NAV.find(n => n.key === section)?.label}
            </div>
            <div style={{ fontSize: 14, color: MUTED, maxWidth: 420, lineHeight: 1.6 }}>
              Cet espace sera configuré prochainement.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
