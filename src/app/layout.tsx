import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "from the heart",
  description: "Send friends bespoke, beautiful postcards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased h-full`}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1">
            {children}
          </div>

          {/* Footer */}
          <footer className="text-center py-6 bg-white flex-shrink-0" style={{ fontFamily: "'Instrument Serif', serif" }}>
            <p className="text-base md:text-lg text-black">
              built with love by t9nzin
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
