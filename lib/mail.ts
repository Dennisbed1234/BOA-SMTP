import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function randHex(n: number) {
  const a = "abcdef0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function extractEmail(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  const angle = s.match(/<([^>]+@[^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  const plain = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (plain) return plain[0].toLowerCase();
  return s.includes("@") ? s.toLowerCase() : "";
}

/** Removes < > and trailing junk so BOA> becomes BOA */
function cleanDisplayName(raw: string, fallback: string): string {
  let s = (raw || "").trim();
  if (!s) return fallback;
  s = s.replace(/[<>"']/g, "");
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[\s:>\-]+|[\s:<>\-]+$/g, "").trim();
  if (!s || s.length > 40) return fallback;
  return s;
}

export function getMailConfig() {
  const user = extractEmail(process.env.SMTP_USER || "");
  const pass = (process.env.SMTP_PASS || "").trim();

  let fromEmail = extractEmail(process.env.MAIL_FROM || "") || user;

  if (user && fromEmail && fromEmail !== user) {
    console.warn(
      `MAIL_FROM (${fromEmail}) differs from SMTP_USER (${user}); using SMTP_USER for From address.`
    );
    fromEmail = user;
  }

  const fromName = cleanDisplayName(
    process.env.MAIL_FROM_NAME || "BOA",
    "BOA"
  );

  const replyTo =
    extractEmail(process.env.MAIL_REPLY_TO || "") || fromEmail || user;

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  // Object form prevents accidental BOA> in the header
  const from =
    fromName && fromEmail
      ? { name: fromName, address: fromEmail }
      : fromEmail || user;

  return { user, pass, fromEmail, fromName, from, replyTo, host, port };
}

export function isMailConfigured() {
  const { user, pass } = getMailConfig();
  return Boolean(user && pass);
}

export function resetTransporter() {
  transporter = null;
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { user, pass, host, port } = getMailConfig();

  if (!user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password) on Vercel."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT !== "0" },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });

  return transporter;
}

export function formatSmtpError(error: unknown): string {
  const e = error as any;
  const raw = String(e?.response || e?.message || e || "SMTP error");
  const code = String(e?.code || e?.responseCode || "");

  if (
    /Invalid login|EAUTH|535|Username and Password not accepted/i.test(raw) ||
    code === "EAUTH"
  ) {
    return (
      "Gmail login failed. Use a 16-character App Password. " +
      "SMTP_USER = full Gmail. SMTP_PASS = App Password."
    );
  }

  if (
    /Daily user sending limit|User-rate limit exceeded|Mail sending limit|421-4\.7\.0|421 4\.7\.0/i.test(
      raw
    )
  ) {
    return "Gmail daily/sending limit hit. Wait a few hours or use Google Workspace.";
  }

  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ESOCKET/i.test(raw)) {
    return `Cannot reach SMTP server (${raw}). Check SMTP_HOST / network.`;
  }

  if (
    /550|553|Sender address rejected|not allowed to send|Invalid From/i.test(
      raw
    )
  ) {
    return (
      "Gmail rejected From. Set MAIL_FROM=email only and MAIL_FROM_NAME=BOA. " +
      raw.slice(0, 200)
    );
  }

  return raw.slice(0, 500);
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function verifyMailConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    if (!isMailConfigured()) {
      return { ok: false, error: "SMTP_USER / SMTP_PASS not set" };
    }
    resetTransporter();
    await getTransporter().verify();
    return { ok: true };
  } catch (e) {
    resetTransporter();
    return { ok: false, error: formatSmtpError(e) };
  }
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  attachments
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}) {
  const cfg = getMailConfig();
  const t = getTransporter();

  const plain =
    (text && text.trim()) ||
    (html ? stripHtml(html) : "") ||
    ".";

  const rich =
    (html && html.trim()) ||
    (text
      ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222">${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")}</div>`
      : undefined);

  let safeSubject = (subject || "Hello").trim();
  if (safeSubject === safeSubject.toUpperCase() && safeSubject.length > 8) {
    safeSubject = safeSubject.charAt(0) + safeSubject.slice(1).toLowerCase();
  }

  const domain = cfg.fromEmail.includes("@")
    ? cfg.fromEmail.split("@")[1].toLowerCase()
    : "gmail.com";

  try {
    const info = await t.sendMail({
      from: cfg.from,
      to,
      replyTo: cfg.replyTo,
      subject: safeSubject.slice(0, 150),
      text: plain,
      html: rich,
      attachments: attachments || [],
      messageId: `<${randHex(16)}.${Date.now()}@${domain}>`,
      date: new Date(),
      encoding: "utf-8",
      priority: "normal",
      headers: {
        "X-Entity-Ref-ID": randHex(12)
      }
    });

    return info;
  } catch (e) {
    if (
      /EAUTH|Invalid login|535/i.test(
        String((e as any)?.message || (e as any)?.code || "")
      )
    ) {
      resetTransporter();
    }
    throw new Error(formatSmtpError(e));
  }
}
