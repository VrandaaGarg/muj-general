import type { Metadata } from "next";
import { Roboto, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { AuthUiStoreProvider } from "@/stores/auth-ui-store";
import { SavedResearchHydrator } from "@/components/saved-research-hydrator";

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

export const metadata: Metadata = {
  title: "MUJ General",
  description: "Research repository and academic discovery platform for MUJ.",
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
