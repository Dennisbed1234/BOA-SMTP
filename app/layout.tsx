import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Mail Tester",
  description: "Email testing and delivery platform"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-inner">

            <Link href="/" className="brand">
              📬 Mail Tester
            </Link>

            <nav>
              <Link href="/inbox">Inbox</Link>
              <Link href="/send">Send</Link>
              <Link href="/otp">OTP</Link>
            </nav>

          </div>
        </header>

        {children}
      </body>
    </html>
  );
}