import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const customers = await sql`
      SELECT
        id,
        name,
        email,
        created_at
      FROM customers
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      customers
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to load customers" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        {
          error: "Name and email are required"
        },
        { status: 400 }
      );
    }

    const customer = await sql`
      INSERT INTO customers (
        id,
        name,
        email
      )
      VALUES (
        ${crypto.randomUUID()},
        ${name},
        ${email}
      )
      RETURNING id, name, email, created_at
    `;

    return NextResponse.json({
      customer: customer[0]
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Unable to create customer"
      },
      { status: 500 }
    );
  }
}