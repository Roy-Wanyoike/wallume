import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SwRegister } from "@/components/wallpaper/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Wallume — Interactive Live Wallpapers for Phone & Desktop",
  description:
    "330+ living wallpapers that react to your touch. Tune palette, motion and glow in real time, then export a crisp PNG or looping live video sized exactly for your phone, tablet or desktop. Free, no account needed.",
  keywords: [
    "wallpaper",
    "live wallpaper",
    "interactive wallpaper",
    "mobile wallpaper",
    "desktop wallpaper",
    "canvas art",
    "phone background",
    "generative art",
  ],
  authors: [{ name: "Wallume" }],
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wallume",
  },
  openGraph: {
    title: "Wallume — Interactive Live Wallpapers",
    description: "Living scenes you can tune and take with you. Free & watermark-free.",
    siteName: "Wallume",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
