import { Toaster } from 'sonner';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { AppRouter } from '@/app/router/AppRouter';

/** App root: global providers + router + toaster. */
export default function App() {
  return (
    <I18nProvider>
      <QueryProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryProvider>
    </I18nProvider>
  );
}
