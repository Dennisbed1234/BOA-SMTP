"use client";

import {
  FormEvent,
  useEffect,
  useState
} from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function CampaignsPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [selected, setSelected] =
    useState<string[]>([]);

  const [subject, setSubject] =
    useState("");

  const [text, setText] =
    useState("");

  const [html, setHtml] =
    useState("");

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const [campaignId, setCampaignId] =
    useState<string | null>(null);

  const [status, setStatus] =
    useState("");

  const [sending, setSending] =
    useState(false);

  useEffect(() => {
    fetch("/api/customers")
      .then((response) => response.json())
      .then((data) =>
        setCustomers(data.customers || [])
      );
  }, []);

  function toggleCustomer(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  }

  function selectAll() {
    setSelected(
      customers.map(
        (customer) => customer.id
      )
    );
  }

  function clearAll() {
    setSelected([]);
  }

  async function createCampaign(
    event: FormEvent
  ) {
    event.preventDefault();

    if (selected.length === 0) {
      setStatus(
        "Select at least one customer."
      );
      return;
    }

    setSending(true);
    setStatus("Creating campaign...");

    const form = new FormData();

    form.append("subject", subject);
    form.append("text", text);
    form.append("html", html);
    form.append(
      "customerIds",
      selected.join(",")
    );

    if (attachment) {
      form.append(
        "attachment",
        attachment
      );
    }

    const response = await fetch(
      "/api/campaigns",
      {
        method: "POST",
        body: form
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setStatus(
        data.error ||
          "Unable to create campaign"
      );

      setSending(false);
      return;
    }

    setCampaignId(data.campaignId);

    setStatus(
      `Campaign created for ${data.totalRecipients} customers.`
    );

    await processCampaign(
      data.campaignId
    );
  }

  async function processCampaign(
    id: string
  ) {
    try {
      const response = await fetch(
        `/api/campaigns/${id}`,
        {
          method: "POST"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to process campaign"
        );
      }

      setStatus(
        `Processed ${data.processed}. ` +
        `Sent: ${data.sent || 0}. ` +
        `Failed: ${data.failed || 0}. ` +
        `Remaining: ${data.remaining}.`
      );

      if (data.remaining > 0) {
        setTimeout(
          () => processCampaign(id),
          1500
        );
      } else {
        setSending(false);
        setStatus(
          "Campaign completed successfully."
        );
      }

    } catch (error) {
      setSending(false);

      setStatus(
        error instanceof Error
          ? error.message
          : "Campaign processing failed"
      );
    }
  }

  return (
    <main className="container">

      <div className="card">

        <h1>
          New Campaign
        </h1>

        <p className="muted">
          Select the customers who should
          receive this message.
        </p>

        <div className="selection-actions">

          <button
            type="button"
            className="button secondary"
            onClick={selectAll}
          >
            Select All
          </button>

          <button
            type="button"
            className="button secondary"
            onClick={clearAll}
          >
            Clear
          </button>

          <strong>
            {selected.length} selected
          </strong>

        </div>

        <div className="customer-selector">

          {customers.map((customer) => (

            <label
              key={customer.id}
              className="customer-select"
            >

              <input
                type="checkbox"
                checked={selected.includes(
                  customer.id
                )}
                onChange={() =>
                  toggleCustomer(
                    customer.id
                  )
                }
              />

              <span>
                <strong>
                  {customer.name}
                </strong>

                <small>
                  {customer.email}
                </small>
              </span>

            </label>

          ))}

        </div>

        <form onSubmit={createCampaign}>

          <label>
            Subject
          </label>

          <input
            value={subject}
            onChange={(e) =>
              setSubject(e.target.value)
            }
            placeholder="Email subject"
            required
          />

          <label>
            Plain-text message
          </label>

          <textarea
            rows={8}
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Plain-text version..."
          />

          <label>
            HTML message
          </label>

          <textarea
            rows={12}
            value={html}
            onChange={(e) =>
              setHtml(e.target.value)
            }
            placeholder="<h1>Hello!</h1><p>Your message...</p>"
          />

          <label>
            Attachment
          </label>

          <input
            type="file"
            onChange={(e) =>
              setAttachment(
                e.target.files?.[0] ||
                  null
              )
            }
          />

          <button
            className="button primary full"
            disabled={
              sending ||
              selected.length === 0
            }
          >
            {sending
              ? "Sending campaign..."
              : "Send Campaign"}
          </button>

        </form>

        {status && (
          <div className="result">
            {status}
          </div>
        )}

        {campaignId && (
          <p className="muted">
            Campaign ID: {campaignId}
          </p>
        )}

      </div>

    </main>
  );
}