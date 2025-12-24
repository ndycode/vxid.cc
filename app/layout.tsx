import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransitionProvider } from "@/components/transition-provider";

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: "vxid.cc",
  description: "Transfer files securely between devices with a simple 6-digit code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <body className={`${jetbrainsMono.className} antialiased relative min-h-screen`}>
        <div className="fixed inset-0 z-0 bg-background"></div>

        {/* Global Theme Toggle */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        <div className="relative z-10 min-h-screen">
          <TransitionProvider>
            {children}
          </TransitionProvider>
        </div>

        {/* Global GitHub Link */}
        <a
          href="https://github.com/ndycode"
          target="_blank"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/40 hover:text-primary transition-colors z-50"
        >
          github.com/ndycode
        </a>
      </body>
    </html>
  );
}
