import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { sql } from "@/lib/db";
import { generateOTP, hashOTP } from "@/lib/otp";
import { validEmail } from "@/lib/validation";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!validEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const code = generateOTP();
    const codeHash = hashOTP(code);

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await sql`
      INSERT INTO otp_codes (
        id,
        email,
        code_hash,
        expires_at
      )
      VALUES (
        ${crypto.randomUUID()},
        ${email},
        ${codeHash},
        ${expiresAt.toISOString()}
      )
    `;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
        <h2>Your verification code</h2>

        <p>Use the code below to continue:</p>

        <div style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          padding:20px;
          background:#f3f4f6;
          text-align:center;
          border-radius:10px;
        ">
          ${code}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `;

    await sendMail({
      to: email,
      subject: "Your verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html
    });

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to send OTP" },
      { status: 500 }
    );
  }
}