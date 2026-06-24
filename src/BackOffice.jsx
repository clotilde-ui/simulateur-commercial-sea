import { useState } from "react";
import { loadTracking, saveTracking, fmtDuration, fmtDate, fmtDateShort } from "./tracking";
import { loadSpaces, saveSpaces, genSpaceId } from "./spaces";
import { loadUsers, saveUsers, genUserId, loadInvites, saveInvites } from "./users";
import { SECTORS } from "./config/defaults";

const ROLES = ["Propriétaire", "Éditeur", "Lecteur"];
const USER_ROLES = ["Utilisateur", "Admin"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const decodeState = (st) => { try { return JSON.parse(atob(st)); } catch { return {}; } };

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
  const [newSpaceName, setNewSpaceName] = useState("");
  const [managingSpaceId, setManagingSpaceId] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [addMode, setAddMode] = useState("existant");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Lecteur");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const goSection = (key) => { setSection(key); setManagingSpaceId(null); };

  const spaces = loadSpaces();
  const users = loadUsers();
  const createSpace = () => {
    const name = newSpaceName.trim();
    if (!name) return;
    const list = loadSpaces();
    list.push({ id: genSpaceId(), name, createdAt: new Date().toISOString(), role: "Propriétaire", members: [] });
    saveSpaces(list);
    setNewSpaceName("");
    refresh();
  };
  const deleteSpace = (s) => {
    if (!window.confirm(`Supprimer l'espace « ${s.name} » ?`)) return;
    saveSpaces(loadSpaces().filter(x => x.id !== s.id));
    refresh();
  };
  const manageSpace = (s) => { setManagingSpaceId(s.id); setRenameInput(s.name); setAddMode("existant"); setSelectedUserId(""); setInviteEmail(""); setMemberRole("Lecteur"); };

  const updateSpace = (id, fn) => {
    const list = loadSpaces();
    const sp = list.find(x => x.id === id);
    if (!sp) return;
    fn(sp);
    saveSpaces(list);
    refresh();
  };
  const renameSpace = (s) => {
    const name = renameInput.trim();
    if (!name || name === s.name) return;
    // Reporte le renommage sur les rapports rattachés à l'ancien nom d'espace.
    const t = loadTracking();
    Object.values(t).forEach(e => { if (e.espace === s.name) e.espace = name; });
    saveTracking(t);
    updateSpace(s.id, sp => { sp.name = name; });
  };
  const addMember = (s) => {
    let member = null;
    if (addMode === "existant") {
      const u = users.find(x => x.id === selectedUserId);
      if (!u) return;
      member = { id: u.id, name: u.name, email: u.email, role: memberRole };
    } else {
      const email = inviteEmail.trim();
      if (!email) return;
      member = { id: genSpaceId(), name: email.split("@")[0], email, role: memberRole };
    }
    updateSpace(s.id, sp => {
      sp.members = sp.members || [];
      if (sp.members.some(m => m.email === member.email)) return;
      sp.members.push(member);
    });
    setSelectedUserId(""); setInviteEmail("");
  };
  const changeMemberRole = (s, idx, role) => updateSpace(s.id, sp => { (sp.members || [])[idx].role = role; });
  const removeMember = (s, idx) => updateSpace(s.id, sp => { sp.members = (sp.members || []).filter((_, i) => i !== idx); });

  const managed = managingSpaceId ? spaces.find(s => s.id === managingSpaceId) : null;

  // ── Utilisateurs ──
  const [uInviteEmail, setUInviteEmail] = useState("");
  const [uInviteSpace, setUInviteSpace] = useState("");
  const [uInviteRole, setUInviteRole] = useState("Lecteur");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPwd, setNewUserPwd] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);

  const usersFull = loadUsers();
  const invites = loadInvites();
  const activeEmails = new Set(usersFull.map(u => u.email));
  const inviteStatus = (inv) =>
    activeEmails.has(inv.email) ? "activated"
    : (new Date(inv.expiresAt).getTime() < Date.now() ? "expired" : "pending");
  const spacesOfUser = (email) => spaces.filter(s => (s.members || []).some(m => m.email === email));

  const sendInvite = () => {
    const email = uInviteEmail.trim();
    if (!email) return;
    const now = Date.now();
    const list = loadInvites();
    list.push({ id: genUserId(), email, espace: uInviteSpace, role: uInviteRole, sentAt: new Date(now).toISOString(), expiresAt: new Date(now + WEEK_MS).toISOString() });
    saveInvites(list);
    setUInviteEmail("");
    refresh();
  };
  const regenInvite = (inv) => {
    const now = Date.now();
    const list = loadInvites();
    const it = list.find(x => x.id === inv.id);
    if (it) { it.sentAt = new Date(now).toISOString(); it.expiresAt = new Date(now + WEEK_MS).toISOString(); }
    saveInvites(list);
    refresh();
  };
  const deleteInvite = (inv) => { saveInvites(loadInvites().filter(x => x.id !== inv.id)); refresh(); };
  const createAccount = () => {
    const email = newUserEmail.trim();
    if (!email || newUserPwd.length < 8) { window.alert("Email requis et mot de passe d'au moins 8 caractères."); return; }
    const list = loadUsers();
    if (list.some(u => u.email === email)) { window.alert("Un compte avec cet email existe déjà."); return; }
    list.push({ id: genUserId(), name: newUserName.trim() || email.split("@")[0], email, role: "Utilisateur", createdAt: new Date().toISOString(), cnx: 0, temps: 0, interactions: 0, firstLogin: null, lastLogin: null });
    saveUsers(list);
    setNewUserName(""); setNewUserEmail(""); setNewUserPwd("");
    refresh();
  };
  const changeUserRole = (u, role) => { const list = loadUsers(); const it = list.find(x => x.id === u.id); if (it) it.role = role; saveUsers(list); refresh(); };
  const deleteUser = (u) => { if (!window.confirm(`Supprimer le compte « ${u.name} » ?`)) return; saveUsers(loadUsers().filter(x => x.id !== u.id)); refresh(); };

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

  const espaceOptions = Array.from(new Set([
    ...spaces.map(s => s.name),
    ...all.map(e => e.espace).filter(x => x && x !== "—"),
  ]));

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
              <button key={n.key} onClick={() => goSection(n.key)} style={{
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
                {espaceOptions.map(es => <option key={es} value={es}>{es}</option>)}
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
        ) : section === "espaces" ? (managed ? (
          <>
            {/* En-tête détail espace */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26 }}>
              <div>
                <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0, color: CREAM }}>{managed.name}</h1>
                <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6 }}>
                  {(managed.members || []).length} membre{(managed.members || []).length > 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => setManagingSpaceId(null)} style={{
                padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: CREAM, fontFamily: "'DM Sans',sans-serif",
              }}>← Espaces clients</button>
            </div>

            {/* Renommer */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 22px", marginBottom: 22 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Renommer l'espace</div>
              <div style={{ display: "flex", gap: 12 }}>
                <input value={renameInput} onChange={e => setRenameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && renameSpace(managed)}
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => renameSpace(managed)} style={{
                  padding: "11px 26px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: CREAM, fontFamily: "'DM Sans',sans-serif",
                }}>Renommer</button>
              </div>
            </div>

            {/* Ajouter un membre */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 22px", marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Ajouter un membre</div>
                <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 3 }}>
                  {[["existant", "Utilisateur existant"], ["email", "Inviter par email"]].map(([k, l]) => (
                    <button key={k} onClick={() => setAddMode(k)} style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                      background: addMode === k ? ACCENT : "transparent", color: addMode === k ? "#fff" : MUTED, fontFamily: "'DM Sans',sans-serif",
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {addMode === "existant" ? (
                  <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
                    <option value="">Sélectionner un utilisateur…</option>
                    {users.filter(u => !(managed.members || []).some(m => m.email === u.email)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} · {u.email}</option>
                    ))}
                  </select>
                ) : (
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addMember(managed)}
                    placeholder="email@client.com" style={{ ...inputStyle, flex: 1 }} />
                )}
                <select value={memberRole} onChange={e => setMemberRole(e.target.value)} style={{ ...inputStyle, width: 140, cursor: "pointer" }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => addMember(managed)} style={{
                  padding: "11px 26px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: ACCENT, border: `1px solid ${ACCENT}`, color: "#fff", fontFamily: "'DM Sans',sans-serif",
                }}>Ajouter</button>
              </div>
            </div>

            {/* Membres */}
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Membres : {(managed.members || []).length}</div>
            {(managed.members || []).length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 30 }}>Aucun membre pour l'instant.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 30 }}>
                {(managed.members || []).map((m, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 22px" }}>
                    <div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: CREAM }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{m.email}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <select value={m.role} onChange={e => changeMemberRole(managed, idx, e.target.value)} style={{ ...inputStyle, padding: "8px 12px", cursor: "pointer" }}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={() => removeMember(managed, idx)} style={{
                        padding: "8px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        background: "transparent", border: "1px solid rgba(255,107,61,0.35)", color: ACCENT, fontFamily: "'DM Sans',sans-serif",
                      }}>Retirer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rapports de l'espace */}
            {(() => {
              const spaceReports = all.filter(e => e.espace === managed.name);
              return (
                <>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Rapports : {spaceReports.length}</div>
                  {spaceReports.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucun rapport dans cet espace.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                      <thead>
                        <tr>
                          <th style={th}>Prospect</th>
                          <th style={th}>Site</th>
                          <th style={th}>Secteur</th>
                          <th style={th}>Date</th>
                          <th style={{ ...th, textAlign: "right" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {spaceReports.map(e => {
                          const d = decodeState(e.state);
                          return (
                            <tr key={e.id} style={{ background: CARD }}>
                              <td style={{ ...td, borderRadius: "10px 0 0 10px", fontWeight: e.prospect === "Sans nom" ? 400 : 700, fontStyle: e.prospect === "Sans nom" ? "italic" : "normal", color: e.prospect === "Sans nom" ? MUTED : CREAM }}>{e.prospect}</td>
                              <td style={{ ...td, color: MUTED }}>{e.website || "-"}</td>
                              <td style={{ ...td, color: MUTED }}>{SECTORS[d.sector] || "-"}</td>
                              <td style={{ ...td, color: MUTED }}>{fmtDateShort(e.creation)}</td>
                              <td style={{ ...td, borderRadius: "0 10px 10px 0", textAlign: "right" }}>
                                <button onClick={() => openReport(e)} disabled={!e.state} style={{ ...actionBtn("ouvrir"), opacity: e.state ? 1 : 0.4, cursor: e.state ? "pointer" : "default" }}>Ouvrir</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0, color: CREAM }}>Espaces clients</h1>
            <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6, marginBottom: 26 }}>
              {spaces.length} espace{spaces.length > 1 ? "s" : ""}
            </div>

            {/* Nouvel espace client */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 22px", marginBottom: 26 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Nouvel espace client</div>
              <div style={{ display: "flex", gap: 12 }}>
                <input value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createSpace()}
                  placeholder="Nom du client (ex : Agence Durand)"
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={createSpace} style={{
                  padding: "11px 28px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: ACCENT, border: `1px solid ${ACCENT}`, color: "#fff", fontFamily: "'DM Sans',sans-serif",
                }}>Créer</button>
              </div>
            </div>

            {/* Liste des espaces */}
            {spaces.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
                Aucun espace client. Créez-en un ci-dessus pour organiser vos rapports.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {spaces.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 24px" }}>
                    <div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 17, color: CREAM }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{fmtDateShort(s.createdAt)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{s.role || "Propriétaire"}</span>
                      <button onClick={() => manageSpace(s)} style={{
                        padding: "8px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: CREAM, fontFamily: "'DM Sans',sans-serif",
                      }}>Gérer</button>
                      <button onClick={() => deleteSpace(s)} style={{
                        padding: "8px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        background: "transparent", border: "1px solid rgba(255,107,61,0.35)", color: ACCENT, fontFamily: "'DM Sans',sans-serif",
                      }}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )) : section === "utilisateurs" ? (() => {
          const enCours = invites.filter(i => inviteStatus(i) !== "activated").length;
          const recentActivity = Object.values(store)
            .flatMap(e => (e.visits || []).map(v => ({ ts: v.ts, duration: v.duration, prospect: e.label })))
            .sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 15);
          return (
          <>
            <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0, color: CREAM }}>Utilisateurs</h1>
            <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6, marginBottom: 26 }}>
              {usersFull.length} compte{usersFull.length > 1 ? "s" : ""} actif{usersFull.length > 1 ? "s" : ""} · {enCours} invitation{enCours > 1 ? "s" : ""} en cours
            </div>

            {/* Inviter par email */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 22px", marginBottom: 22 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Inviter un utilisateur par email</div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <input value={uInviteEmail} onChange={e => setUInviteEmail(e.target.value)} placeholder="Email du client *" style={{ ...inputStyle, flex: 1 }} />
                <select value={uInviteSpace} onChange={e => setUInviteSpace(e.target.value)} style={{ ...inputStyle, minWidth: 260, cursor: "pointer" }}>
                  <option value="">Aucun espace</option>
                  {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <select value={uInviteRole} onChange={e => setUInviteRole(e.target.value)} style={{ ...inputStyle, width: 140, cursor: "pointer" }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={sendInvite} style={{ padding: "11px 22px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", background: ACCENT, border: `1px solid ${ACCENT}`, color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>+ Envoyer une invitation</button>
            </div>

            {/* Créer un compte */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 22px", marginBottom: 30 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Créer un compte directement</div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nom (optionnel)" style={{ ...inputStyle, flex: 1 }} />
                <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email *" style={{ ...inputStyle, flex: 1 }} />
                <input type="password" value={newUserPwd} onChange={e => setNewUserPwd(e.target.value)} placeholder="Mot de passe * (8 min.)" style={{ ...inputStyle, flex: 1 }} />
              </div>
              <button onClick={createAccount} style={{ padding: "11px 22px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: CREAM, fontFamily: "'DM Sans',sans-serif" }}>+ Créer le compte</button>
            </div>

            {/* Invitations */}
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Invitations</div>
            {invites.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 30 }}>Aucune invitation.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginBottom: 30 }}>
                <thead><tr>
                  <th style={th}>Email</th><th style={th}>Espace</th><th style={th}>Statut</th>
                  <th style={th}>Envoyée</th><th style={th}>Expire / activée</th><th style={{ ...th, textAlign: "right" }}></th>
                </tr></thead>
                <tbody>
                  {invites.map(inv => {
                    const st = inviteStatus(inv);
                    const badge = st === "activated"
                      ? { bg: "rgba(95,185,138,0.15)", col: "#5fb98a", txt: "Compte activé" }
                      : st === "expired"
                      ? { bg: "rgba(255,255,255,0.08)", col: "rgba(255,255,255,0.5)", txt: "Invitation expirée" }
                      : { bg: "rgba(255,107,61,0.15)", col: ACCENT, txt: "En attente" };
                    return (
                      <tr key={inv.id} style={{ background: CARD }}>
                        <td style={{ ...td, borderRadius: "10px 0 0 10px" }}>{inv.email}</td>
                        <td style={{ ...td, color: MUTED }}>{inv.espace || "—"}</td>
                        <td style={td}><span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 7, background: badge.bg, color: badge.col }}>{badge.txt}</span></td>
                        <td style={{ ...td, color: MUTED }}>{fmtDateShort(inv.sentAt)}</td>
                        <td style={{ ...td, color: MUTED }}>{fmtDateShort(inv.expiresAt)}</td>
                        <td style={{ ...td, borderRadius: "0 10px 10px 0", textAlign: "right", whiteSpace: "nowrap" }}>
                          {st === "expired" && <><button onClick={() => regenInvite(inv)} style={actionBtn("deplacer")}>Régénérer</button>{" "}</>}
                          <button onClick={() => deleteInvite(inv)} style={actionBtn("supprimer")}>Supprimer</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Comptes actifs */}
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Comptes actifs</div>
            {usersFull.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 30 }}>Aucun compte. Créez-en un ci-dessus.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginBottom: 30 }}>
                <thead><tr>
                  <th style={th}>Nom</th><th style={th}>Email</th><th style={th}>Rôle</th><th style={th}>Espaces</th>
                  <th style={th}>1re cnx</th><th style={th}>Dernière cnx</th>
                  <th style={{ ...th, textAlign: "right" }}>Cnx</th><th style={{ ...th, textAlign: "right" }}>Temps passé</th><th style={{ ...th, textAlign: "right" }}>Interactions</th>
                  <th style={{ ...th, textAlign: "right" }}></th>
                </tr></thead>
                <tbody>
                  {usersFull.map(u => {
                    const us = spacesOfUser(u.email);
                    return (
                      <tr key={u.id} style={{ background: CARD }}>
                        <td style={{ ...td, borderRadius: "10px 0 0 10px", fontWeight: 700, color: CREAM }}>{u.name}</td>
                        <td style={{ ...td, color: MUTED, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</td>
                        <td style={td}>
                          <select value={u.role} onChange={e => changeUserRole(u, e.target.value)} title="Changer le rôle" style={{
                            fontSize: 11.5, fontWeight: 600, padding: "5px 9px", borderRadius: 7, cursor: "pointer", outline: "none", fontFamily: "'DM Sans',sans-serif",
                            background: u.role === "Admin" ? "rgba(255,107,61,0.15)" : "rgba(255,255,255,0.06)",
                            color: u.role === "Admin" ? ACCENT : "rgba(255,255,255,0.7)",
                            border: `1px solid ${u.role === "Admin" ? "rgba(255,107,61,0.3)" : BORDER}`,
                          }}>
                            {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.7)" }}>{us.length} {us.length > 0 ? <span title={us.map(s => s.name).join(", ")} style={{ color: MUTED }}>▾</span> : null}</td>
                        <td style={td}>{u.firstLogin ? fmtDateShort(u.firstLogin) : <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.3)" }}>Jamais connecté</span>}</td>
                        <td style={{ ...td, color: MUTED }}>{u.lastLogin ? fmtDateShort(u.lastLogin) : "-"}</td>
                        <td style={{ ...td, textAlign: "right" }}>{u.cnx || 0}</td>
                        <td style={{ ...td, textAlign: "right" }}>{u.temps ? fmtDuration(u.temps) : "-"}</td>
                        <td style={{ ...td, textAlign: "right" }}>{u.interactions || 0}</td>
                        <td style={{ ...td, borderRadius: "0 10px 10px 0", textAlign: "right" }}>
                          <button onClick={() => deleteUser(u)} style={actionBtn("supprimer")}>Supprimer</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Activité récente */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setActivityOpen(o => !o)}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Activité récente</div>
                <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>{activityOpen ? "▲ Masquer" : "▼ Afficher"}</span>
              </div>
              {activityOpen && (
                <div style={{ marginTop: 14 }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune activité enregistrée.</div>
                  ) : recentActivity.map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "8px 0", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{a.prospect || "Rapport"} consulté</span>
                      <span style={{ color: MUTED }}>{fmtDate(a.ts)} · {fmtDuration(a.duration)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
          );
        })() : (
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
