import AIAssistant from '@/components/AIAssistant';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AquaSense UJ — Water Quality Monitor',
  description: 'Real-time water quality monitoring across University of Johannesburg campuses. SANS 241:2015 compliant.',
  keywords: 'water quality, UJ, University of Johannesburg, SANS 241, IoT, monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-bg0 text-t0 min-h-screen">{children}<AIAssistant /></body>
    </html>
  );
}
