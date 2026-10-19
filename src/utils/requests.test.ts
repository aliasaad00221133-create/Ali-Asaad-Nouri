import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyApprovedRequestToState,
  rejectRequestInState,
  countRequestsByStatus,
  formatRequestResolutionTelegram,
} from './requests.ts';
import type { AttendanceRecord, GradeRecord, StudentRequest } from '../types.ts';

test('applyApprovedRequestToState converts absence to مجاز for excuse request', () => {
  const attendance: AttendanceRecord[] = [
    { docId: 'att-3', studentId: 'STU-309482', subjectId: 'sub-1', date: '2026-10-15', status: 'غائب' },
  ];
  const grades: GradeRecord[] = [];
  const req: StudentRequest = {
    docId: 'req-1',
    studentId: 'STU-309482',
    studentName: 'زينب عباس الجبوري',
    subjectId: 'sub-1',
    subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
    type: 'excuse',
    status: 'قيد المراجعة',
    createdAt: '2026-10-18',
    absenceDate: '2026-10-15',
    reason: 'تقرير طبي رسمي من مستشفى الجامعة',
  };

  const result = applyApprovedRequestToState(req, attendance, grades, undefined, 'تم اعتماد التقرير الطبي');
  assert.equal(result.updatedRequest.status, 'مقبول');
  assert.equal(result.updatedAttendance.length, 1);
  assert.equal(result.updatedAttendance[0].status, 'مجاز');
});

test('applyApprovedRequestToState updates grade component and recalculates total for appeal request', () => {
  const attendance: AttendanceRecord[] = [];
  const grades: GradeRecord[] = [
    {
      docId: 'grd-3',
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
  const req: StudentRequest = {
    docId: 'req-2',
    studentId: 'STU-309482',
    studentName: 'زينب عباس الجبوري',
    subjectId: 'sub-1',
    subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
    type: 'appeal',
    status: 'قيد المراجعة',
    createdAt: '2026-10-19',
    gradeComponent: 'midterm',
    currentScore: 18,
    requestedScore: 24,
    reason: 'الفرع الثاني من السؤال الثالث لم يُجمع في الورقة الامتحانية',
  };

  const result = applyApprovedRequestToState(req, attendance, grades, 24, 'تمت مراجعة الدفتر الامتحاني وتصحيح الجمع');
  assert.equal(result.updatedRequest.status, 'مقبول');
  assert.equal(result.updatedGrades[0].midterm, 24);
  // 7 + 5 + 14 + 24 + 12 = 62
  assert.equal(result.updatedGrades[0].total, 62);
});

test('rejectRequestInState marks request as مرفوض with note', () => {
  const req: StudentRequest = {
    docId: 'req-3',
    studentId: 'STU-102941',
    studentName: 'حيدر كرار العبيدي',
    subjectId: 'sub-1',
    subjectName: 'هندسة البرمجيات',
    type: 'appeal',
    status: 'قيد المراجعة',
    createdAt: '2026-10-19',
    gradeComponent: 'quiz',
    currentScore: 18,
    requestedScore: 25,
    reason: 'مراجعة درجة الكويز',
  };

  const rejected = rejectRequestInState(req, 'الدرجة مطابقة للإجابة النموذجية');
  assert.equal(rejected.status, 'مرفوض');
  assert.equal(rejected.professorNote, 'الدرجة مطابقة للإجابة النموذجية');
});

test('countRequestsByStatus tallies requests accurately', () => {
  const list: StudentRequest[] = [
    {
      docId: '1',
      studentId: 'S1',
      studentName: 'N1',
      subjectId: 'sub-1',
      subjectName: 'Sub',
      type: 'excuse',
      status: 'قيد المراجعة',
      createdAt: '2026-10-19',
      reason: 'R1',
    },
    {
      docId: '2',
      studentId: 'S2',
      studentName: 'N2',
      subjectId: 'sub-1',
      subjectName: 'Sub',
      type: 'appeal',
      status: 'مقبول',
      createdAt: '2026-10-19',
      reason: 'R2',
    },
  ];
  const counts = countRequestsByStatus(list);
  assert.equal(counts.total, 2);
  assert.equal(counts.pending, 1);
  assert.equal(counts.approved, 1);
  assert.equal(counts.excuses, 1);
  assert.equal(counts.appeals, 1);
});

test('formatRequestResolutionTelegram formats message properly', () => {
  const req: StudentRequest = {
    docId: 'req-1',
    studentId: 'STU-309482',
    studentName: 'زينب عباس الجبوري',
    subjectId: 'sub-1',
    subjectName: 'هندسة البرمجيات المتقدمة',
    type: 'excuse',
    status: 'مقبول',
    createdAt: '2026-10-18',
    absenceDate: '2026-10-15',
    reason: 'تقرير طبي',
    professorNote: 'تم القبول',
  };
  const msg = formatRequestResolutionTelegram(req);
  assert.match(msg, /زينب عباس الجبوري/);
  assert.match(msg, /مقبول/);
  assert.match(msg, /2026-10-15/);
});
