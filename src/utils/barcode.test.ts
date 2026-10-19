import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateProfessorBarcodeId,
  generateSessionBarcodeToken,
  createBarcodeSessionObject,
  resolveScannedProfessorBarcode,
  applyStudentBarcodeCheckIn,
} from './barcode.ts';
import type { Professor, Subject, AttendanceRecord } from '../types.ts';

const sampleProf: Professor = {
  docId: 'prof-guest-1',
  profCode: 'PRF-778899',
  name: 'د. وسام الكيلاني',
  username: 'wissam',
  department: 'الحوسبة الكمومية',
  roleType: 'أستاذ ضيف',
};

const sampleSubject: Subject = {
  docId: 'sub-99',
  name: 'مبادئ الحوسبة الكمومية',
  professorId: 'prof-guest-1',
};

test('generateProfessorBarcodeId produces deterministic PRF-XXXXXX format', () => {
  const code1 = generateProfessorBarcodeId('ali');
  const code2 = generateProfessorBarcodeId('ali');
  assert.equal(code1, code2);
  assert.match(code1, /^PRF-\d{6}$/);
});

test('createBarcodeSessionObject builds active session with valid QR payload', () => {
  const session = createBarcodeSessionObject({
    professor: sampleProf,
    subject: sampleSubject,
    lectureTitle: 'المحاضرة الأولى: البوابات الكمومية',
    room: 'قاعة الخوارزمي الكبرى',
    date: '2026-10-19',
    sessionCode: 'BAR-654321',
  });

  assert.equal(session.sessionCode, 'BAR-654321');
  assert.equal(session.profCode, 'PRF-778899');
  assert.equal(session.professorRole, 'أستاذ ضيف');
  assert.equal(session.isActive, true);
  const parsed = JSON.parse(session.qrPayload);
  assert.equal(parsed.sessionCode, 'BAR-654321');
  assert.equal(parsed.profCode, 'PRF-778899');
  assert.equal(parsed.subjectId, 'sub-99');
});

test('resolveScannedProfessorBarcode matches QR JSON, BAR session code, 6-digit PIN, and PRF code', () => {
  const session = createBarcodeSessionObject({
    professor: sampleProf,
    subject: sampleSubject,
    lectureTitle: 'المحاضرة الأولى',
    room: 'قاعة 1',
    date: '2026-10-19',
    sessionCode: 'BAR-654321',
  });

  // 1. Match via QR JSON payload
  const resQr = resolveScannedProfessorBarcode(
    session.qrPayload,
    [session],
    [sampleProf],
    [sampleSubject]
  );
  assert.equal(resQr.matched, true);
  assert.equal(resQr.session?.sessionCode, 'BAR-654321');

  // 2. Match via BAR-654321 or 654321
  const resPin = resolveScannedProfessorBarcode(
    '654321',
    [session],
    [sampleProf],
    [sampleSubject]
  );
  assert.equal(resPin.matched, true);
  assert.equal(resPin.subjectId, 'sub-99');

  // 3. Match via Professor Barcode ID PRF-778899
  const resProfCode = resolveScannedProfessorBarcode(
    'PRF-778899',
    [session],
    [sampleProf],
    [sampleSubject]
  );
  assert.equal(resProfCode.matched, true);
  assert.equal(resProfCode.professorName, 'د. وسام الكيلاني');
});

test('applyStudentBarcodeCheckIn registers student in session and marks attendance as حاضر', () => {
  const session = createBarcodeSessionObject({
    professor: sampleProf,
    subject: sampleSubject,
    lectureTitle: 'المحاضرة الأولى',
    room: 'قاعة 1',
    date: '2026-10-19',
    sessionCode: 'BAR-654321',
  });

  const initialAttendance: AttendanceRecord[] = [
    {
      docId: 'att-old',
      studentId: 'STU-102941',
      subjectId: 'sub-99',
      date: '2026-10-19',
      status: 'غائب',
    },
  ];

  const resolution = resolveScannedProfessorBarcode(
    'BAR-654321',
    [session],
    [sampleProf],
    [sampleSubject]
  );

  const result = applyStudentBarcodeCheckIn({
    studentId: 'STU-102941',
    studentName: 'حيدر كرار العبيدي',
    studentDepartment: 'هندسة تقنيات البرمجيات',
    resolution,
    sessions: [session],
    attendance: initialAttendance,
    method: 'code',
    dateOverride: '2026-10-19',
  });

  assert.equal(result.alreadyRegistered, false);
  assert.equal(result.updatedSessions[0].registeredStudents.length, 1);
  assert.equal(result.updatedSessions[0].registeredStudents[0].studentId, 'STU-102941');

  const updatedRec = result.updatedAttendance.find(
    (r) => r.studentId === 'STU-102941' && r.subjectId === 'sub-99'
  );
  assert.equal(updatedRec?.status, 'حاضر');
});
