CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT,
  html_body TEXT,
  message_type TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emails_created_at_idx
ON emails(created_at DESC);


CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_email_idx
ON otp_codes(email);


CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_created_at_idx
ON customers(created_at DESC);


CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  text_body TEXT,
  html_body TEXT,
  attachment_data BYTEA,
  attachment_filename TEXT,
  attachment_content_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL
    REFERENCES campaigns(id)
    ON DELETE CASCADE,

  customer_id UUID
    REFERENCES customers(id)
    ON DELETE SET NULL,

  email TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',

  error_message TEXT,

  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_recipients_status_idx
ON campaign_recipients(campaign_id, status);

CREATE INDEX IF NOT EXISTS campaign_recipients_email_idx
ON campaign_recipients(email);