import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function PortfolioLoadingSkeleton() {
  return (
    <Card
      className="min-h-[320px] overflow-hidden p-0"
      data-testid="portfolio-loading-skeleton"
      aria-busy="true"
      aria-label="Loading portfolio results"
    >
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      <table className="w-full text-sm">
        <thead className="bg-surface-2">
          <tr>
            {['Address', 'Area', 'Top picks', 'Hit rate', 'Status'].map((h) => (
              <th key={h} className="px-4 py-2 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-3" colSpan={5}>
                <Skeleton className="h-4 w-full max-w-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
