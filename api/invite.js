// Fonction serverless Vercel : envoie une invitation par email via Brevo.
// La clé API Brevo n'est JAMAIS exposée au navigateur — elle est lue ici
// depuis les variables d'environnement Vercel.
//
// Variables d'environnement à définir dans Vercel (Settings → Environment Variables) :
//   BREVO_API_KEY      – clé API Brevo (v3)
//   BREVO_SENDER_EMAIL – email expéditeur (doit être un expéditeur vérifié dans Brevo)
//   BREVO_SENDER_NAME  – nom expéditeur (optionnel, défaut « Sonate »)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Sonate";
  if (!apiKey || !senderEmail) {
    return res.status(500).json({ error: "Brevo non configuré (BREVO_API_KEY / BREVO_SENDER_EMAIL manquants côté serveur)." });
  }

  const { email, espace, role, link, expiresAt } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const espaceTxt = espace ? ` à l'espace « ${espace} »` : "";
  const roleTxt = role ? ` (rôle : ${role})` : "";
  const url = typeof link === "string" ? link : "";
  let expireTxt = "";
  if (expiresAt) {
    try {
      expireTxt = `Cette invitation expire le ${new Date(expiresAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}.`;
    } catch (_) { /* ignore */ }
  }

  const cta = url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 22px"><tr><td style="border-radius:8px;background:#e8571a"><a href="${url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">Accéder au simulateur</a></td></tr></table>
       <p style="margin:0 0 18px;font-size:13px;color:#4a6a5a;word-break:break-all">Ou copiez ce lien dans votre navigateur :<br><a href="${url}" style="color:#e8571a">${url}</a></p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f5f0e8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1e3328">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3ddd0">
        <tr><td style="background:#1a2e25;padding:24px 32px">
          <div style="font-size:24px;font-weight:800;color:#f5f0e8;letter-spacing:-0.02em">Sonate</div>
          <div style="font-size:10px;letter-spacing:0.18em;color:#e8571a;text-transform:uppercase;margin-top:3px">Accompagnement SEA</div>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:20px;color:#1a2e25">Vous êtes invité${espaceTxt}</h1>
          <p style="margin:0 0 10px;font-size:15px;line-height:1.6">Bonjour,</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6">Vous avez été invité à rejoindre le simulateur commercial Sonate${espaceTxt}${roleTxt}.</p>
          ${cta}
          ${expireTxt ? `<p style="margin:0;font-size:13px;color:#8a9e98">${expireTxt}</p>` : ""}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eee;font-size:12px;color:#8a9e98">— L'équipe Sonate · Cet email vous a été envoyé suite à une invitation. Si vous n'êtes pas concerné, ignorez-le.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;

  const text = `Invitation Sonate\n\nVous êtes invité${espaceTxt}${roleTxt} sur le simulateur commercial Sonate.\n${url ? `\nAccéder : ${url}\n` : ""}${expireTxt ? `\n${expireTxt}\n` : ""}\n— L'équipe Sonate`;

  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email }],
        subject: `Invitation${espace ? ` · ${espace}` : ""} — Sonate`,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(502).json({ error: `Erreur Brevo (${r.status}). ${detail}`.trim() });
    }

    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: true, messageId: data.messageId ?? null });
  } catch (e) {
    return res.status(500).json({ error: `Échec de l'envoi : ${String(e)}` });
  }
}
