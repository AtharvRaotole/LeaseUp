import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AnalysisRequest } from '@leaseup/contracts';

const DEMO_CHIPS = [
  { label: 'Wicker Park', address: '1574 N Milwaukee Ave, Chicago, IL 60622' },
  { label: 'Boulder', address: '1125 Pearl St, Boulder, CO 80302' },
  { label: 'Sevierville', address: '125 Collier Dr, Sevierville, TN 37862' },
];

interface HeroSearchProps {
  onSubmit: (request: AnalysisRequest) => void;
  isLoading: boolean;
}

export function HeroSearch({ onSubmit, isLoading }: HeroSearchProps) {
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState('');

  const submit = (addr: string) => {
    const trimmed = addr.trim();
    if (!trimmed) return;
    onSubmit({
      address: trimmed,
      radius,
      categoryTags: category.trim() ? [category.trim()] : undefined,
    });
  };

  return (
    <div className="max-w-3xl">
      <motion.h1
        className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Fill my vacancy
      </motion.h1>
      <p className="text-zinc-400 text-lg mb-8 max-w-2xl">
        Drop a storefront address. LeaseUp agents locate the site, read neighborhood taste with Qloo,
        prove the signal with real stores, and surface who is missing — with evidence.
      </p>

      <form
        className="glass rounded-2xl p-5 space-y-4 shadow-glow"
        onSubmit={(e) => {
          e.preventDefault();
          submit(address);
        }}
      >
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">Storefront address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 1574 N Milwaukee Ave, Chicago, IL"
            className="mt-1 w-full rounded-lg bg-black/40 border border-surface-border px-4 py-3 focus:outline-none focus:border-accent"
            disabled={isLoading}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">Category filter (optional)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Qloo tag slug"
              className="mt-1 w-full rounded-lg bg-black/40 border border-surface-border px-4 py-2 text-sm"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">Radius {radius} km</label>
            <input
              type="range"
              min={1}
              max={20}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-3 w-full"
              disabled={isLoading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !address.trim()}
          className="w-full py-3 rounded-xl bg-accent font-semibold hover:bg-accent-muted disabled:opacity-50"
        >
          {isLoading ? 'Agent running…' : 'Run tenant agent'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mt-4">
        {DEMO_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setAddress(chip.address);
              submit(chip.address);
            }}
            className="text-sm px-3 py-1.5 rounded-full border border-surface-border text-zinc-300 hover:border-accent"
          >
            {chip.label} · instant demo
          </button>
        ))}
      </div>
    </div>
  );
}
