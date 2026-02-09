import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { handlePassportCallback, startPassportLogin } from '@/lib/auth/passport';

export function AuthCallbackPage() {
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const completeLogin = async () => {
      try {
        const { user, returnTo } = await handlePassportCallback();
        if (cancelled) {
          return;
        }

        setUser(user);
        window.location.replace(returnTo || '/');
      } catch (callbackError) {
        if (cancelled) {
          return;
        }

        const message = callbackError instanceof Error
          ? callbackError.message
          : 'Unable to finish Passport sign-in';
        setError(message);
      }
    };

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-carbon-black p-4">
      <div className="w-full max-w-md rounded-xl border border-carbon-600 bg-carbon-800/80 p-6 shadow-lg">
        {error ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Passport Sign-In Failed</h1>
            </div>
            <p className="text-sm text-text-secondary">{error}</p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-sovereign-500 text-white hover:bg-sovereign-600"
                onClick={() => void startPassportLogin('/')}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-carbon-600 text-text-primary hover:bg-carbon-700"
                onClick={() => window.location.replace('/')}
              >
                Back to App
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <div className="mx-auto w-fit rounded-full border border-sovereign-500/30 bg-sovereign-500/15 p-3">
              <Loader2 className="h-6 w-6 animate-spin text-sovereign-500" />
            </div>
            <h1 className="text-lg font-semibold text-text-primary">Completing Passport Sign-In</h1>
            <p className="text-sm text-text-secondary">
              Finalizing your secure session with Aether Passport.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

