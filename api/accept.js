// POST /api/accept — le destinataire active son invitation : création du compte
// (mot de passe haché) et passage de l'invitation à « activé ».
import { kvGet, kvSet, kvConfigured, hashPassword } from "./_kv.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });
  if (!kvConfigured()) return res.status(500).json({ error: "Backend non configuré (store KV manquant)." });

  const { token, name, password } = req.body || {};
  if (!token) return res.status(400).json({ error: "Token requis." });
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "Mot de passe d'au moins 8 caractères requis." });
  }

  let inv;
  try { inv = await kvGet(`invite:${token}`); }
  catch (e) { return res.status(500).json({ error: String(e) }); }

  if (!inv) return res.status(404).json({ error: "Invitation introuvable ou expirée." });
  if (inv.activatedAt) return res.status(409).json({ error: "Cette invitation a déjà été activée." });
  if (inv.expiresAt && Date.now() > new Date(inv.expiresAt).getTime()) {
    return res.status(410).json({ error: "Cette invitation a expiré." });
  }

  const existing = await kvGet(`user:${inv.email}`);
  if (existing) return res.status(409).json({ error: "Un compte existe déjà pour cet email." });

  const user = {
    name: (name || "").trim() || inv.email.split("@")[0],
    email: inv.email,
    role: inv.role || "Lecteur",
    espace: inv.espace || "",
    passwordHash: hashPassword(String(password)),
    createdAt: new Date().toISOString(),
  };

  try {
    await kvSet(`user:${inv.email}`, user);
    inv.activatedAt = new Date().toISOString();
    await kvSet(`invite:${token}`, inv);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }

  return res.status(200).json({ ok: true, name: user.name, email: user.email, espace: user.espace });
}
