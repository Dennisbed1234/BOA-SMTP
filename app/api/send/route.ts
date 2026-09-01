import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { sql } from "@/lib/db";
import { cleanText, validEmail } from "@/lib/validation";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const to = cleanText(form.get("to"));
    const subject = cleanText(form.get("subject"));
    const text = cleanText(form.get("text"));
    const html = cleanText(form.get("html"));

    if (!validEmail(to)) {
      return NextResponse.json(
        { error: "Invalid recipient email" },
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

    return NextResponse.json({
      success: true,
      messageId: info.messageId
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to send email" },
      { status: 500 }
    );
  }
}