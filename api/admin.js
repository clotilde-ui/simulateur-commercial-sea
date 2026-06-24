// /api/admin?resource=users|invites|spaces|reports — endpoints admin regroupés
// (le plan Vercel Hobby limite à 12 fonctions serverless).
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers, hashPassword, kvConfigured } from "./_kv.js";
import { requireAdmin, csrfOk } from "./_auth.js";

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  if (!kvConfigured()) return res.status(500).json({ error: "Store non configuré (KV)." });

  const resource = req.query?.resource;
  if (req.method !== "GET" && !csrfOk(req)) return res.status(403).json({ error: "Requête refusée." });

  if (resource === "users") return users(req, res);
  if (resource === "invites") return invites(req, res);
  if (resource === "spaces") return spaces(req, res);
  if (resource === "reports") return reports(req, res);
  return res.status(400).json({ error: "Ressource inconnue." });
}

async function users(req, res) {
  if (req.method === "GET") {
    const emails = await kvSMembers("users:index");
    const list = (await Promise.all(emails.map((e) => kvGet(`user:${e}`)))).filter(Boolean)
      .map((u) => ({ name: u.name, email: u.email, role: u.role, espace: u.espace || "", createdAt: u.createdAt }));
    return res.status(200).json({ users: list });
  }
  if (req.method === "POST") {
    const { name, email, password, role } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Email invalide." });
    if (!password || String(password).length < 8) return res.status(400).json({ error: "Mot de passe d'au moins 8 caractères." });
    if (await kvGet(`user:${email}`)) return res.status(409).json({ error: "Un compte existe déjà pour cet email." });
    const user = { name: (name || "").trim() || email.split("@")[0], email, role: role || "Utilisateur", espace: "", passwordHash: hashPassword(String(password)), createdAt: new Date().toISOString() };
    await kvSet(`user:${email}`, user);
    await kvSAdd("users:index", email);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "PATCH") {
    const { email, role } = req.body || {};
    const u = await kvGet(`user:${email}`);
    if (!u) return res.status(404).json({ error: "Compte introuvable." });
    u.role = role; await kvSet(`user:${email}`, u);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const email = req.query?.email;
    if (!email) return res.status(400).json({ error: "Email requis." });
    await kvDel(`user:${email}`); await kvSRem("users:index", email);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}

async function invites(req, res) {
  if (req.method === "GET") {
    const tokens = await kvSMembers("invites:index");
    const list = (await Promise.all(tokens.map(async (t) => {
      const i = await kvGet(`invite:${t}`);
      return i ? { ...i, token: t } : null;
    }))).filter(Boolean).map((i) => {
      const expired = i.expiresAt && Date.now() > new Date(i.expiresAt).getTime();
      return { token: i.token, email: i.email, espace: i.espace || "", role: i.role || "Lecteur", sentAt: i.sentAt, expiresAt: i.expiresAt, activatedAt: i.activatedAt || null, status: i.activatedAt ? "activated" : expired ? "expired" : "pending" };
    }).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    return res.status(200).json({ invites: list });
  }
  if (req.method === "DELETE") {
    const token = req.query?.token;
    if (!token) return res.status(400).json({ error: "Token requis." });
    await kvDel(`invite:${token}`); await kvSRem("invites:index", token);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}

async function spaces(req, res) {
  if (req.method === "GET") {
    const ids = await kvSMembers("spaces:index");
    const list = (await Promise.all(ids.map((id) => kvGet(`space:${id}`)))).filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json({ spaces: list });
  }
  if (req.method === "POST") {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nom requis." });
    const id = genId();
    const space = { id, name, createdAt: new Date().toISOString(), role: "Propriétaire", members: [] };
    await kvSet(`space:${id}`, space); await kvSAdd("spaces:index", id);
    return res.status(200).json({ ok: true, space });
  }
  if (req.method === "PATCH") {
    const { id, name, members } = req.body || {};
    const s = await kvGet(`space:${id}`);
    if (!s) return res.status(404).json({ error: "Espace introuvable." });
    if (typeof name === "string" && name.trim()) s.name = name.trim();
    if (Array.isArray(members)) s.members = members;
    await kvSet(`space:${id}`, s);
    return res.status(200).json({ ok: true, space: s });
  }
  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id requis." });
    await kvDel(`space:${id}`); await kvSRem("spaces:index", id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}

async function reports(req, res) {
  if (req.method === "GET") {
    const ids = await kvSMembers("reports:index");
    const list = (await Promise.all(ids.map((id) => kvGet(`report:${id}`)))).filter(Boolean).map((r) => {
      const visits = Object.values(r.visits || {});
      const last = visits.length ? visits.reduce((a, b) => (new Date(b.ts) > new Date(a.ts) ? b : a)) : null;
      return { id: r.id, prospect: r.label || "Sans nom", website: r.website || "", espace: r.espace || "—", vues: visits.length, temps: visits.reduce((s, v) => s + (v.duration || 0), 0), derniere: last ? last.ts : null, creation: r.createdAt, state: r.state || null };
    });
    return res.status(200).json({ reports: list });
  }
  if (req.method === "PATCH") {
    const { id, espace } = req.body || {};
    const r = await kvGet(`report:${id}`);
    if (!r) return res.status(404).json({ error: "Rapport introuvable." });
    r.espace = espace || "—"; await kvSet(`report:${id}`, r);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id requis." });
    await kvDel(`report:${id}`); await kvSRem("reports:index", id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Méthode non autorisée." });
}
