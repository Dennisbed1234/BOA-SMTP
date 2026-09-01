import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const emails = await sql`
      SELECT
        id,
        sender,
        recipient,
        subject,
        text_body,
        html_body,
        message_type,
        created_at
      FROM emails
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      emails
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to load emails" },
      { status: 500 }
    );
  }
}