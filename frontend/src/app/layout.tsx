import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "OnboardFlow — AI-Powered Codebase Onboarding Agent",
  description: "Understand any GitHub codebase instantly. Generates visual architecture flowcharts via Mermaid.js and answers contributor questions using a local SQLite RAG search with content-hash caching.",
  keywords: [
    "OnboardFlow",
    "AI Codebase Onboarding",
    "GitHub Agent",
    "RAG",
    "LangGraph",
    "LangChain",
    "Mermaid.js flowcharts",
    "SQLite vector search",
    "developer tools"
  ],
  authors: [{ name: "Anuj Rajput", url: "https://github.com/rajputanuj31" }],
  openGraph: {
    title: "OnboardFlow — AI-Powered Codebase Onboarding Agent",
    description: "Recursively ingests GitHub repositories, builds system architecture maps, and streams developer onboarding Q&A.",
    url: "https://github.com/rajputanuj31/OnboardFlow",
    siteName: "OnboardFlow",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OnboardFlow — AI-Powered Codebase Onboarding Agent",
    description: "Understand any GitHub codebase instantly with interactive diagrams and agentic Q&A.",
    creator: "@_rajputanuj",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
