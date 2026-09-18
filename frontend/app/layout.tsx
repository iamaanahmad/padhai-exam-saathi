import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PadhAI · ExamSaathi",
  description:
    "Upload any textbook page or notes and get a simple Hindi/English explanation, practice questions, and a revision tip in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-lg flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Link href="/" className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-brand-700">PadhAI</span>
              <span className="text-xs font-medium text-slate-400">ExamSaathi</span>
            </Link>
            <nav className="flex gap-4 text-sm font-semibold text-slate-600">
              <Link href="/" className="hover:text-brand-600">
                Home
              </Link>
              <Link href="/history" className="hover:text-brand-600">
                History
              </Link>
            </nav>
          </header>
          <main className="flex-1 px-4 py-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
