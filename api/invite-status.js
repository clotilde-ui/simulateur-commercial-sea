// GET /api/invite-status?token=… — état d'une invitation (par token).
// Accessible par toute personne détenant le token (logique « magic link »).
import { kvGet, kvConfigured } from "./_kv.js";

export default async function handler(req, res) {
  const token = req.query?.token;
  if (!token) return res.status(400).json({ error: "Token requis." });
  if (!kvConfigured()) return res.status(200).json({ status: "unknown" });

  let inv;
  try { inv = await kvGet(`invite:${token}`); }
  catch (e) { return res.status(500).json({ error: String(e) }); }

  if (!inv) return res.status(404).json({ status: "invalid" });

  const expired = inv.expiresAt && Date.now() > new Date(inv.expiresAt).getTime();
  const status = inv.activatedAt ? "activated" : expired ? "expired" : "pending";
  return res.status(200).json({
    status,
    email: inv.email,
    espace: inv.espace || "",
    role: inv.role || "Lecteur",
    activatedAt: inv.activatedAt || null,
    expiresAt: inv.expiresAt || null,
  });
}
