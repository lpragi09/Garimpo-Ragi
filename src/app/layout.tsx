import type { Metadata } from "next";
import { Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Títulos grandes e apertados (visual "2026").
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
// Só a itálica, pra uma palavra de destaque aqui e ali.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Garimpo",
  description: "Encontre negócios sem site e ofereça seu trabalho.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${grotesk.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="grao flex min-h-full flex-col pb-28 font-sans md:pb-0">
        <Navbar />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
