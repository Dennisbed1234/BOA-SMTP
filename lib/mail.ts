import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function randHex(n: number) {
  const a = "abcdef0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export function getMailConfig() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  // Prefer MAIL_FROM, but fall back to SMTP_USER (must match Gmail account)
  const fromEmail = (process.env.MAIL_FROM || user).trim();
  const fromName = (process.env.MAIL_FROM_NAME || "BOA").replace(/["\\]/g, "").trim();
  const replyTo = (process.env.MAIL_REPLY_TO || fromEmail).trim();
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  const from =
    fromName && fromEmail ? `"${fromName}" <${fromEmail}>` : fromEmail;

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

  // Explicit host/port is more reliable than service:"gmail" on serverless
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
  const code = e?.code || e?.responseCode || "";

  if (/Invalid login|EAUTH|535|Username and Password not accepted/i.test(raw) || code === "EAUTH") {
    return (
      "Gmail login failed. Use a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords). " +
      "SMTP_USER must be the full Gmail address. SMTP_PASS must be the App Password (spaces optional)."
    );
  }

  if (/Daily user sending limit|rate|421|450/i.test(raw)) {
    return "Gmail sending limit or rate limit hit. Wait and try a smaller batch.";
  }

  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ESOCKET/i.test(raw)) {
    return `Cannot reach SMTP server (${raw}). Check network / SMTP_HOST.`;
  }

  if (/550|553|Sender address rejected|not allowed to send/i.test(raw)) {
    return (
      "Gmail rejected the From address. MAIL_FROM must be the same as SMTP_USER " +
      "(or a Send mail as alias configured in that Gmail account). " +
      raw.slice(0, 180)
    );
  }

  return raw.slice(0, 400);
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

export async function verifyMailConnection(): Promise<{ ok: boolean; error?: string }> {
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

  // Always provide both parts when possible (helps inbox placement)
  let plain =
    (text && text.trim()) ||
    (html ? stripHtml(html) : "") ||
    ".";

  let rich =
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
    if (/EAUTH|Invalid login|535/i.test(String((e as any)?.message || (e as any)?.code || ""))) {
      resetTransporter();
    }
    throw new Error(formatSmtpError(e));
  }
}
