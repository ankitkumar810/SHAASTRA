import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHAASTRA | Disaster response, together",
  description: "A real-time disaster management platform prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
