"use client";

import { FormEvent, useState } from "react";

export default function OTPPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    setSending(true);
    setResult("");

    try {
      const response = await fetch(
        "/api/otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to send OTP"
        );
      }

      setResult(
        "OTP sent successfully."
      );

    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }

    setSending(false);
  }

  return (
    <main className="container narrow">

      <div className="card">

        <h1>Send OTP</h1>

        <p className="muted">
          Generate and send a six-digit verification
          code.
        </p>

        <form onSubmit={submit}>

          <label>Email address</label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="user@example.com"
            required
          />

          <button
            className="button primary full"
            disabled={sending}
          >
            {sending
              ? "Sending..."
              : "Send Verification Code"}
          </button>

        </form>

        {result && (
          <div className="result">
            {result}
          </div>
        )}

      </div>

    </main>
  );
}