import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateQuizSubmission,
  computeQuizAnalytics,
  simulateCourseGrade,
  formatQuizLaunchTelegram,
} from './quizzes.ts';
import type { GradeRecord, Quiz } from '../types.ts';

const sampleQuiz: Quiz = {
  docId: 'quiz-1',
  subjectId: 'sub-1',
  subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
  professorName: 'أ.د. علي الساعدي',
  title: 'الاختبار القصير الأول: معمارية Microservices',
  durationMinutes: 10,
  maxScore: 20,
  isActive: true,
  autoSyncToGrades: true,
  createdAt: '2026-10-19',
  questions: [
    {
      id: 'q1',
      questionText: 'ما الميزة الأساسية لمعمارية الخدمات المصغرة (Microservices)؟',
      options: [
        'استقلالية النشر والتوسع لكل خدمة',
        'دمج جميع قواعد البيانات في جدول واحد',
        'إلغاء الحاجة لبروتوكول HTTP',
        'تقليل عدد الخوادم إلى خادم واحد فقط',
      ],
      correctOptionIndex: 0,
      points: 5,
    },
    {
      id: 'q2',
      questionText: 'أي أداة تُستخدم لتنسيق الحاويات (Container Orchestration)؟',
      options: ['Git', 'Kubernetes', 'SQLite', 'Webpack'],
      correctOptionIndex: 1,
      points: 5,
    },
    {
      id: 'q3',
      questionText: 'ماذا يعني اختصار CI/CD في هندسة البرمجيات؟',
      options: [
        'التكامل المستمر والنشر المستمر',
        'التشفير الداخلي للبيانات',
        'فحص الواجهات الرسومية يدوياً',
        'إدارة قواعد البيانات المركزية',
      ],
      correctOptionIndex: 0,
      points: 5,
    },
    {
      id: 'q4',
      questionText: 'في نمط Clean Architecture، أي طبقة تقع في المركز ولا تعتمد على أطر العمل؟',
      options: [
        'طبقة واجهة المستخدم UI',
        'طبقة الكيانات وقواعد العمل (Entities)',
        'طبقة قاعدة البيانات الخارجية',
        'طبقة بوابة الدفع',
      ],
      correctOptionIndex: 1,
      points: 5,
    },
  ],
};

test('evaluateQuizSubmission scores answers accurately and auto-syncs to student GradeRecord', () => {
  const initialGrades: GradeRecord[] = [
    {
      docId: 'grd-1',
      studentId: 'STU-309482',
      subjectId: 'sub-1',
      report: 7,
      attendanceScore: 5,
      lab: 14,
      midterm: 18,
      quiz: 12,
      total: 56,
    },
  ];

  // Student gets 3 out of 4 right (15 / 20)
  const { submission, updatedGrades } = evaluateQuizSubmission(
    sampleQuiz,
    'STU-309482',
    'زينب عباس الجبوري',
    [0, 1, 0, 3],
    185,
    initialGrades
  );

  assert.equal(submission.correctCount, 3);
  assert.equal(submission.earnedScore, 15);
  assert.equal(submission.normalizedQuizScore20, 15);
  assert.equal(submission.syncedToGrades, true);

  // GradeRecord quiz should update from 12 -> 15, and total from 56 -> 59
  assert.equal(updatedGrades[0].quiz, 15);
  assert.equal(updatedGrades[0].total, 59);
});

test('computeQuizAnalytics calculates average, highest score, and pass rate accurately', () => {
  const { submission: s1 } = evaluateQuizSubmission(
    sampleQuiz,
    'STU-102941',
    'حيدر كرار العبيدي',
    [0, 1, 0, 1], // 20/20
    120,
    []
  );
  const { submission: s2 } = evaluateQuizSubmission(
    sampleQuiz,
    'STU-309482',
    'زينب عباس الجبوري',
    [0, 0, 2, 3], // 5/20 (fail)
    200,
    []
  );

  const stats = computeQuizAnalytics('quiz-1', [s1, s2]);
  assert.equal(stats.totalSubmissions, 2);
  assert.equal(stats.highestScore, 20);
  assert.equal(stats.averageScore, 12.5);
  assert.equal(stats.passRatePercent, 50);
});

test('simulateCourseGrade clamps component ranges and calculates next tier delta', () => {
  const sim = simulateCourseGrade({
    report: 9,
    attendanceScore: 9,
    lab: 18,
    midterm: 25,
    quiz: 16,
  });

  assert.equal(sim.total, 77);
  assert.equal(sim.gradeTitle, 'جيد');
  assert.equal(sim.isHonors, false);
  assert.equal(sim.nextTierTitle, 'جيد جداً');
  assert.equal(sim.pointsToNextTier, 3);
  assert.equal(sim.honorsPointsNeeded, 8);
});

test('formatQuizLaunchTelegram generates structured Arabic message', () => {
  const msg = formatQuizLaunchTelegram(sampleQuiz);
  assert.ok(msg.includes('الاختبار القصير الأول: معمارية Microservices'));
  assert.ok(msg.includes('10 دقيقة'));
});
