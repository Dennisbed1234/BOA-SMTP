import Link from "next/link";

export default function Home() {
  return (
    <main className="container">

      <section className="hero">

        <div className="hero-icon">
          📬
        </div>

        <h1>
          Mail Tester
        </h1>

        <p>
          Send HTML emails, OTP verification codes,
          attachments and test messages from one place.
        </p>

        <div className="actions">

          <Link
            href="/send"
            className="button primary"
          >
            Send Email
          </Link>

          <Link
            href="/otp"
            className="button secondary"
          >
            Send OTP
          </Link>

          <Link
            href="/inbox"
            className="button secondary"
          >
            Open Inbox
          </Link>

        </div>

      </section>

    </main>
  );
}