// /api/admin?resource=users|invites|spaces|reports — endpoints admin regroupés
// (le plan Vercel Hobby limite à 12 fonctions serverless).
import {
  dbConfigured, hashPassword,
  getUserRaw, createUser, updateUserRole, removeUser, listUsers,
  removeInvite, listInvites,
  getSpace, createSpace, updateSpace, removeSpace, listSpaces,
  updateReportEspace, removeReport, listReports,
} from "./_db.js";
import { requireAdmin, csrfOk } from "./_auth.js";

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  if (!dbConfigured()) return res.status(500).json({ error: "Base non configurée (Turso)." });

  const resource = req.query?.resource;
  if (req.method !== "GET" && !csrfOk(req)) return res.status(403).json({ error: "Requête refusée." });

  try {
    if (resource === "users") return await users(req, res);
    if (resource === "invites") return await invites(req, res);
    if (resource === "spaces") return await spaces(req, res);
    if (resource === "reports") return await reports(req, res);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
  return res.status(400).json({ error: "Ressource inconnue." });
}

async function users(req, res) {
  if (req.method === "GET") return res.status(200).json({ users: await listUsers() });
  if (req.method === "POST") {
    const { name, email, password, role } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Email invalide." });
    if (!password || String(password).length < 8) return res.status(400).json({ error: "Mot de passe d'au moins 8 caractères." });
    if (await getUserRaw(email)) return res.status(409).json({ error: "Un compte existe déjà pour cet email." });
    await createUser({ name: (name || "").trim() || email.split("@")[0], email, role: role || "Éditeur", espace: "", passwordHash: hashPassword(String(password)), createdAt: new Date().toISOString() });
    return res.status(200).json({ ok: true });
  }
  if (req.method === "PATCH") {
    const { email, role } = req.body || {};
    if (!(await getUserRaw(email))) return res.status(404).json({ error: "Compte introuvable." });
    await updateUserRole(email, role);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const email = req.query?.email;
    if (!email) return res.status(400).json({ error: "Email requis." });
    await removeUser(email);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}

async function invites(req, res) {
  if (req.method === "GET") return res.status(200).json({ invites: await listInvites() });
  if (req.method === "DELETE") {
    const token = req.query?.token;
    if (!token) return res.status(400).json({ error: "Token requis." });
    await removeInvite(token);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}

async function spaces(req, res) {
  if (req.method === "GET") return res.status(200).json({ spaces: await listSpaces() });
  if (req.method === "POST") {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nom requis." });
    const space = { id: genId(), name, createdAt: new Date().toISOString(), role: "Propriétaire", members: [] };
    await createSpace(space);
    return res.status(200).json({ ok: true, space });
  }
  if (req.method === "PATCH") {
    const { id, name, members } = req.body || {};
    if (!(await getSpace(id))) return res.status(404).json({ error: "Espace introuvable." });
    const space = await updateSpace(id, { name, members });
    return res.status(200).json({ ok: true, space });
  }
  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id requis." });
    await removeSpace(id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}

async function reports(req, res) {
  if (req.method === "GET") return res.status(200).json({ reports: await listReports() });
  if (req.method === "PATCH") {
    const { id, espace } = req.body || {};
    await updateReportEspace(id, espace);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id requis." });
    await removeReport(id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}
