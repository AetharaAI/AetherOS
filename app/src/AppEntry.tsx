import App from './App';
import { AuthCallbackPage } from '@/components/auth/AuthCallbackPage';
import { LogoutHubPage } from '@/components/auth/LogoutHubPage';

function normalizePath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.length > 0 ? normalized : '/';
}

export function AppEntry() {
  const pathname = normalizePath(window.location.pathname);

  if (pathname === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  if (pathname === '/logout') {
    return <LogoutHubPage />;
  }

  return <App />;
}

