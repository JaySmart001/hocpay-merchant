import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hocpay Merchant",
  description: "Make every transaction rewarding.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* neutral page surface */}
      <body className="bg-[#F3F6FB] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
