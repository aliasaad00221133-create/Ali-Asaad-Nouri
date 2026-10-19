import type {
  AttendanceRecord,
  GradeComponentField,
  GradeRecord,
  StudentRequest,
} from '../types.ts';
import { computeTotalScore } from './grading.ts';

export const GRADE_COMPONENT_LABELS: Record<GradeComponentField, { label: string; max: number }> = {
  report: { label: 'التقرير العلمي (10)', max: 10 },
  attendanceScore: { label: 'درجة الحضور (10)', max: 10 },
  lab: { label: 'المختبر العملي (20)', max: 20 },
  midterm: { label: 'الامتحان الفصلي Mid (30)', max: 30 },
  quiz: { label: 'الكويزات اليومية (30)', max: 30 },
};

export function getGradeComponentLabel(field?: GradeComponentField): string {
  if (!field) return 'درجة السعي';
  return GRADE_COMPONENT_LABELS[field]?.label || 'درجة السعي';
}

export function getGradeComponentMax(field?: GradeComponentField): number {
  if (!field) return 100;
  return GRADE_COMPONENT_LABELS[field]?.max || 100;
}

/**
 * Pure function to apply an approved student request ('excuse' or 'appeal')
 * to the attendance and grades records.
 *
 * - If request.type === 'excuse': converts or inserts the attendance record on
 *   `absenceDate` for `(studentId, subjectId)` with status `'مجاز'`.
 * - If request.type === 'appeal': updates the specified `gradeComponent` score
 *   to `newScore` (clamped to valid range) and recalculates `total`.
 */
export function applyApprovedRequestToState(
  request: StudentRequest,
  attendance: AttendanceRecord[],
  grades: GradeRecord[],
  approvedScoreOverride?: number,
  professorNote?: string
): {
  updatedRequest: StudentRequest;
  updatedAttendance: AttendanceRecord[];
  updatedGrades: GradeRecord[];
} {
  const resolvedAt = new Date().toISOString().split('T')[0];
  const finalScore =
    approvedScoreOverride !== undefined ? approvedScoreOverride : request.requestedScore;

  const updatedRequest: StudentRequest = {
    ...request,
    status: 'مقبول',
    requestedScore: finalScore,
    professorNote: professorNote?.trim() || 'تم قبول الطلب وتحديث السجل الأكاديمي رسمياً',
    resolvedAt,
  };

  let updatedAttendance = [...(attendance || [])];
  let updatedGrades = [...(grades || [])];

  if (request.type === 'excuse' && request.absenceDate) {
    const existingIdx = updatedAttendance.findIndex(
      (r) =>
        r.studentId === request.studentId &&
        r.subjectId === request.subjectId &&
        r.date === request.absenceDate
    );

    if (existingIdx >= 0) {
      updatedAttendance[existingIdx] = {
        ...updatedAttendance[existingIdx],
        status: 'مجاز',
      };
    } else {
      updatedAttendance.push({
        docId: 'att-excuse-' + Date.now(),
        studentId: request.studentId,
        studentName: undefined,
        subjectId: request.subjectId,
        date: request.absenceDate,
        status: 'مجاز',
      } as AttendanceRecord);
    }
  } else if (request.type === 'appeal' && request.gradeComponent && finalScore !== undefined) {
    const maxAllowed = getGradeComponentMax(request.gradeComponent);
    const clampedScore = Math.max(0, Math.min(maxAllowed, Number(finalScore) || 0));

    const existingGradeIdx = updatedGrades.findIndex(
      (g) => g.studentId === request.studentId && g.subjectId === request.subjectId
    );

    if (existingGradeIdx >= 0) {
      const current = updatedGrades[existingGradeIdx];
      const nextRecord: GradeRecord = {
        ...current,
        [request.gradeComponent]: clampedScore,
      };
      nextRecord.total = computeTotalScore({
        report: nextRecord.report,
        attendanceScore: nextRecord.attendanceScore,
        lab: nextRecord.lab,
        midterm: nextRecord.midterm,
        quiz: nextRecord.quiz,
      });
      updatedGrades[existingGradeIdx] = nextRecord;
    } else {
      const initial: GradeRecord = {
        docId: 'grd-appeal-' + Date.now(),
        studentId: request.studentId,
        subjectId: request.subjectId,
        report: 0,
        attendanceScore: 0,
        lab: 0,
        midterm: 0,
        quiz: 0,
        total: 0,
      };
      initial[request.gradeComponent] = clampedScore;
      initial.total = computeTotalScore(initial);
      updatedGrades.push(initial);
    }
  }

  return {
    updatedRequest,
    updatedAttendance,
    updatedGrades,
  };
}

export function rejectRequestInState(
  request: StudentRequest,
  professorNote?: string
): StudentRequest {
  return {
    ...request,
    status: 'مرفوض',
    professorNote: professorNote?.trim() || 'تم رفض الطلب لعدم استيفاء الضوابط الأكاديمية',
    resolvedAt: new Date().toISOString().split('T')[0],
  };
}

export function countRequestsByStatus(requests: StudentRequest[]) {
  const list = requests || [];
  return {
    total: list.length,
    pending: list.filter((r) => r.status === 'قيد المراجعة').length,
    approved: list.filter((r) => r.status === 'مقبول').length,
    rejected: list.filter((r) => r.status === 'مرفوض').length,
    excuses: list.filter((r) => r.type === 'excuse').length,
    appeals: list.filter((r) => r.type === 'appeal').length,
  };
}

export function formatRequestResolutionTelegram(request: StudentRequest): string {
  const typeTitle =
    request.type === 'excuse' ? 'طلب إجازة / عذر غياب رسمي' : 'طلب اعتراض وتدقيق درجة سعي';
  const statusIcon =
    request.status === 'مقبول' ? '✅ مقبول' : request.status === 'مرفوض' ? '❌ مرفوض' : '⏳ قيد المراجعة';

  let details = '';
  if (request.type === 'excuse') {
    details = `<b>تاريخ الغياب:</b> ${request.absenceDate || '-'}\n<b>الأثر الأكاديمي:</b> تحويل حالة اليوم إلى (مجاز) ورفع الإنذار`;
  } else {
    details =
      `<b>مفردة التقييم:</b> ${getGradeComponentLabel(request.gradeComponent)}\n` +
      `<b>الدرجة السابقة:</b> ${request.currentScore ?? 0} ← <b>الدرجة المعتمدة:</b> ${request.requestedScore ?? 0}`;
  }

  return (
    `<b>📋 قرار رسمي بشأن طلب طالب أكاديمي</b>\n\n` +
    `<b>الطالب:</b> ${request.studentName} (${request.studentId})\n` +
    `<b>المادة:</b> ${request.subjectName}\n` +
    `<b>نوع الطلب:</b> ${typeTitle}\n` +
    `<b>القرار:</b> ${statusIcon}\n` +
    `${details}\n` +
    `<b>ملاحظة الأستاذ:</b> ${request.professorNote || '-'}`
  );
}
