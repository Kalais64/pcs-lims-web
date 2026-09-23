import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppProviders } from "@/components/providers";
import { parseSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PCS LIMS",
  description: "Sistem informasi laboratorium lingkungan PCS Laboratory",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const initialUser = parseSessionCookie(jar.get(SESSION_COOKIE)?.value);

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f4f8fb] font-sans text-[#183042]">
        <AppProviders initialUser={initialUser}>{children}</AppProviders>
      </body>
    </html>
  );
}
