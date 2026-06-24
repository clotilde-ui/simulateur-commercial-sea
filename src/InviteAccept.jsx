import { useState, useEffect } from "react";

const G = "#1a2e25", G2 = "#142218", G5 = "#233d30", G3 = "#2d4a3e";
const CREAM = "#f5f0e8", ORANGE = "#e8571a", MUTED = "rgba(255,255,255,0.5)";

export default function InviteAccept({ token }) {
  const [phase, setPhase] = useState("loading"); // loading | form | done | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/invite-status?token=${encodeURIComponent(token)}`);
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok || d.status === "invalid") { setError("Cette invitation est introuvable."); setPhase("error"); return; }
        if (d.status === "unknown") { setError("Le service d'invitation n'est pas encore configuré."); setPhase("error"); return; }
        if (d.status === "expired") { setError("Cette invitation a expiré. Demandez-en une nouvelle."); setPhase("error"); return; }
        if (d.status === "activated") { setError("Cette invitation a déjà été activée. Vous pouvez vous connecter."); setPhase("error"); return; }
        setInfo(d);
        setPhase("form");
      } catch (_) {
        if (alive) { setError("Service indisponible. Réessayez plus tard."); setPhase("error"); }
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const submit = async () => {
    if (password.length < 8) { setError("Mot de passe d'au moins 8 caractères."); return; }
    setSubmitting(true); setError("");
    try {
      const r = await fetch("/api/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setPhase("done"); }
      else { setError(d.error || "Échec de l'activation."); }
    } catch (_) {
      setError("Service indisponible. Réessayez plus tard.");
    } finally {
      setSubmitting(false);
    }
  };

  const appUrl = `${window.location.origin}${window.location.pathname}`;
  const card = { width: "100%", maxWidth: 460, background: G5, borderRadius: 16, border: `1px solid ${G3}`, padding: "32px 34px", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" };
  const input = { width: "100%", boxSizing: "border-box", background: G2, border: `1px solid ${G3}`, borderRadius: 9, padding: "12px 14px", color: CREAM, fontSize: 14, outline: "none", fontFamily: "'Inter',sans-serif", marginBottom: 12 };
  const btn = { width: "100%", padding: "13px", borderRadius: 9, border: "none", background: ORANGE, color: "#fff", fontSize: 14, fontWeight: 700, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "'Inter',sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: G, color: CREAM, fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", color: CREAM }}>Sonate</div>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", color: ORANGE, textTransform: "uppercase", marginTop: 2, marginBottom: 24 }}>Accompagnement SEA</div>

        {phase === "loading" && <div style={{ color: MUTED, fontSize: 14 }}>Vérification de l'invitation…</div>}

        {phase === "error" && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Invitation</div>
            <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{error}</div>
            <a href={appUrl} style={{ color: ORANGE, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>→ Ouvrir le simulateur</a>
          </>
        )}

        {phase === "form" && info && (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Activez votre compte</div>
            <div style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
              Invitation pour <strong style={{ color: CREAM }}>{info.email}</strong>
              {info.espace ? <> · espace <strong style={{ color: CREAM }}>{info.espace}</strong></> : null}
              {info.role ? <> · rôle <strong style={{ color: CREAM }}>{info.role}</strong></> : null}
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom (optionnel)" style={input} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} placeholder="Choisissez un mot de passe (8 car. min.)" style={input} />
            {error && <div style={{ color: ORANGE, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button onClick={submit} disabled={submitting} style={btn}>{submitting ? "Activation…" : "Activer mon compte"}</button>
          </>
        )}

        {phase === "done" && (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, color: "#5fb98a" }}>✓ Compte activé</div>
            <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Votre compte est prêt. Vous pouvez accéder au simulateur.</div>
            <a href={appUrl} style={{ ...btn, display: "inline-block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>Ouvrir le simulateur</a>
          </>
        )}
      </div>
    </div>
  );
}
