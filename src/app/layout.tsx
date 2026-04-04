import type { Metadata } from "next";
import { Roboto, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { AuthUiStoreProvider } from "@/stores/auth-ui-store";
import { SavedResearchHydrator } from "@/components/saved-research-hydrator";
import { env } from "@/lib/env";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteTitle = "MUJ General";
const siteDescription =
  "MUJ General is the research repository and journal platform for Manipal University Jaipur, built to publish, organize, and discover academic work across departments and journals.";
const thumbnailUrl =
  "https://res.cloudinary.com/dyetf2h9n/image/upload/v1775342146/Untitled_design_18_tvyrou.png";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  applicationName: siteTitle,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    "MUJ General",
    "Manipal University Jaipur",
    "MUJ research",
    "research repository",
    "academic journals",
    "university publications",
    "research papers",
    "journal articles",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle,
    locale: "en_IN",
    images: [
      {
        url: thumbnailUrl,
        width: 1920,
        height: 1080,
        alt: "MUJ General website preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [thumbnailUrl],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthUiStoreProvider>
          <SavedResearchHydrator />
          {children}
        </AuthUiStoreProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
