"use client";

import { FormEvent, useState } from "react";

export default function SendPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    setSending(true);
    setResult("");

    const form = new FormData();

    /*
     * Allow multiple recipients.
     *
     * You can enter:
     *
     * person1@gmail.com
     * person2@gmail.com
     * person3@gmail.com
     *
     * or:
     *
     * person1@gmail.com, person2@gmail.com, person3@gmail.com
     */

    const recipients = to
      .split(/[\s,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    const uniqueRecipients = [
      ...new Set(recipients)
    ];

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
      const response = await fetch(
        "/api/send",
        {
          method: "POST",
          body: form
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to send email"
        );
      }

      setResult(
        `Sent: ${data.sent} | Failed: ${data.failed} | Total: ${data.total}`
      );

      setTo("");
      setSubject("");
      setText("");
      setHtml("");
      setFiles(null);

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

        <h1>Send Email</h1>

        <form onSubmit={submit}>

          <label>Recipients</label>

          <textarea
            value={to}
            onChange={(e) =>
              setTo(e.target.value)
            }
            placeholder={
              "recipient1@example.com\n" +
              "recipient2@example.com\n" +
              "recipient3@example.com"
            }
            rows={6}
            required
          />

          <small className="muted">
            Enter multiple email addresses separated
            by commas, spaces, semicolons, or new lines.
          </small>

          <label>Subject</label>

          <input
            value={subject}
            onChange={(e) =>
              setSubject(e.target.value)
            }
            placeholder="Your subject"
            required
          />

          <label>Plain text</label>

          <textarea
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Plain text message"
            rows={6}
          />

          <label>HTML message</label>

          <textarea
            value={html}
            onChange={(e) =>
              setHtml(e.target.value)
            }
            placeholder="<h1>Hello</h1><p>Your HTML message...</p>"
            rows={10}
          />

          <label>Attachments</label>

          <input
            type="file"
            multiple
            onChange={(e) =>
              setFiles(e.target.files)
            }
          />

          <button
            className="button primary full"
            disabled={sending}
          >
            {sending
              ? "Sending..."
              : "Send Email"}
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