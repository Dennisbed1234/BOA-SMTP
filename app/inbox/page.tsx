"use client";

import { useEffect, useState } from "react";

type Email = {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  text_body: string | null;
  html_body: string | null;
  message_type: string;
  created_at: string;
};

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] =
    useState<Email | null>(null);

  async function load() {
    const response = await fetch(
      "/api/emails",
      {
        cache: "no-store"
      }
    );

    const data = await response.json();

    setEmails(data.emails || []);
  }

  useEffect(() => {
    load();

    const interval = setInterval(
      load,
      5000
    );

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <main className="container">

      <div className="inbox-layout">

        <section className="card inbox-list">

          <div className="section-title">

            <div>
              <h1>Inbox</h1>

              <span>
                {emails.length} messages
              </span>
            </div>

            <button
              className="refresh"
              onClick={load}
            >
              ↻
            </button>

          </div>

          {emails.length === 0 ? (

            <div className="empty">

              <div>📭</div>

              <h2>
                No emails yet
              </h2>

              <p>
                Send an email to see it here.
              </p>

            </div>

          ) : (

            emails.map((email) => (

              <button
                key={email.id}
                className={`email-row ${
                  selected?.id === email.id
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelected(email)
                }
              >

                <strong>
                  {email.subject}
                </strong>

                <span>
                  To: {email.recipient}
                </span>

                <small>
                  {new Date(
                    email.created_at
                  ).toLocaleString()}
                </small>

              </button>

            ))

          )}

        </section>

        <section className="card email-viewer">

          {selected ? (

            <>
              <div className="email-header">

                <h2>
                  {selected.subject}
                </h2>

                <p>
                  <strong>
                    From:
                  </strong>{" "}
                  {selected.sender}
                </p>

                <p>
                  <strong>
                    To:
                  </strong>{" "}
                  {selected.recipient}
                </p>

                <p>
                  <strong>
                    Date:
                  </strong>{" "}
                  {new Date(
                    selected.created_at
                  ).toLocaleString()}
                </p>

              </div>

              <hr />

              {selected.html_body ? (

                <iframe
                  className="html-preview"
                  srcDoc={selected.html_body}
                  sandbox=""
                  title="Email preview"
                />

              ) : (

                <pre className="text-preview">
                  {selected.text_body}
                </pre>

              )}

            </>

          ) : (

            <div className="empty">

              <div>✉️</div>

              <h2>
                Select an email
              </h2>

              <p>
                Choose an email from the inbox.
              </p>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}