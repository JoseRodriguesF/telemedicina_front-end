import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import QueryProvider from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://telemedicina-jj.com.br"),
  title: {
    default: "Telemedicina JJ - Consultas Online com Especialistas",
    template: "%s | Telemedicina JJ"
  },
  description: "Agende consultas online com médicos especialistas. Atendimento rápido, seguro e sem sair de casa. Telemedicina de qualidade para você e sua família.",
  keywords: ["telemedicina", "consulta online", "médico online", "saúde digital", "atendimento médico", "cardiologista online", "clínico geral online"],
  authors: [{ name: "JJ Telemedicina" }],
  creator: "JJ Telemedicina",
  publisher: "JJ Telemedicina",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://telemedicina-jj.com.br",
    title: "Telemedicina JJ - Saúde ao seu alcance",
    description: "Plataforma de telemedicina para agendamento de consultas online com médicos qualificados.",
    siteName: "Telemedicina JJ",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Telemedicina JJ"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Telemedicina JJ",
    description: "Consultas médicas online rápidas e seguras.",
    images: ["/twitter-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#007bff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
