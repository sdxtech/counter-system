import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Counter System",
  description: "Role-based canteen menu counter system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
