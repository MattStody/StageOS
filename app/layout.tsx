import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StageOps — Theatre General Management",
  description: "Command center for theatre general managers and producers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-stone-50">{children}</body>
    </html>
  );
}
