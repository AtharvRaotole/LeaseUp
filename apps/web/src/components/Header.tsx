import { useQuery } from '@tanstack/react-query';

export function Header() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('health');
      return res.json() as Promise<{ mode: 'live' | 'demo' }>;
    },
    staleTime: 60_000,
  });

  return (
    <header className="border-b border-surface-border bg-surface/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">LeaseUp</p>
          <p className="text-xs text-zinc-500">Qloo Agentic Hackathon 2026</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span className="px-2 py-1 rounded-full border border-surface-border">
            {data?.mode === 'live' ? 'Live' : 'Demo'}
          </span>
          <a href="https://github.com/AtharvRaotole/LeaseUp" className="hover:text-white">
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
