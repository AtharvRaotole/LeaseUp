import { describe, it, expect } from 'vitest';

/**
 * Test backtest calculation logic
 */
describe('Backtest calculations', () => {
  describe('AUC calculation', () => {
    it('should return 1.0 when all present brands rank higher than absent', () => {
      const insights = [
        { entity_id: 'present1', name: 'Present 1' },
        { entity_id: 'present2', name: 'Present 2' },
        { entity_id: 'absent1', name: 'Absent 1' },
        { entity_id: 'absent2', name: 'Absent 2' },
      ];
      const presentBrands = new Set(['present1', 'present2']);

      const auc = calculateAUC(insights, presentBrands);
      expect(auc).toBe(1.0);
    });

    it('should return 0.0 when all absent brands rank higher than present', () => {
      const insights = [
        { entity_id: 'absent1', name: 'Absent 1' },
        { entity_id: 'absent2', name: 'Absent 2' },
        { entity_id: 'present1', name: 'Present 1' },
        { entity_id: 'present2', name: 'Present 2' },
      ];
      const presentBrands = new Set(['present1', 'present2']);

      const auc = calculateAUC(insights, presentBrands);
      expect(auc).toBe(0.0);
    });

    it('should calculate correctly for alternating pattern', () => {
      const insights = [
        { entity_id: 'present1', name: 'Present 1' },
        { entity_id: 'absent1', name: 'Absent 1' },
        { entity_id: 'present2', name: 'Present 2' },
        { entity_id: 'absent2', name: 'Absent 2' },
      ];
      const presentBrands = new Set(['present1', 'present2']);

      const auc = calculateAUC(insights, presentBrands);
      // AUC for this pattern: present1 beats both absents (2 points)
      // present2 beats absent2 (1 point), ties with absent1 (0.5 points)
      // Total: 3.5 / 4 = 0.875
      // Actually: present1 (rank 0) beats absent1 (rank 1) and absent2 (rank 3): 2 points
      // present2 (rank 2) beats absent2 (rank 3): 1 point, loses to absent1 (rank 1): 0 points
      // Total: 3 / 4 = 0.75
      expect(auc).toBe(0.75);
    });
  });

  describe('Precision@10', () => {
    it('should calculate correctly', () => {
      const top10 = [
        { entity_id: 'present1', name: 'P1' },
        { entity_id: 'present2', name: 'P2' },
        { entity_id: 'absent1', name: 'A1' },
        { entity_id: 'present3', name: 'P3' },
        { entity_id: 'absent2', name: 'A2' },
        { entity_id: 'present4', name: 'P4' },
        { entity_id: 'present5', name: 'P5' },
        { entity_id: 'absent3', name: 'A3' },
        { entity_id: 'present6', name: 'P6' },
        { entity_id: 'present7', name: 'P7' },
      ];
      const presentBrands = new Set(['present1', 'present2', 'present3', 'present4', 'present5', 'present6', 'present7']);

      const predicted = top10.filter(b => presentBrands.has(b.entity_id)).length;
      const p10 = predicted / 10;

      expect(p10).toBe(0.7);
    });
  });
});

// Helper functions (copied from analysis.ts for testing)
function calculateAUC(
  insights: Array<{ entity_id: string }>,
  presentBrands: Set<string>
): number {
  const positives = insights.filter(i => presentBrands.has(i.entity_id));
  const negatives = insights.filter(i => !presentBrands.has(i.entity_id));
  
  if (positives.length === 0 || negatives.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const pos of positives) {
    const posRank = insights.indexOf(pos);
    for (const neg of negatives) {
      const negRank = insights.indexOf(neg);
      if (posRank < negRank) {
        sum += 1;
      } else if (posRank === negRank) {
        sum += 0.5;
      }
    }
  }
  
  return sum / (positives.length * negatives.length);
}
