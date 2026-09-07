import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const form = await request.formData();

    const subject = String(
      form.get("subject") || ""
    ).trim();

    const text = String(
      form.get("text") || ""
    ).trim();

    const html = String(
      form.get("html") || ""
    ).trim();

    const customerIdsRaw = String(
      form.get("customerIds") || ""
    );

    const customerIds = customerIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const attachment =
      form.get("attachment");

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

    if (customerIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Select at least one customer"
        },
        { status: 400 }
      );
    }

    const customers = await sql`
      SELECT id, email
      FROM customers
      WHERE id = ANY(${customerIds}::uuid[])
    `;

    if (customers.length === 0) {
      return NextResponse.json(
        {
          error: "No valid customers found"
        },
        { status: 400 }
      );
    }

    let attachmentData: Buffer | null = null;
    let attachmentFilename: string | null = null;
    let attachmentContentType: string | null = null;

    if (
      attachment &&
      attachment instanceof File &&
      attachment.size > 0
    ) {
      attachmentData = Buffer.from(
        await attachment.arrayBuffer()
      );

      attachmentFilename = attachment.name;

      attachmentContentType =
        attachment.type || null;
    }

    const campaignId =
      crypto.randomUUID();

    await sql`
      INSERT INTO campaigns (
        id,
        subject,
        text_body,
        html_body,
        attachment_data,
        attachment_filename,
        attachment_content_type,
        status,
        total_recipients
      )
      VALUES (
        ${campaignId},
        ${subject},
        ${text || null},
        ${html || null},
        ${attachmentData},
        ${attachmentFilename},
        ${attachmentContentType},
        'pending',
        ${customers.length}
      )
    `;

    for (const customer of customers) {
      await sql`
        INSERT INTO campaign_recipients (
          id,
          campaign_id,
          customer_id,
          email
        )
        VALUES (
          ${crypto.randomUUID()},
          ${campaignId},
          ${customer.id},
          ${customer.email}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      campaignId,
      totalRecipients: customers.length
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Unable to create campaign"
      },
      { status: 500 }
    );
  }
}