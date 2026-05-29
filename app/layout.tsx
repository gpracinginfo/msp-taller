import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MSP',
  description: 'Panel de control MSP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
