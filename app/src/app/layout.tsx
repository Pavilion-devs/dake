import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dake - Confidential Prediction Markets",
  description: "The first confidential prediction market on Solana. Your bets are encrypted — nobody knows your position until you win.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${dmSans.variable} bg-[#0f0f11] text-slate-300 text-lg antialiased selection:bg-yellow-400 selection:text-black relative overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
