import nodemailer from "nodemailer";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM || user;

if (!user || !pass) {
  throw new Error("SMTP credentials are not configured");
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user,
    pass
  }
});

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
  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    attachments
  });
}