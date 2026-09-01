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

    form.append("to", to);
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
          data.error || "Failed to send email"
        );
      }

      setResult("Email sent successfully.");

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

          <label>Recipient</label>

          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            required
          />

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