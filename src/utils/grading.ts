export interface ScoreBreakdown {
  report?: number | string;
  attendanceScore?: number | string;
  lab?: number | string;
  midterm?: number | string;
  quiz?: number | string;
}

export function sanitizeScore(val: number | string | null | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

export function computeTotalScore(breakdown: ScoreBreakdown): number {
  const rep = sanitizeScore(breakdown.report);
  const att = sanitizeScore(breakdown.attendanceScore);
  const lab = sanitizeScore(breakdown.lab);
  const mid = sanitizeScore(breakdown.midterm);
  const quiz = sanitizeScore(breakdown.quiz);
  return rep + att + lab + mid + quiz;
}

export function getArabicGradeTitle(total: number): string {
  if (total >= 90) return 'امتياز';
  if (total >= 80) return 'جيد جداً';
  if (total >= 70) return 'جيد';
  if (total >= 60) return 'متوسط';
  if (total >= 50) return 'مقبول';
  return 'راسب';
}

export function isEligibleForHonors(total: number): boolean {
  return total >= 85;
}
