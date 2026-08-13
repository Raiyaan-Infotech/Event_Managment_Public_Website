import { Toaster } from 'sonner';
import './globals.css';

/**
 * Document shell only.
 *
 * Deliberately does NOT fetch anything. Resolving the tenant here would mean
 * calling `headers()`, which marks every route beneath it dynamic and disables
 * the route cache for the whole site. Per-tenant metadata is generated one
 * level down, in s/[host]/[lang]/layout.tsx, where the host is a route param.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
