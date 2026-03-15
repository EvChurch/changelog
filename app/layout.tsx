import "./globals.css"

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Providers } from "./providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Changelog",
  description: "Service feedback for teams",
}

const themeInitScript = `(function () {
  try {
    var storedTheme = window.localStorage.getItem("theme");
    var resolvedTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : (window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
          ? "dark"
          : "light";
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          suppressHydrationWarning
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
