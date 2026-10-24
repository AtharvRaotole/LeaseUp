import { vi } from 'vitest';

export function installWorkersCacheApiStub() {
  const store = new Map<string, Response>();
  vi.stubGlobal('caches', {
    default: {
      match: async (req: Request | string) => {
        const url = typeof req === 'string' ? req : req.url;
        return store.get(url) ?? undefined;
      },
      put: async (req: Request | string, res: Response) => {
        const url = typeof req === 'string' ? req : req.url;
        store.set(url, res);
      },
    },
  });
  return store;
}

export function createCountingKvNamespace() {
  const gets: string[] = [];
  const puts: string[] = [];
  const CACHE = {
    get: vi.fn(async (key: string) => {
      gets.push(key);
      return null;
    }),
    put: vi.fn(async (key: string) => {
      puts.push(key);
    }),
  } as unknown as KVNamespace;
  return { CACHE, gets, puts };
}

export function assertKvWithinBudget(
  label: string,
  budget: { gets: number; puts: number },
  gets: string[],
  puts: string[]
) {
  if (gets.length !== budget.gets || puts.length !== budget.puts) {
    throw new Error(
      `${label}: expected KV gets=${budget.gets} puts=${budget.puts}, got gets=${gets.length} puts=${puts.length}`
    );
  }
}
