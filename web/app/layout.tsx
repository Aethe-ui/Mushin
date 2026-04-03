import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech",
});

export const metadata: Metadata = {
  title: "Mushin — Focus Operating System",
  description:
    "The Focus Operating System for the AI Era. Timed deep work, quiet AI, calm collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} ${shareTechMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
