import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TallerPro',
  description: 'Aplicación online para taller mecánico'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
