// Helper partagé (non routé : préfixe « _ ») — accès au store Vercel KV / Upstash
// Redis via son API REST, et hachage de mot de passe via crypto natif.
//
// Variables d'environnement (fournies automatiquement par un store Vercel KV,
// ou par Upstash) :
//   KV_REST_API_URL / KV_REST_API_TOKEN   (Vercel KV)
//   ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvConfigured() {
  return Boolean(REST_URL && REST_TOKEN);
}

async function cmd(args) {
  if (!kvConfigured()) throw new Error("KV non configuré (variables KV_REST_API_URL / KV_REST_API_TOKEN manquantes).");
  const r = await fetch(REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`KV ${r.status} : ${await r.text().catch(() => "")}`);
  const data = await r.json();
  return data.result;
}

export async function kvGet(key) {
  const v = await cmd(["GET", key]);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return v; }
}

export async function kvSet(key, value, ttlSeconds) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  return ttlSeconds ? cmd(["SET", key, v, "EX", String(ttlSeconds)]) : cmd(["SET", key, v]);
}

export async function kvDel(key) {
  return cmd(["DEL", key]);
}

// ─── Mots de passe ───────────────────────────────────────────
export function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const h = scryptSync(pw, salt, 64);
  const hb = Buffer.from(hash, "hex");
  return h.length === hb.length && timingSafeEqual(h, hb);
}
