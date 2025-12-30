import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// SAFE IMPORT: Goes up one level to src, then into components
import { ThemeProvider } from "../components/ThemeProvider"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Studify",
  description: "Focus, Plan, Achieve",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Studify",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} transition-colors duration-500 ease-in-out bg-[#FDFBF7] dark:bg-[#18181B]`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}