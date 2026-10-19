import type { AttendanceRecord, AttendanceStatus } from '../types.ts';

export function countAbsencesForStudent(
  records: AttendanceRecord[],
  studentId: string,
  subjectId?: string
): number {
  return records.filter(r => {
    const matchStudent = r.studentId === studentId;
    const matchSubject = subjectId ? r.subjectId === subjectId : true;
    return matchStudent && matchSubject && r.status === 'غائب';
  }).length;
}

export function isEarlyWarningTriggered(absences: number, threshold = 3): boolean {
  return absences >= threshold;
}

export function calculateAttendancePercentage(presentCount: number, totalStudents: number): number {
  if (totalStudents <= 0) return 0;
  return Math.round((presentCount / totalStudents) * 100);
}

export function cycleAttendanceStatus(current?: AttendanceStatus): AttendanceStatus | undefined {
  if (!current) return 'حاضر';
  if (current === 'حاضر') return 'غائب';
  if (current === 'غائب') return 'مجاز';
  return undefined;
}

export interface StudentAttendanceStats {
  totalLectures: number;
  present: number;
  absent: number;
  excused: number;
  absenceRate: number;
  warningLevel: 'none' | 'warning' | 'critical';
}

export function computeAttendanceStats(records: AttendanceRecord[]): StudentAttendanceStats {
  const totalLectures = (records || []).length;
  const present = (records || []).filter((r) => r.status === 'حاضر').length;
  const absent = (records || []).filter((r) => r.status === 'غائب').length;
  const excused = (records || []).filter((r) => r.status === 'مجاز').length;

  const absenceRate = totalLectures > 0 ? Math.round((absent / totalLectures) * 100) : 0;

  let warningLevel: 'none' | 'warning' | 'critical' = 'none';
  if (absent >= 3 || (totalLectures >= 2 && absenceRate >= 25)) {
    warningLevel = 'critical';
  } else if (absent >= 1 || (totalLectures >= 2 && absenceRate >= 10)) {
    warningLevel = 'warning';
  }

  return {
    totalLectures,
    present,
    absent,
    excused,
    absenceRate,
    warningLevel,
  };
}

