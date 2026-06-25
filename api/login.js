// POST /api/login — { email, password } → cookie de session.
import { getUserRaw, verifyPassword, recordLogin, dbConfigured } from "./_db.js";
import { createSession, sessionCookie, authConfigured } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });
  if (!authConfigured()) return res.status(500).json({ error: "Authentification non configurée (AUTH_SECRET manquant)." });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPw = process.env.ADMIN_PASSWORD;
  let user = null;

  if (adminEmail && adminPw && email.toLowerCase() === adminEmail.toLowerCase() && password === adminPw) {
    user = { email: adminEmail, name: "Admin", role: "Admin" };
  } else {
    try {
      const u = await getUserRaw(email);
      if (u && verifyPassword(password, u.password_hash)) {
        if (u.role === "Désactivé") return res.status(403).json({ error: "Ce compte est désactivé. Contactez un administrateur." });
        user = { email: u.email, name: u.name, role: u.role || "Lecteur" };
      }
    } catch (_) { /* base indisponible → identifiants refusés */ }
  }

  if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect." });

  // Trace la connexion (sans bloquer le login en cas d'indisponibilité de la base).
  // Sans effet pour l'admin « bootstrap » par variables d'env (pas de ligne en base).
  if (dbConfigured()) {
    try { await recordLogin(user.email, new Date().toISOString()); } catch (_) { /* non bloquant */ }
  }

  const token = createSession({ email: user.email, role: user.role, name: user.name });
  res.setHeader("Set-Cookie", sessionCookie(token));
  return res.status(200).json({ email: user.email, name: user.name, role: user.role });
}
