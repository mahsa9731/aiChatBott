import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "دستیار هوشمند هوش مصنوعی",
  description: "طراحی شده با Next.js و Tailwind",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <html lang="fa" dir="rtl">
      <body className="antialiased bg-zinc-950 text-zinc-50">
        {children}
      </body>
    </html>
  );
}