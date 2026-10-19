import type { GradeRecord, Quiz, QuizSubmission } from '../types.ts';
import { computeTotalScore, getArabicGradeTitle, isEligibleForHonors } from './grading.ts';

export interface GradeSimulationInput {
  report: number;
  attendanceScore: number;
  lab: number;
  midterm: number;
  quiz: number;
}

export interface GradeSimulationResult {
  clamped: GradeSimulationInput;
  total: number;
  gradeTitle: string;
  isHonors: boolean;
  isPassing: boolean;
  nextTierTitle: string | null;
  pointsToNextTier: number;
  honorsPointsNeeded: number;
}

export function clampComponentScore(value: number, max: number): number {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(max, Math.round(num)));
}

export function simulateCourseGrade(input: GradeSimulationInput): GradeSimulationResult {
  const clamped: GradeSimulationInput = {
    report: clampComponentScore(input.report, 10),
    attendanceScore: clampComponentScore(input.attendanceScore, 10),
    lab: clampComponentScore(input.lab, 20),
    midterm: clampComponentScore(input.midterm, 30),
    quiz: clampComponentScore(input.quiz, 20),
  };

  const total = computeTotalScore(clamped);
  const gradeTitle = getArabicGradeTitle(total);
  const isHonors = isEligibleForHonors(total);
  const isPassing = total >= 50;

  const tiers: Array<{ min: number; title: string }> = [
    { min: 50, title: 'مقبول' },
    { min: 60, title: 'متوسط' },
    { min: 70, title: 'جيد' },
    { min: 80, title: 'جيد جداً' },
    { min: 90, title: 'امتياز' },
  ];

  let nextTierTitle: string | null = null;
  let pointsToNextTier = 0;

  for (const tier of tiers) {
    if (total < tier.min) {
      nextTierTitle = tier.title;
      pointsToNextTier = tier.min - total;
      break;
    }
  }

  const honorsPointsNeeded = total >= 85 ? 0 : 85 - total;

  return {
    clamped,
    total,
    gradeTitle,
    isHonors,
    isPassing,
    nextTierTitle,
    pointsToNextTier,
    honorsPointsNeeded,
  };
}

export function evaluateQuizSubmission(
  quiz: Quiz,
  studentId: string,
  studentName: string,
  selectedAnswers: number[],
  timeSpentSeconds: number,
  existingGrades: GradeRecord[]
): {
  submission: QuizSubmission;
  updatedGrades: GradeRecord[];
} {
  let earnedScore = 0;
  let correctCount = 0;
  const totalQuestions = quiz.questions.length;

  quiz.questions.forEach((q, idx) => {
    const chosen = selectedAnswers[idx] ?? -1;
    if (chosen === q.correctOptionIndex) {
      earnedScore += q.points;
      correctCount += 1;
    }
  });

  const maxScore =
    quiz.maxScore > 0
      ? quiz.maxScore
      : quiz.questions.reduce((acc, q) => acc + q.points, 0) || 20;

  const normalizedQuizScore20 =
    maxScore === 20
      ? Math.min(20, earnedScore)
      : Math.min(20, Math.round((earnedScore / maxScore) * 20));

  const nowIso = new Date().toISOString();
  const submittedAt = `${nowIso.slice(0, 10)} ${nowIso.slice(11, 16)}`;

  const submission: QuizSubmission = {
    docId: 'subm-' + Date.now(),
    quizId: quiz.docId || 'quiz-unknown',
    quizTitle: quiz.title,
    subjectId: quiz.subjectId,
    subjectName: quiz.subjectName,
    studentId,
    studentName,
    answers: quiz.questions.map((_, i) => selectedAnswers[i] ?? -1),
    earnedScore,
    maxScore,
    normalizedQuizScore20,
    correctCount,
    totalQuestions,
    submittedAt,
    timeSpentSeconds: Math.max(1, Math.round(timeSpentSeconds)),
    syncedToGrades: Boolean(quiz.autoSyncToGrades),
  };

  let updatedGrades = [...existingGrades];
  if (quiz.autoSyncToGrades) {
    const existingIdx = updatedGrades.findIndex(
      (g) => g.studentId === studentId && g.subjectId === quiz.subjectId
    );

    if (existingIdx >= 0) {
      const target = { ...updatedGrades[existingIdx], quiz: normalizedQuizScore20 };
      target.total = computeTotalScore(target);
      updatedGrades[existingIdx] = target;
    } else {
      const freshGrade: GradeRecord = {
        docId: 'grd-' + Date.now(),
        studentId,
        subjectId: quiz.subjectId,
        report: 0,
        attendanceScore: 0,
        lab: 0,
        midterm: 0,
        quiz: normalizedQuizScore20,
        total: normalizedQuizScore20,
      };
      updatedGrades.push(freshGrade);
    }
  }

  return { submission, updatedGrades };
}

export interface QuizAnalyticsSummary {
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  passRatePercent: number;
}

export function computeQuizAnalytics(
  quizId: string,
  submissions: QuizSubmission[]
): QuizAnalyticsSummary {
  const filtered = (submissions || []).filter((s) => s.quizId === quizId);
  if (filtered.length === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      highestScore: 0,
      passRatePercent: 0,
    };
  }

  const totalScoreSum = filtered.reduce((acc, s) => acc + s.earnedScore, 0);
  const highestScore = filtered.reduce((max, s) => Math.max(max, s.earnedScore), 0);
  const passCount = filtered.filter((s) => s.earnedScore >= s.maxScore * 0.5).length;

  return {
    totalSubmissions: filtered.length,
    averageScore: Number((totalScoreSum / filtered.length).toFixed(1)),
    highestScore,
    passRatePercent: Math.round((passCount / filtered.length) * 100),
  };
}

export function formatQuizLaunchTelegram(quiz: Quiz): string {
  return (
    `⚡ *إعلان اختبار إلكتروني قصير (كويز) جديد*\n` +
    `📚 المادة: ${quiz.subjectName}\n` +
    `📝 عنوان الاختبار: ${quiz.title}\n` +
    `👨‍🏫 أستاذ المادة: ${quiz.professorName}\n` +
    `⏱ المدة الزمنية: ${quiz.durationMinutes} دقيقة\n` +
    `🎯 الدرجة الكلية: ${quiz.maxScore} درجة ${
      quiz.autoSyncToGrades ? '(تُرصد تلقائياً في سجل السعي)' : ''
    }\n` +
    `يرجى الدخول إلى بوابة الطالب الذكية لأداء الاختبار ضمن الوقت المحدد.`
  );
}
