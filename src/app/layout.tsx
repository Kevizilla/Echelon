import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import AppLayout from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'Echelon — Personal Productivity XP',
  description: 'Clean, minimalist productivity tracking with custom XP rules, work sessions, and analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        <AppProvider>
          <AppLayout>{children}</AppLayout>
        </AppProvider>
      </body>
    </html>
  );
}
