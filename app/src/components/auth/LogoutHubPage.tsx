import { useEffect } from 'react';
import { ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { getPassportConfig, startPassportLogin } from '@/lib/auth/passport';

const ecosystemCards = [
  {
    title: 'AETHERPRO.tech',
    subtitle: 'Core platform',
    href: 'https://aetherpro.tech',
  },
  {
    title: 'AETHERPRO.us',
    subtitle: 'Public brand site',
    href: 'https://aetherpro.us',
  },
  {
    title: 'Fabric MCP',
    subtitle: 'Agent skill registry',
    href: 'https://mcpfabric.space',
  },
  {
    title: 'AgentForge',
    subtitle: 'Agent marketplace',
    href: 'https://aetheragentforge.org',
  },
  {
    title: 'Percy Desktop',
    subtitle: 'Local control plane',
    href: 'https://aetherpro.tech',
  },
  {
    title: 'Triad Memory',
    subtitle: 'Persistent intelligence layer',
    href: 'https://aetherpro.tech',
  },
];

export function LogoutHubPage() {
  const { clearAuth } = useAuthStore();
  const { appHomeUrl } = getPassportConfig();

  useEffect(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <div className="min-h-screen w-full bg-carbon-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:px-8">
        <header className="rounded-2xl border border-carbon-600 bg-gradient-to-br from-carbon-800/90 via-carbon-800/75 to-carbon-700/60 p-8">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sovereign-500">Aether Identity Hub</p>
          <h1 className="text-3xl font-semibold text-text-primary md:text-4xl">
            You are signed out of Aether.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-text-secondary md:text-base">
            Your Passport works across the entire Aether ecosystem.
          </p>
        </header>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Your Aether network</h2>
              <p className="text-sm text-text-muted">Your Passport works here.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystemCards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group rounded-xl border border-carbon-600 bg-carbon-800/70 p-4 transition-colors hover:border-sovereign-500/50 hover:bg-carbon-700/70"
              >
                <h3 className="text-base font-medium text-text-primary">{card.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{card.subtitle}</p>
                <p className="mt-3 text-xs text-sovereign-500">Your Passport works here.</p>
                <div className="mt-3 flex items-center text-xs text-text-secondary group-hover:text-text-primary">
                  Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <Button
            className="bg-sovereign-500 text-white hover:bg-sovereign-600"
            onClick={() => void startPassportLogin('/')}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Log back in
          </Button>
          <Button
            variant="outline"
            className="border-carbon-600 text-text-primary hover:bg-carbon-700"
            onClick={() => window.location.assign(appHomeUrl)}
          >
            Return to AetherPro
          </Button>
        </section>

        <footer className="border-t border-carbon-700 pt-6 text-xs text-text-muted">
          Aether Passport is your universal identity for the Aether ecosystem.
        </footer>
      </div>
    </div>
  );
}

