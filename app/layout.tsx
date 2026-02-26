import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NeoGeo Web Arcade',
  description: 'Browser-based Neo Geo Emulator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
