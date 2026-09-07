"use client";

import { FormEvent, useEffect, useState } from "react";

export default function SendPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [smtp, setSmtp] = useState<{
    configured?: boolean;
    user?: string | null;
    from?: string | null;
    fromName?: string | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/send")
      .then((r) => r.json())
      .then(setSmtp)
      .catch(() => setSmtp({ configured: false }));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setSending(true);
    setResult("");
    setErrors([]);

    const form = new FormData();

    const recipients = to
      .split(/[\s,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    const uniqueRecipients = [...new Set(recipients)];

    uniqueRecipients.forEach((email) => {
      form.append("to", email);
    });

    form.append("subject", subject);
    form.append("text", text);
    form.append("html", html);

    if (files) {
      Array.from(files).forEach((file) => {
        form.append("attachments", file);
      });
    }

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        body: form
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setResult(
        `Sent: ${data.sent} | Failed: ${data.failed} | Total: ${data.total}` +
          (data.from ? ` | From: ${data.from}` : "")
      );

      const failMsgs = (data.results || [])
        .filter((r: any) => !r.success)
        .map((r: any) => `${r.email}: ${r.error || "failed"}`);

      setErrors(failMsgs);

      if (data.failed === 0) {
        setTo("");
        setSubject("");
        setText("");
        setHtml("");
        setFiles(null);
      }
    } catch (error) {
      setResult(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }

    setSending(false);
  }

  return (
    <main className="container narrow">
      <div className="card">
        <h1>Send Email</h1>

        {smtp && (
          <div
            className="result"
            style={{
              marginBottom: 16,
              opacity: 0.95,
              borderColor: smtp.configured ? undefined : "#f87171"
            }}
          >
            {smtp.configured ? (
              <>
                SMTP ready as <strong>{smtp.fromName || "BOA"}</strong>{" "}
                &lt;{smtp.from || smtp.user}&gt;
              </>
            ) : (
              <>
                SMTP not configured. Set SMTP_USER, SMTP_PASS, MAIL_FROM on
                Vercel.
              </>
            )}
          </div>
        )}

        <form onSubmit={submit}>
          <label>Recipients</label>

          <textarea
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={
              "recipient1@example.com\n" +
              "recipient2@example.com\n" +
              "recipient3@example.com"
            }
            rows={6}
            required
          />

          <small className="muted">
            Enter multiple email addresses separated by commas, spaces,
            semicolons, or new lines.
          </small>

          <label>Subject</label>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your subject"
            required
          />

          <label>Plain text</label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Plain text message"
            rows={6}
          />

          <label>HTML message</label>

          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<h1>Hello</h1><p>Your HTML message...</p>"
            rows={10}
          />

          <label>Attachments</label>

          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />

          <button className="button primary full" disabled={sending}>
            {sending ? "Sending..." : "Send Email"}
          </button>
        </form>

        {result && <div className="result">{result}</div>}

        {errors.length > 0 && (
          <div className="result" style={{ marginTop: 12 }}>
            <strong>Errors</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
