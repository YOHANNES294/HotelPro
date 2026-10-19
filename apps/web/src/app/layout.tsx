import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { LanguageProvider } from '../context/language-context';

export const metadata = {
  title: 'HotelPro — Enterprise Hotel & Restaurant Management',
  description: 'Multi-tenant cloud platform for hotels, restaurants, front-desk, POS, and kitchen operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
