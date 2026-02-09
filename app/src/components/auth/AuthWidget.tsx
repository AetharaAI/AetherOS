import { useState } from 'react';
import { LogOut, Shield, User, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { getPassportConfig, isPassportConfigured, startPassportLogin, startPassportLogout } from '@/lib/auth/passport';

interface AuthWidgetProps {
  isCollapsed?: boolean;
}

export function AuthWidget({ isCollapsed = false }: AuthWidgetProps) {
  const { user, isAuthenticated, isAnonymous, clearAuth, getIdToken } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { issuerUrl } = getPassportConfig();

  const handleSignIn = async () => {
    if (!isPassportConfigured()) {
      console.error('Passport OIDC config missing. Check VITE_PASSPORT_* env variables.');
      return;
    }

    await startPassportLogin(window.location.pathname === '/logout' ? '/' : window.location.pathname);
  };

  const handleLogout = () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    const idToken = getIdToken() ?? user?.idToken;

    // Clear local session before redirecting to Passport global logout.
    clearAuth();
    startPassportLogout(idToken ?? undefined);
  };

  if (isAnonymous || !isAuthenticated) {
    if (isCollapsed) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-full text-text-secondary hover:bg-carbon-700 hover:text-text-primary"
          onClick={() => void handleSignIn()}
          title="Sign in with Passport"
        >
          <UserCircle className="h-5 w-5" />
        </Button>
      );
    }

    return (
      <Button
        variant="ghost"
        className="w-full justify-start text-text-secondary hover:bg-carbon-700 hover:text-text-primary"
        onClick={() => void handleSignIn()}
      >
        <Shield className="mr-2 h-5 w-5 text-sovereign-500" />
        <div className="flex flex-col items-start">
          <span className="text-sm">Sign in with Passport</span>
          <span className="text-xs text-text-muted">Universal Aether identity</span>
        </div>
      </Button>
    );
  }

  if (isCollapsed) {
    return (
      <Avatar className="mx-auto h-10 w-10">
        <AvatarFallback className="bg-sovereign-500 text-white">
          {user?.name?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-text-primary hover:bg-carbon-700"
        >
          <Avatar className="mr-2 h-8 w-8">
            <AvatarFallback className="bg-sovereign-500 text-sm text-white">
              {user?.name?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start overflow-hidden">
            <span className="truncate text-sm">{user?.name || user?.email}</span>
            <span className="truncate text-xs text-text-muted">Passport authenticated</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[260px] border-carbon-600 bg-carbon-700"
      >
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-text-primary">{user?.name || user?.email}</p>
          <p className="truncate text-xs text-text-muted">{user?.email}</p>
        </div>
        <DropdownMenuSeparator className="bg-carbon-600" />
        <DropdownMenuItem
          className="cursor-pointer text-text-primary hover:bg-carbon-600 focus:bg-carbon-600"
          onClick={() => window.open(`${issuerUrl}/account`, '_blank', 'noopener,noreferrer')}
        >
          <User className="mr-2 h-4 w-4" />
          Passport Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-carbon-600" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-error hover:bg-carbon-600 focus:bg-carbon-600"
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
