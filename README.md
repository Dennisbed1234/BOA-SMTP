Wells Fargo
# Mail Tester

A lightweight email testing and delivery dashboard.

## Features

- Gmail SMTP delivery
- HTML email
- Plain text email
- File attachments
- Six-digit OTP generation
- Persistent PostgreSQL email records
- Inbox interface
- Vercel deployment

## Environment variables

DATABASE_URL=your_neon_database_url

SMTP_USER=your_gmail_address

SMTP_PASS=your_google_app_password

MAIL_FROM=your_gmail_address

## Database

Run:

sql/schema.sql

against your Neon PostgreSQL database.

## Development

Install dependencies:

npm install

Run:

npm run dev