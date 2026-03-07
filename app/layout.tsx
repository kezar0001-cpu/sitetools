import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Buildstate | The toolkit for civil construction",
  description: "Suite of tools for civil contractors, including digital site sign in, daily diaries, inspection test plans, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased text-slate-900 selection:bg-amber-200 selection:text-amber-950`}>
        {children}
      </body>
    </html>
  );
}
