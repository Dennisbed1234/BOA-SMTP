import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { processCampaign } from "@/lib/queue";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const campaigns = await sql`
      SELECT
        id,
        subject,
        status,
        total_recipients,
        sent_count,
        failed_count,
        created_at,
        completed_at
      FROM campaigns
      WHERE id = ${id}
      LIMIT 1
    `;

    if (campaigns.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const stats = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'pending'
        )::int AS pending,

        COUNT(*) FILTER (
          WHERE status = 'sent'
        )::int AS sent,

        COUNT(*) FILTER (
          WHERE status = 'failed'
        )::int AS failed
      FROM campaign_recipients
      WHERE campaign_id = ${id}
    `;

    return NextResponse.json({
      campaign: campaigns[0],
      stats: stats[0]
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to load campaign" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const result =
      await processCampaign(id);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process campaign"
      },
      { status: 500 }
    );
  }
}