import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { sql } from "@/lib/db";
import { cleanText, validEmail } from "@/lib/validation";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const recipients = form
      .getAll("to")
      .map((value) => cleanText(value))
      .flatMap((value) => value.split(","))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const subject = cleanText(form.get("subject"));
    const text = cleanText(form.get("text"));
    const html = cleanText(form.get("html"));

    const uniqueRecipients = [
      ...new Set(recipients)
    ];

    if (uniqueRecipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 }
      );
    }

    const invalidRecipients =
      uniqueRecipients.filter(
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
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const attachments = [];

    for (const entry of form.getAll("attachments")) {
      if (entry instanceof File) {
        const buffer = Buffer.from(
          await entry.arrayBuffer()
        );

        attachments.push({
          filename: entry.name,
          content: buffer,
          contentType: entry.type || undefined
        });
      }
    }

    const results: {
      email: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }[] = [];

    /*
     * Send individually instead of putting all recipients
     * into one SMTP message.
     *
     * This preserves individual delivery and logging.
     */
    for (const to of uniqueRecipients) {
      try {
        const info = await sendMail({
          to,
          subject,
          text,
          html,
          attachments
        });

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
            ${process.env.MAIL_FROM || process.env.SMTP_USER || ""},
            ${to},
            ${subject},
            ${text},
            ${html},
            'email'
          )
        `;

        results.push({
          email: to,
          success: true,
          messageId: info.messageId
        });

      } catch (error) {
        console.error(
          `Failed to send to ${to}:`,
          error
        );

        results.push({
          email: to,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to send email"
        });
      }
    }

    const sent = results.filter(
      (result) => result.success
    ).length;

    const failed = results.filter(
      (result) => !result.success
    ).length;

    return NextResponse.json({
      success: failed === 0,
      total: uniqueRecipients.length,
      sent,
      failed,
      results
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to send email" },
      { status: 500 }
    );
  }
}