import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BookMyShot Dashboard',
  description: 'Premium luxury dashboard for BookMyShot wedding creators',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
