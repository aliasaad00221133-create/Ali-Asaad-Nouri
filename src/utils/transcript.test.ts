import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreToGpa4,
  generateVerificationCode,
  computeStudentTranscript,
  computeHonorRollAndRankings,
  computeEarlyWarningRadar,
  formatEarlyWarningTelegram,
} from './transcript.ts';
import type { AttendanceRecord, GradeRecord, Student, Subject } from '../types.ts';

const sampleStudents: Student[] = [
  {
    docId: 'stu-1',
    id: 'STU-102941',
    name: 'أحمد محمد العراقي',
    level: 'المرحلة الثالثة',
    department: 'هندسة البرمجيات',
    phone: '07701234567',
  },
  {
    docId: 'stu-2',
    id: 'STU-104829',
    name: 'فاطمة الزهراء علي',
    level: 'المرحلة الثالثة',
    department: 'هندسة البرمجيات',
    phone: '07809876543',
  },
];

const sampleSubjects: Subject[] = [
  { docId: 'sub-1', name: 'الذكاء الاصطناعي وتعلم الآلة', professorId: 'prof-1' },
  { docId: 'sub-2', name: 'أمن المعلومات والشبكات المتقدمة', professorId: 'prof-2' },
];

const sampleGrades: GradeRecord[] = [
  {
    docId: 'g-1',
    studentId: 'STU-102941',
    subjectId: 'sub-1',
    report: 10,
    attendanceScore: 10,
    lab: 19,
    midterm: 28,
    quiz: 28,
    total: 95,
  },
  {
    docId: 'g-2',
    studentId: 'STU-102941',
    subjectId: 'sub-2',
    report: 9,
    attendanceScore: 9,
    lab: 18,
    midterm: 27,
    quiz: 27,
    total: 90,
  },
  {
    docId: 'g-3',
    studentId: 'STU-104829',
    subjectId: 'sub-1',
    report: 5,
    attendanceScore: 5,
    lab: 10,
    midterm: 14,
    quiz: 12,
    total: 46,
  },
  {
    docId: 'g-4',
    studentId: 'STU-104829',
    subjectId: 'sub-2',
    report: 7,
    attendanceScore: 7,
    lab: 14,
    midterm: 18,
    quiz: 16,
    total: 62,
  },
];

const sampleAttendance: AttendanceRecord[] = [
  { studentId: 'STU-102941', subjectId: 'sub-1', date: '2026-10-01', status: 'حاضر' },
  { studentId: 'STU-102941', subjectId: 'sub-2', date: '2026-10-01', status: 'حاضر' },
  // STU-104829 has 2 absences out of 4 lectures in sub-1 (50% absence -> critical)
  { studentId: 'STU-104829', subjectId: 'sub-1', date: '2026-10-01', status: 'غائب' },
  { studentId: 'STU-104829', subjectId: 'sub-1', date: '2026-10-05', status: 'غائب' },
  { studentId: 'STU-104829', subjectId: 'sub-1', date: '2026-10-10', status: 'حاضر' },
  { studentId: 'STU-104829', subjectId: 'sub-1', date: '2026-10-15', status: 'حاضر' },
];

test('scoreToGpa4 maps 0-100 scores to 4.0 scale accurately', () => {
  assert.equal(scoreToGpa4(95), 4.0);
  assert.equal(scoreToGpa4(86), 3.7);
  assert.equal(scoreToGpa4(76), 3.0);
  assert.equal(scoreToGpa4(45), 0.0);
});

test('computeStudentTranscript calculates weighted average, 4.0 GPA, and honor standing', () => {
  const transcript = computeStudentTranscript(
    sampleStudents[0],
    sampleSubjects,
    sampleGrades,
    sampleAttendance
  );

  assert.equal(transcript.courses.length, 2);
  assert.ok(transcript.cumulativeAverage >= 92);
  assert.equal(transcript.gpa4, 4.0);
  assert.equal(transcript.isHonorRoll, true);
  assert.equal(transcript.academicStanding, 'مرتبة الشرف الأولى');
  assert.equal(transcript.verificationCode, generateVerificationCode('STU-102941'));
});

test('computeHonorRollAndRankings sorts students by cumulative average descending', () => {
  const rankings = computeHonorRollAndRankings(
    sampleStudents,
    sampleSubjects,
    sampleGrades,
    sampleAttendance
  );

  assert.equal(rankings.length, 2);
  assert.equal(rankings[0].rank, 1);
  assert.equal(rankings[0].student.id, 'STU-102941');
  assert.equal(rankings[1].rank, 2);
  assert.equal(rankings[1].student.id, 'STU-104829');
  assert.equal(rankings[1].isHonorRoll, false);
});

test('computeEarlyWarningRadar detects both critical absence and grade risk cases', () => {
  const alerts = computeEarlyWarningRadar(
    sampleStudents,
    sampleSubjects,
    sampleGrades,
    sampleAttendance
  );

  assert.ok(alerts.length >= 2);
  const criticalSub1 = alerts.find(
    (a) => a.studentId === 'STU-104829' && a.subjectId === 'sub-1'
  );
  assert.ok(criticalSub1);
  assert.equal(criticalSub1.category, 'both');
  assert.equal(criticalSub1.severity, 'critical');

  const msg = formatEarlyWarningTelegram(criticalSub1);
  assert.ok(msg.includes('فاطمة الزهراء علي'));
  assert.ok(msg.includes('الذكاء الاصطناعي وتعلم الآلة'));
});
