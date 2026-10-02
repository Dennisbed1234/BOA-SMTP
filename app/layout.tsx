import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "CAPITAL ONE BLAST",
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
              📬 Capital One Blast
            </Link>

            <nav>
  <Link href="/inbox">Inbox</Link>
  <Link href="/send">Send</Link>
  <Link href="/otp">OTP</Link>
  <Link href="/customers">Customers</Link>
  <Link href="/campaigns">Campaigns</Link>
</nav>

          </div>
        </header>

        {children}
      </body>
    </html>
  );
}