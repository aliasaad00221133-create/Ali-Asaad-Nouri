import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateClearanceCode,
  generateSmartCardNumber,
  computeClearanceMetrics,
  createStudentClearanceRecord,
  updateClearanceDepartmentStep,
  approveAllClearanceDepartments,
} from './clearance.ts';
import type { Student } from '../types.ts';

const sampleStudent: Student = {
  docId: 'stu-1',
  id: 'STU-102941',
  name: 'حيدر كرار العبيدي',
  level: 'المرحلة الثالثة',
  department: 'هندسة تقنيات البرمجيات',
  phone: '07701234567',
};

test('generateClearanceCode and generateSmartCardNumber produce deterministic codes', () => {
  assert.equal(generateClearanceCode('STU-102941'), 'CLR-102941');
  assert.equal(generateSmartCardNumber('STU-102941'), 'UID-2026-102941');
});

test('createStudentClearanceRecord initializes 5 university departments and computes status', () => {
  const record = createStudentClearanceRecord(sampleStudent, {
    statuses: {
      finance: { status: 'مكتمل' },
      library: { status: 'قيد المراجعة', note: 'استعارة مرجع هندسة البرمجيات' },
      labs: { status: 'مكتمل' },
      examination: { status: 'مكتمل' },
      student_affairs: { status: 'مكتمل' },
    },
  });

  assert.equal(record.departments.length, 5);
  assert.equal(record.completionPercent, 80);
  assert.equal(record.overallStatus, 'قيد الاستكمال');
});

test('updateClearanceDepartmentStep transitions status to blocked and then completed', () => {
  const initial = createStudentClearanceRecord(sampleStudent);
  assert.equal(initial.overallStatus, 'مكتملة');
  assert.equal(initial.completionPercent, 100);

  const blocked = updateClearanceDepartmentStep(
    initial,
    'labs',
    'معلق - ذمة',
    'مطلوب تسليم جهاز راسبيري باي المختبري'
  );
  assert.equal(blocked.overallStatus, 'معلقة لوجود ذمة');
  assert.equal(blocked.completionPercent, 80);

  const restored = approveAllClearanceDepartments(blocked);
  assert.equal(restored.overallStatus, 'مكتملة');
  assert.equal(restored.completionPercent, 100);
  const metrics = computeClearanceMetrics(restored.departments);
  assert.equal(metrics.completedCount, 5);
  assert.equal(metrics.blockedCount, 0);
});
