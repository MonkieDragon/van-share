import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import AuthNav from "@/components/Auth/AuthNav";
import HeaderNavLinks from "@/components/Layout/HeaderNavLinks";
import GlobalJourneySearchBar from "@/components/Layout/GlobalJourneySearchBar";
import "./styles/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Van Share",
  description: "Share private van transfers between Puerto Princesa and El Nido",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-white font-sans text-gray-900 antialiased`}
      >
        <header className="bg-blue-600 p-4 text-white shadow-md">
          <div className="mx-auto flex max-w-[1140px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight hover:underline">
              Van Share
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              <HeaderNavLinks />
              <AuthNav />
            </nav>
          </div>
        </header>
        <Suspense fallback={null}>
          <GlobalJourneySearchBar />
        </Suspense>
        <main className="mx-auto w-full max-w-[1140px] flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
