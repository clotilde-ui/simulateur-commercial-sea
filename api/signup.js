// POST /api/signup — auto-inscription d'un compte (rôle « Utilisateur »), puis
// connexion automatique. Public.
//
// Restriction optionnelle : SIGNUP_ALLOWED_DOMAINS (liste de domaines séparés
// par des virgules, ex. "sonate.group,wedig.fr"). Si vide → inscription ouverte.
import { kvGet, kvSet, kvSAdd, kvConfigured, hashPassword } from "./_kv.js";
import { createSession, sessionCookie, authConfigured } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });
  if (!authConfigured() || !kvConfigured()) {
    return res.status(500).json({ error: "Service non configuré (AUTH_SECRET / store KV requis)." });
  }

  const { name, email, password } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "Mot de passe d'au moins 8 caractères." });
  }

  const allowed = (process.env.SIGNUP_ALLOWED_DOMAINS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length) {
    const domain = email.split("@")[1].toLowerCase();
    if (!allowed.includes(domain)) {
      return res.status(403).json({ error: "L'inscription est réservée à certaines adresses email." });
    }
  }

  if (await kvGet(`user:${email}`)) {
    return res.status(409).json({ error: "Un compte existe déjà pour cet email." });
  }

  const user = {
    name: (name || "").trim() || email.split("@")[0],
    email, role: "Utilisateur", espace: "",
    passwordHash: hashPassword(String(password)), createdAt: new Date().toISOString(),
  };
  await kvSet(`user:${email}`, user);
  await kvSAdd("users:index", email);

  const token = createSession({ email: user.email, role: user.role, name: user.name });
  res.setHeader("Set-Cookie", sessionCookie(token));
  return res.status(200).json({ email: user.email, name: user.name, role: user.role });
}
