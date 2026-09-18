import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Devanagari } from "next/font/google";
import Link from "next/link";
import { LogoMark } from "@/components/icons";
import "./globals.css";

// Manrope: the deliberate type choice for this product - a geometric
// sans with a bit more warmth than Inter, sized for a study/reading
// context. Noto Sans Devanagari matches its weight range so Hindi output
// doesn't drop to a mismatched fallback font.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PadhAI · ExamSaathi",
  description:
    "Upload any textbook page or notes and get a simple Hindi/English explanation, practice questions, and a revision tip in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f4c5c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${notoDevanagari.variable}`}>
      <body className="font-sans">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LogoMark className="h-5 w-5" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[1.05rem] font-bold tracking-tight text-foreground">
                  PadhAI
                </span>
                <span className="text-xs font-medium text-muted">ExamSaathi</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-semibold text-muted">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 transition hover:bg-primary/5 hover:text-primary"
              >
                Home
              </Link>
              <Link
                href="/history"
                className="rounded-lg px-3 py-1.5 transition hover:bg-primary/5 hover:text-primary"
              >
                History
              </Link>
            </nav>
          </header>
          <main className="flex-1 px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
