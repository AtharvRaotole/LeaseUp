export function brandMonogram(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function brandTint(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hues = [210, 160, 40, 280, 20, 120];
  const h = hues[Math.abs(hash) % hues.length];
  return `hsl(${h} 35% 88%)`;
}
