import test from 'node:test';
import assert from 'node:assert/strict';
import { countAbsencesForStudent, isEarlyWarningTriggered, calculateAttendancePercentage, cycleAttendanceStatus } from './attendance.ts';
import type { AttendanceRecord } from '../types.ts';

test('countAbsencesForStudent returns correct absence count', () => {
  const records: AttendanceRecord[] = [
    { studentId: 'STU-101', subjectId: 'SUB-1', date: '2026-10-01', status: 'حاضر' },
    { studentId: 'STU-101', subjectId: 'SUB-1', date: '2026-10-02', status: 'غائب' },
    { studentId: 'STU-101', subjectId: 'SUB-1', date: '2026-10-03', status: 'غائب' },
    { studentId: 'STU-101', subjectId: 'SUB-2', date: '2026-10-04', status: 'غائب' },
    { studentId: 'STU-102', subjectId: 'SUB-1', date: '2026-10-02', status: 'غائب' },
  ];

  assert.equal(countAbsencesForStudent(records, 'STU-101', 'SUB-1'), 2);
  assert.equal(countAbsencesForStudent(records, 'STU-101'), 3);
  assert.equal(countAbsencesForStudent(records, 'STU-102', 'SUB-1'), 1);
  assert.equal(countAbsencesForStudent(records, 'STU-999', 'SUB-1'), 0);
});

test('isEarlyWarningTriggered activates upon 3 or more absences', () => {
  assert.equal(isEarlyWarningTriggered(0), false);
  assert.equal(isEarlyWarningTriggered(2), false);
  assert.equal(isEarlyWarningTriggered(3), true);
  assert.equal(isEarlyWarningTriggered(5), true);
});

test('calculateAttendancePercentage calculates correct integer percentages', () => {
  assert.equal(calculateAttendancePercentage(10, 20), 50);
  assert.equal(calculateAttendancePercentage(3, 4), 75);
  assert.equal(calculateAttendancePercentage(0, 10), 0);
  assert.equal(calculateAttendancePercentage(5, 0), 0);
});

test('cycleAttendanceStatus cycles correctly through states', () => {
  assert.equal(cycleAttendanceStatus(undefined), 'حاضر');
  assert.equal(cycleAttendanceStatus('حاضر'), 'غائب');
  assert.equal(cycleAttendanceStatus('غائب'), 'مجاز');
  assert.equal(cycleAttendanceStatus('مجاز'), undefined);
});
