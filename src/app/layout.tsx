import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppProviders } from "@/components/providers";
import { sessionFromUser } from "@/lib/auth/profile";
import { parseSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";
import { getRuntimeMode } from "@/lib/config/runtime";
import { createServerSupabase } from "@/lib/supabase/server";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = getRuntimeMode();
  let initialUser = null;

  if (mode === "fixtures") {
    const jar = await cookies();
    initialUser = parseSessionCookie(jar.get(SESSION_COOKIE)?.value);
  } else if (mode === "live") {
    const supabase = await createServerSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user) initialUser = await sessionFromUser(supabase, data.user);
    }
  }

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
