import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { LegalFooter } from "@/components/LegalFooter";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ClashLeader",
  description: "Panel para líderes de clanes de Clash of Clans: estadísticas, expulsiones y ascensos.",
};

export const viewport: Viewport = {
  themeColor: "#0e1318",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-bg text-text antialiased">
        <div className="flex-1">{children}</div>
        <LegalFooter />
      </body>
    </html>
  );
}
