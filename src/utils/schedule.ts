import type { DayOfWeek, ScheduleSlot } from '../types.ts';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'السبت',
];

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function getSlotsForDay(slots: ScheduleSlot[], day: DayOfWeek): ScheduleSlot[] {
  return (slots || [])
    .filter((s) => s.dayOfWeek === day)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function checkRoomConflict(
  existingSlots: ScheduleSlot[],
  newSlot: ScheduleSlot
): { hasConflict: boolean; conflictingSlot?: ScheduleSlot } {
  const newStart = timeToMinutes(newSlot.startTime);
  const newEnd = timeToMinutes(newSlot.endTime);
  const newRoom = newSlot.room.trim().toLowerCase();

  for (const slot of existingSlots) {
    if (slot.docId && newSlot.docId && slot.docId === newSlot.docId) {
      continue; // Skip comparing against itself during editing
    }

    if (slot.dayOfWeek === newSlot.dayOfWeek && slot.room.trim().toLowerCase() === newRoom) {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);

      // Overlap condition: startA < endB and endA > startB
      if (newStart < slotEnd && newEnd > slotStart) {
        return { hasConflict: true, conflictingSlot: slot };
      }
    }
  }

  return { hasConflict: false };
}

export function formatLectureTelegramReminder(slot: ScheduleSlot): string {
  const typeBadge =
    slot.type === 'عملي'
      ? '🧪 <b>مختبر عملي</b>'
      : slot.type === 'امتحان'
      ? '📝 <b>امتحان مقرر</b>'
      : '📖 <b>محاضرة نظرية</b>';

  return `<b>🔔 تذكير بموعد المحاضرة القادمة</b>\n\n` +
    `<b>المادة:</b> ${slot.subjectName}\n` +
    `<b>الأستاذ:</b> ${slot.professorName}\n` +
    `<b>اليوم:</b> ${slot.dayOfWeek}\n` +
    `<b>الوقت:</b> من ${slot.startTime} إلى ${slot.endTime}\n` +
    `<b>القاعة / المختبر:</b> ${slot.room}\n` +
    `<b>النوع:</b> ${typeBadge}\n` +
    (slot.notes ? `<b>ملاحظات:</b> ${slot.notes}\n` : '') +
    `\n<i>يرجى من جميع الطلبة التواجد في القاعة قبل بدء المحاضرة بـ 5 دقائق.</i>`;
}

export interface RoomUtilizationItem {
  room: string;
  shortRoom: string;
  totalHours: number;
  theoryHours: number;
  labHours: number;
  examHours: number;
  lecturesCount: number;
  maxCapacityHours: number;
  availableHours: number;
  utilizationRate: number;
  status: 'متاح' | 'استغلال مثالي' | 'ضغط مرتفع';
}

export function calculateSlotDurationHours(slot: Pick<ScheduleSlot, 'startTime' | 'endTime'>): number {
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  if (end <= start) return 0;
  return Number(((end - start) / 60).toFixed(2));
}

export function shortenRoomName(room: string): string {
  const cleaned = room.replace(/\s*\([^)]*\)\s*/g, '').trim();
  return cleaned.length > 22 ? cleaned.slice(0, 22) + '…' : cleaned;
}

export function getDailyRoomUtilization(
  slots: ScheduleSlot[],
  dayFilter: DayOfWeek | 'الكل' = 'الكل',
  dailyMaxHours = 8
): RoomUtilizationItem[] {
  const allRoomsSet = new Set<string>();
  for (const s of slots || []) {
    if (s.room && s.room.trim()) {
      allRoomsSet.add(s.room.trim());
    }
  }

  // Ensure standard university rooms appear even if filtered day has 0 hours in one of them
  const filteredSlots =
    dayFilter === 'الكل'
      ? slots || []
      : (slots || []).filter((s) => s.dayOfWeek === dayFilter);

  const maxCapacity = dayFilter === 'الكل' ? dailyMaxHours * DAYS_OF_WEEK.length : dailyMaxHours;

  const roomMap = new Map<
    string,
    {
      totalHours: number;
      theoryHours: number;
      labHours: number;
      examHours: number;
      lecturesCount: number;
    }
  >();

  for (const r of allRoomsSet) {
    roomMap.set(r, {
      totalHours: 0,
      theoryHours: 0,
      labHours: 0,
      examHours: 0,
      lecturesCount: 0,
    });
  }

  for (const slot of filteredSlots) {
    const roomName = (slot.room || '').trim();
    if (!roomName) continue;
    const current = roomMap.get(roomName) || {
      totalHours: 0,
      theoryHours: 0,
      labHours: 0,
      examHours: 0,
      lecturesCount: 0,
    };

    const duration = calculateSlotDurationHours(slot);
    current.totalHours = Number((current.totalHours + duration).toFixed(2));
    if (slot.type === 'عملي') {
      current.labHours = Number((current.labHours + duration).toFixed(2));
    } else if (slot.type === 'امتحان') {
      current.examHours = Number((current.examHours + duration).toFixed(2));
    } else {
      current.theoryHours = Number((current.theoryHours + duration).toFixed(2));
    }
    current.lecturesCount += 1;
    roomMap.set(roomName, current);
  }

  return Array.from(roomMap.entries())
    .map(([room, stats]) => {
      const utilizationRate =
        maxCapacity > 0
          ? Math.min(100, Math.round((stats.totalHours / maxCapacity) * 100))
          : 0;
      const availableHours = Math.max(0, Number((maxCapacity - stats.totalHours).toFixed(2)));
      const status: RoomUtilizationItem['status'] =
        utilizationRate >= 75
          ? 'ضغط مرتفع'
          : utilizationRate >= 35
          ? 'استغلال مثالي'
          : 'متاح';

      return {
        room,
        shortRoom: shortenRoomName(room),
        totalHours: stats.totalHours,
        theoryHours: stats.theoryHours,
        labHours: stats.labHours,
        examHours: stats.examHours,
        lecturesCount: stats.lecturesCount,
        maxCapacityHours: maxCapacity,
        availableHours,
        utilizationRate,
        status,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours || a.room.localeCompare(b.room, 'ar'));
}

