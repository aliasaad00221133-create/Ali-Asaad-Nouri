import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timeToMinutes,
  getSlotsForDay,
  checkRoomConflict,
  formatLectureTelegramReminder,
  calculateSlotDurationHours,
  getDailyRoomUtilization,
} from './schedule.ts';
import type { ScheduleSlot } from '../types.ts';

test('timeToMinutes converts HH:MM format into total minutes correctly', () => {
  assert.equal(timeToMinutes('08:30'), 510);
  assert.equal(timeToMinutes('10:00'), 600);
  assert.equal(timeToMinutes('13:45'), 825);
  assert.equal(timeToMinutes(''), 0);
});

test('getSlotsForDay filters and sorts slots by ascending start time', () => {
  const slots: ScheduleSlot[] = [
    {
      docId: '1',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات',
      professorName: 'د. علي',
      dayOfWeek: 'الأحد',
      startTime: '10:30',
      endTime: '12:30',
      room: 'قاعة 101',
      type: 'نظري'
    },
    {
      docId: '2',
      subjectId: 'sub-2',
      subjectName: 'الذكاء الاصطناعي',
      professorName: 'د. مريم',
      dayOfWeek: 'الأحد',
      startTime: '08:30',
      endTime: '10:30',
      room: 'مختبر 2',
      type: 'عملي'
    },
    {
      docId: '3',
      subjectId: 'sub-3',
      subjectName: 'أمن البيانات',
      professorName: 'د. أحمد',
      dayOfWeek: 'الإثنين',
      startTime: '09:00',
      endTime: '11:00',
      room: 'قاعة 102',
      type: 'نظري'
    }
  ];

  const sundaySlots = getSlotsForDay(slots, 'الأحد');
  assert.equal(sundaySlots.length, 2);
  assert.equal(sundaySlots[0].docId, '2'); // 08:30 before 10:30
  assert.equal(sundaySlots[1].docId, '1');
});

test('checkRoomConflict flags overlapping lectures in the same room on the same day', () => {
  const existing: ScheduleSlot[] = [
    {
      docId: 'slot-1',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات',
      professorName: 'د. علي',
      dayOfWeek: 'الأحد',
      startTime: '08:30',
      endTime: '10:30',
      room: 'قاعة الخوارزمي',
      type: 'نظري'
    }
  ];

  // Overlap in same room
  const conflictSlot: ScheduleSlot = {
    subjectId: 'sub-2',
    subjectName: 'الذكاء الاصطناعي',
    professorName: 'د. مريم',
    dayOfWeek: 'الأحد',
    startTime: '09:30',
    endTime: '11:30',
    room: 'قاعة الخوارزمي',
    type: 'نظري'
  };
  assert.equal(checkRoomConflict(existing, conflictSlot).hasConflict, true);

  // Different room on same day -> No conflict
  const diffRoomSlot: ScheduleSlot = {
    subjectId: 'sub-2',
    subjectName: 'الذكاء الاصطناعي',
    professorName: 'د. مريم',
    dayOfWeek: 'الأحد',
    startTime: '09:30',
    endTime: '11:30',
    room: 'مختبر 3',
    type: 'عملي'
  };
  assert.equal(checkRoomConflict(existing, diffRoomSlot).hasConflict, false);

  // Same room but different day -> No conflict
  const diffDaySlot: ScheduleSlot = {
    subjectId: 'sub-2',
    subjectName: 'الذكاء الاصطناعي',
    professorName: 'د. مريم',
    dayOfWeek: 'الإثنين',
    startTime: '08:30',
    endTime: '10:30',
    room: 'قاعة الخوارزمي',
    type: 'نظري'
  };
  assert.equal(checkRoomConflict(existing, diffDaySlot).hasConflict, false);
});

test('formatLectureTelegramReminder generates HTML message with proper details', () => {
  const slot: ScheduleSlot = {
    docId: 'slot-1',
    subjectId: 'sub-1',
    subjectName: 'هندسة البرمجيات',
    professorName: 'د. علي الساعدي',
    dayOfWeek: 'الأحد',
    startTime: '08:30',
    endTime: '10:30',
    room: 'قاعة الخوارزمي الكبرى',
    type: 'نظري',
    notes: 'تحضير الوحدة الثالثة'
  };

  const message = formatLectureTelegramReminder(slot);
  assert.match(message, /هندسة البرمجيات/);
  assert.match(message, /قاعة الخوارزمي الكبرى/);
  assert.match(message, /08:30/);
});

test('calculateSlotDurationHours returns duration in hours accurately', () => {
  assert.equal(calculateSlotDurationHours({ startTime: '08:30', endTime: '10:30' }), 2);
  assert.equal(calculateSlotDurationHours({ startTime: '09:00', endTime: '10:30' }), 1.5);
  assert.equal(calculateSlotDurationHours({ startTime: '12:00', endTime: '11:00' }), 0);
});

test('getDailyRoomUtilization aggregates daily hours by room and lecture type', () => {
  const slots: ScheduleSlot[] = [
    {
      docId: 's1',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات',
      professorName: 'د. علي',
      dayOfWeek: 'الأحد',
      startTime: '08:30',
      endTime: '10:30',
      room: 'قاعة الخوارزمي الكبرى',
      type: 'نظري',
    },
    {
      docId: 's2',
      subjectId: 'sub-2',
      subjectName: 'قواعد البيانات',
      professorName: 'د. مريم',
      dayOfWeek: 'الأحد',
      startTime: '11:00',
      endTime: '13:00',
      room: 'قاعة الخوارزمي الكبرى',
      type: 'امتحان',
    },
    {
      docId: 's3',
      subjectId: 'sub-3',
      subjectName: 'الذكاء الاصطناعي',
      professorName: 'د. علي',
      dayOfWeek: 'الإثنين',
      startTime: '09:00',
      endTime: '12:00',
      room: 'مختبر البرمجيات',
      type: 'عملي',
    },
  ];

  const sundayStats = getDailyRoomUtilization(slots, 'الأحد', 8);
  const khwarizmi = sundayStats.find((r) => r.room === 'قاعة الخوارزمي الكبرى');
  const lab = sundayStats.find((r) => r.room === 'مختبر البرمجيات');

  assert.ok(khwarizmi);
  assert.equal(khwarizmi.totalHours, 4);
  assert.equal(khwarizmi.theoryHours, 2);
  assert.equal(khwarizmi.examHours, 2);
  assert.equal(khwarizmi.utilizationRate, 50);
  assert.equal(khwarizmi.status, 'استغلال مثالي');

  assert.ok(lab);
  assert.equal(lab.totalHours, 0);
  assert.equal(lab.availableHours, 8);
});

