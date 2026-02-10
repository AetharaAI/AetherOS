import { useEffect } from 'react';
import { ArrowRight, LogIn, Globe, Shield, Zap, Database, Cpu, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { getPassportConfig, startPassportLogin } from '@/lib/auth/passport';

const ecosystemCards = [
  {
    title: 'AETHERPRO.tech',
    subtitle: 'Core Intelligence Interface',
    description: 'Universal operations and neural chat interface.',
    href: 'https://aetherpro.tech',
    icon: Layout,
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    title: 'AETHERPRO.us',
    subtitle: 'Strategic Presence',
    description: 'Corporate and sovereign alignment site.',
    href: 'https://aetherpro.us',
    icon: Globe,
    color: 'from-purple-500/20 to-indigo-500/20',
  },
  {
    title: 'Fabric MCP',
    subtitle: 'Neural Skill Registry',
    description: 'Global Model Context Protocol skill layer.',
    href: 'https://mcpfabric.space',
    icon: Zap,
    color: 'from-amber-500/20 to-orange-500/20',
  },
  {
    title: 'AgentForge',
    subtitle: 'Autonomous Marketplace',
    description: 'Deploy and trade sovereign agent primitives.',
    href: 'https://aetheragentforge.org',
    icon: Cpu,
    color: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    title: 'Percy Desktop',
    subtitle: 'Local Control Plane',
    description: 'Headless agent runtime and local gateway.',
    href: 'https://aetherpro.tech',
    icon: Shield,
    color: 'from-rose-500/20 to-red-500/20',
  },
  {
    title: 'Triad Memory',
    subtitle: 'Cognitive Substrate',
    description: 'Persistent RAG and semantic vector memory.',
    href: 'https://aetherpro.tech',
    icon: Database,
    color: 'from-cyan-500/20 to-blue-500/20',
  },
];

export function LogoutHubPage() {
  const { clearAuth } = useAuthStore();
  const { appHomeUrl } = getPassportConfig();

  useEffect(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white selection:bg-sovereign-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sovereign-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:px-12 md:py-24">
        {/* Header Section */}
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sovereign-500/30 bg-sovereign-500/5 backdrop-blur-md">
            <Shield className="w-3.5 h-3.5 text-sovereign-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-sovereign-400">Sovereign OIDC Stack</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Safe Passage. <br />
              <span className="text-sovereign-400">Session Terminated.</span>
            </h1>
            <p className="max-w-2xl text-lg text-white/50 leading-relaxed font-light">
              You have been securely signed out. But your journey doesn't end here.
              The <span className="text-white/80 font-medium">Aether Identity Hub</span> ensures your Passport remains
              the universal key to our entire neural ecosystem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Button
              className="h-12 px-8 bg-sovereign-600 text-white hover:bg-sovereign-500 transition-all duration-300 shadow-lg shadow-sovereign-600/20"
              onClick={() => void startPassportLogin('/')}
            >
              <LogIn className="mr-2 h-4.5 w-4.5" />
              Re-engage Session
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              onClick={() => window.location.assign(appHomeUrl)}
            >
              Return Home
            </Button>
          </div>
        </header>

        {/* Ecosystem Grid */}
        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">The Aether Network</h2>
            <p className="text-sm text-white/40">Your Passport is active and accepted across these strategic nodes.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystemCards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-500 hover:border-sovereign-500/30 hover:bg-white/[0.04] scroll-mt-20"
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-sovereign-400/30 transition-colors">
                      <card.icon className="w-5 h-5 text-white/70 group-hover:text-sovereign-400 transition-colors" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-sovereign-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs font-medium text-sovereign-500/80 uppercase tracking-wider mb-2">
                      {card.subtitle}
                    </p>
                    <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">
                      {card.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Footer info */}
        <footer className="mt-12 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-xs text-white/30 max-w-xs">
              Powered by Passport IAM. Your sovereign identity is protected by end-to-end cryptographic verification.
            </p>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/20 font-medium">
            © 2026 AetherPro Technologies
          </div>
        </footer>
      </div>
    </div>
  );
}

