import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-brand-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-brand-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Buildstate | The toolkit for civil construction",
  description:
    "Suite of tools for civil contractors, including digital site sign in, daily diaries, inspection test plans, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900 selection:bg-amber-200 selection:text-amber-950`}
      >
        {children}
      </body>
    </html>
  );
}
