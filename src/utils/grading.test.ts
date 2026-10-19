import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeScore, computeTotalScore, getArabicGradeTitle, isEligibleForHonors } from './grading.ts';

test('sanitizeScore handles normal numbers, strings, and edge cases', () => {
  assert.equal(sanitizeScore(15), 15);
  assert.equal(sanitizeScore('25'), 25);
  assert.equal(sanitizeScore(''), 0);
  assert.equal(sanitizeScore(null), 0);
  assert.equal(sanitizeScore(undefined), 0);
  assert.equal(sanitizeScore('invalid'), 0);
  assert.equal(sanitizeScore(-5), 0);
  assert.equal(sanitizeScore(150), 100);
});

test('computeTotalScore correctly sums up all coursework components', () => {
  const breakdown = {
    report: 10,
    attendanceScore: 10,
    lab: 20,
    midterm: 25,
    quiz: 15
  };
  assert.equal(computeTotalScore(breakdown), 80);
});

test('getArabicGradeTitle maps percentage scores to academic descriptions', () => {
  assert.equal(getArabicGradeTitle(95), 'امتياز');
  assert.equal(getArabicGradeTitle(82), 'جيد جداً');
  assert.equal(getArabicGradeTitle(74), 'جيد');
  assert.equal(getArabicGradeTitle(65), 'متوسط');
  assert.equal(getArabicGradeTitle(52), 'مقبول');
  assert.equal(getArabicGradeTitle(45), 'راسب');
});

test('isEligibleForHonors checks threshold accurately', () => {
  assert.equal(isEligibleForHonors(85), true);
  assert.equal(isEligibleForHonors(92), true);
  assert.equal(isEligibleForHonors(84), false);
});
