import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: {
    default: "intelligence",
    template: "%s | intelligence",
  },
  description:
    "intelligence is the user-facing Company Brain frontend for querying and growing the indexed knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="appBackdrop" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
