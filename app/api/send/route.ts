import { NextRequest, NextResponse } from "next/server";
import { sendMail, isMailConfigured, getMailConfig, formatSmtpError } from "@/lib/mail";
import { sql } from "@/lib/db";
import { cleanText, validEmail } from "@/lib/validation";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const configured = isMailConfigured();
  const cfg = getMailConfig();
  return NextResponse.json({
    configured,
    user: cfg.user || null,
    from: cfg.fromEmail || null,
    fromName: cfg.fromName || null,
    host: cfg.host
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isMailConfigured()) {
      return NextResponse.json(
        {
          error:
            "SMTP not configured. On Vercel set SMTP_USER (full Gmail), SMTP_PASS (App Password), MAIL_FROM (same Gmail), MAIL_FROM_NAME=BOA."
        },
        { status: 400 }
      );
    }

    const form = await request.formData();

    const recipients = form
      .getAll("to")
      .map((value) => cleanText(value))
      .flatMap((value) => value.split(/[,;\s]+/))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const subject = cleanText(form.get("subject"));
    const text = cleanText(form.get("text"));
    const html = cleanText(form.get("html"));

    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 }
      );
    }

    const invalidRecipients = uniqueRecipients.filter(
      (email) => !validEmail(email)
    );

    if (invalidRecipients.length > 0) {
      return NextResponse.json(
        {
          error: "One or more recipient emails are invalid",
          invalidRecipients
        },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!text && !html) {
      return NextResponse.json(
        { error: "Message content is required (plain text and/or HTML)" },
        { status: 400 }
      );
    }

    const attachments: {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[] = [];

    for (const entry of form.getAll("attachments")) {
      if (entry instanceof File) {
        if (entry.size > 4 * 1024 * 1024) {
          return NextResponse.json(
            { error: `Attachment ${entry.name} is over 4MB` },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(await entry.arrayBuffer());
        attachments.push({
          filename: entry.name,
          content: buffer,
          contentType: entry.type || undefined
        });
      }
    }

    const cfg = getMailConfig();
    const results: {
      email: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }[] = [];

    for (const to of uniqueRecipients) {
      try {
        const info = await sendMail({
          to,
          subject,
          text: text || undefined,
          html: html || undefined,
          attachments
        });

        try {
          await sql`
            INSERT INTO emails (
              id,
              sender,
              recipient,
              subject,
              text_body,
              html_body,
              message_type
            )
            VALUES (
              ${crypto.randomUUID()},
              ${cfg.fromEmail || cfg.user || ""},
              ${to},
              ${subject},
              ${text || null},
              ${html || null},
              'email'
            )
          `;
        } catch (dbErr) {
          console.warn("email log insert failed:", dbErr);
        }

        results.push({
          email: to,
          success: true,
          messageId: info.messageId
        });
      } catch (error) {
        console.error(`Failed to send to ${to}:`, error);
        results.push({
          email: to,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : formatSmtpError(error)
        });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      total: uniqueRecipients.length,
      sent,
      failed,
      from: cfg.from,
      results,
      hint:
        failed > 0
          ? "Check results[].error. Usual fix: Gmail App Password + MAIL_FROM must equal SMTP_USER."
          : undefined
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? formatSmtpError(error)
            : "Unable to send email"
      },
      { status: 500 }
    );
  }
}
