import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";
import { ThemeBoot } from "@/components/shell/ThemeBoot";
import GlobalNav from "@/components/shell/GlobalNav";
import Footer from "@/components/shell/Footer";

export const metadata: Metadata = {
  title: "G-Ink Studio — Write, connect, publish",
  description: "A creative writing studio with AI co-writing, story mapping, and a reader community.",
};

// Adapt to the device width (phones, tablets, desktop) instead of rendering at a
// fake desktop width and zooming out. viewport-fit=cover lets the UI extend under
// notches; max scale is left default so users can still pinch-zoom (accessibility).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-dir="ember" data-mode="dark" suppressHydrationWarning>
      <head>
        <ThemeBoot />
      </head>
      <body>
        <Providers>
          <GlobalNav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
