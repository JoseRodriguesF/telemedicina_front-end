import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { SWRConfig } from 'swr';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://matriarcatelemed.com.br"),
  title: {
    default: "Matriarca Telemedicina - Saúde Online com Especialistas",
    template: "%s | Matriarca Telemedicina"
  },
  icons: {
    icon: "/images/logo_matriarca_icon.svg",
    shortcut: "/images/logo_matriarca_icon.svg",
    apple: "/images/logo_matriarca_icon.svg",
  },
  description: "Matriarca: Acesso imediato a especialistas de alto nível através de uma plataforma segura e intuitiva. Atendimento rápido, seguro e no conforto da sua casa.",
  keywords: ["matriarca", "saúde online", "telemedicina moderna", "consulta online", "médico online", "saúde digital", "atendimento médico"],
  authors: [{ name: "Matriarca Soluções em Saúde" }],
  creator: "Matriarca",
  publisher: "Matriarca",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://matriarcasaude.com.br",
    title: "Matriarca - Soluções em Saúde",
    description: "Plataforma de telemedicina Matriarca para agendamento de consultas online com médicos qualificados.",
    siteName: "Matriarca",
    images: [
      {
        url: "/images/logo_matriarca.png",
        width: 1200,
        height: 630,
        alt: "Matriarca"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Matriarca",
    description: "Consultas médicas online rápidas e seguras com Matriarca.",
    images: ["/images/logo_matriarca.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#007bff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <SWRConfig value={{ 
          refreshInterval: 10000, 
          revalidateOnFocus: true,
          dedupingInterval: 2000
        }}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </SWRConfig>
      </body>
    </html>
  );
}
