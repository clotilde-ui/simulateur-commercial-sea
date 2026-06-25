// GET /api/me — utilisateur de la session courante.
import { getUser } from "./_auth.js";
import { getUserRaw, dbConfigured } from "./_db.js";

export default async function handler(req, res) {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Non authentifié." });

  // Re-validation contre la base : la session seule dure 7 jours, donc on vérifie
  // l'état courant du compte. Un compte « Désactivé » (ou supprimé) est ainsi
  // déconnecté dès le prochain chargement, sans attendre l'expiration du cookie.
  if (dbConfigured()) {
    try {
      const row = await getUserRaw(u.email);
      if (row) {
        if (row.role === "Désactivé") return res.status(403).json({ error: "Compte désactivé." });
        return res.status(200).json({ email: row.email, name: row.name, role: row.role });
      }
      // Aucune ligne en base : autorisé uniquement si c'est l'admin « bootstrap » (env).
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!(adminEmail && u.email.toLowerCase() === adminEmail.toLowerCase())) {
        return res.status(401).json({ error: "Compte introuvable." });
      }
    } catch (_) { /* base indisponible → on retombe sur la session ci-dessous */ }
  }

  return res.status(200).json({ email: u.email, name: u.name, role: u.role });
}
