import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalSidebar } from "@/components/conditional-sidebar";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { MonthArchiveProvider } from "@/components/monthly-updates/month-sidebar";
import { getArchiveBounds } from "@/lib/monthly-updates-months";
import { Providers } from "@/components/providers";
import { site } from "@/lib/site";
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
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  icons: {
    icon: [
      { url: "/icon.svg?v=mono", type: "image/svg+xml", sizes: "any", media: "(prefers-color-scheme: light)" },
      { url: "/physlib-icon-dark.svg?v=mono", type: "image/svg+xml", sizes: "any", media: "(prefers-color-scheme: dark)" },
    ],
  },
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.name,
    images: [{ url: "/images/PhysLibLogo.jpeg", width: 1200, height: 1200 }],
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <Providers>
          <Navbar />
          {/* pt-16 offsets the fixed navbar on inner pages; home page handles its own top spacing */}
          <div className="mx-auto flex w-full flex-1 max-w-7xl has-[.hero-gradient]:max-w-none">
            <MonthArchiveProvider bounds={await getArchiveBounds()}>
              <ConditionalSidebar />
            </MonthArchiveProvider>
            <main className="min-w-0 flex-1 pt-14">{children}</main>
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
