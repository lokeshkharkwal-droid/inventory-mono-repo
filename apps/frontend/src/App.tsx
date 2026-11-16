import { Toaster } from 'sonner';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { AppRouter } from '@/app/router/AppRouter';
import { GlobalLoadingOverlay } from '@/components/GlobalLoadingOverlay';

/** App root: global providers + router + toaster + global API loader. */
export default function App() {
  return (
    <I18nProvider>
      <QueryProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster richColors position="top-right" />
          {/* Branded loader shown whenever any API request is in flight. */}
          <GlobalLoadingOverlay />
        </AuthProvider>
      </QueryProvider>
    </I18nProvider>
  );
}
