import type {
  AttendanceRecord,
  GradeRecord,
  Student,
  Subject,
} from '../types.ts';
import { computeAttendanceStats } from './attendance.ts';
import { computeTotalScore, getArabicGradeTitle, isEligibleForHonors } from './grading.ts';

export interface CourseTranscriptRow {
  subjectId: string;
  subjectName: string;
  creditHours: number;
  report: number;
  attendanceScore: number;
  lab: number;
  midterm: number;
  quiz: number;
  total: number;
  gradeTitle: string;
  gpaPoints: number;
  attendanceRate: number;
  absenceRate: number;
  absenceWarningLevel: 'none' | 'warning' | 'critical';
  passed: boolean;
}

export interface StudentTranscriptSummary {
  studentId: string;
  studentName: string;
  department: string;
  level: string;
  verificationCode: string;
  issuedDate: string;
  courses: CourseTranscriptRow[];
  cumulativeAverage: number;
  gpa4: number;
  totalCreditsAttempted: number;
  totalCreditsEarned: number;
  overallAttendanceRate: number;
  academicStanding: 'مرتبة الشرف الأولى' | 'مرتبة الشرف' | 'ناجح' | 'تحت الملاحظة الأكاديمية';
  isHonorRoll: boolean;
}

export interface StudentRankEntry {
  rank: number;
  student: Student;
  cumulativeAverage: number;
  gpa4: number;
  overallAttendanceRate: number;
  academicStanding: StudentTranscriptSummary['academicStanding'];
  isHonorRoll: boolean;
  passedCoursesCount: number;
  totalCoursesCount: number;
}

export type RiskSeverity = 'critical' | 'warning';
export type RiskCategory = 'absence' | 'grade' | 'both';

export interface EarlyWarningAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  department: string;
  level: string;
  subjectId: string;
  subjectName: string;
  category: RiskCategory;
  severity: RiskSeverity;
  totalScore: number;
  absenceRate: number;
  absentCount: number;
  totalLectures: number;
  reasonSummary: string;
  recommendedAction: string;
}

/**
 * Converts a 0-100 score into a standard 4.00 GPA scale value.
 */
export function scoreToGpa4(score: number): number {
  const s = Number(score) || 0;
  if (s >= 90) return 4.0;
  if (s >= 85) return 3.7;
  if (s >= 80) return 3.3;
  if (s >= 75) return 3.0;
  if (s >= 70) return 2.7;
  if (s >= 65) return 2.3;
  if (s >= 60) return 2.0;
  if (s >= 50) return 1.5;
  return 0.0;
}

/**
 * Deterministic credit hour assignment for university subjects (3 or 4 credits).
 */
export function getSubjectCreditHours(subjectName: string, index: number): number {
  if (
    subjectName.includes('ذكاء') ||
    subjectName.includes('خوارزميات') ||
    subjectName.includes('برمجيات')
  ) {
    return 4;
  }
  return index % 2 === 0 ? 4 : 3;
}

/**
 * Generates a deterministic official verification serial for a student's transcript.
 */
export function generateVerificationCode(studentId: string): string {
  const digits = studentId.replace(/\D/g, '') || '100000';
  const checksum = digits
    .split('')
    .reduce((acc, ch, idx) => acc + Number(ch) * (idx + 3), 0);
  return `TRN-2026-${digits.slice(-4)}-${String(checksum).padStart(3, '0')}`;
}

/**
 * Builds the complete official academic transcript for a given student.
 */
export function computeStudentTranscript(
  student: Student,
  subjects: Subject[],
  grades: GradeRecord[],
  attendance: AttendanceRecord[],
  issuedDate = '2026-10-19'
): StudentTranscriptSummary {
  const courses: CourseTranscriptRow[] = (subjects || []).map((sub, idx) => {
    const subId = sub.docId || sub.name;
    const creditHours = getSubjectCreditHours(sub.name, idx);
    const gradeRec = (grades || []).find(
      (g) => g.studentId === student.id && g.subjectId === subId
    );

    const report = Number(gradeRec?.report) || 0;
    const attendanceScore = Number(gradeRec?.attendanceScore) || 0;
    const lab = Number(gradeRec?.lab) || 0;
    const midterm = Number(gradeRec?.midterm) || 0;
    const quiz = Number(gradeRec?.quiz) || 0;
    const total =
      gradeRec?.total !== undefined
        ? Number(gradeRec.total)
        : computeTotalScore({ report, attendanceScore, lab, midterm, quiz });

    const subAttendance = (attendance || []).filter(
      (a) => a.studentId === student.id && a.subjectId === subId
    );
    const attStats = computeAttendanceStats(subAttendance);
    const attendanceRate =
      attStats.totalLectures > 0 ? Math.max(0, 100 - attStats.absenceRate) : 100;

    return {
      subjectId: subId,
      subjectName: sub.name,
      creditHours,
      report,
      attendanceScore,
      lab,
      midterm,
      quiz,
      total,
      gradeTitle: getArabicGradeTitle(total),
      gpaPoints: scoreToGpa4(total),
      attendanceRate,
      absenceRate: attStats.absenceRate,
      absenceWarningLevel: attStats.warningLevel,
      passed: total >= 50 && attStats.warningLevel !== 'critical',
    };
  });

  const totalCreditsAttempted = courses.reduce((sum, c) => sum + c.creditHours, 0);
  const totalCreditsEarned = courses
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.creditHours, 0);

  const weightedScoreSum = courses.reduce((sum, c) => sum + c.total * c.creditHours, 0);
  const weightedGpaSum = courses.reduce((sum, c) => sum + c.gpaPoints * c.creditHours, 0);

  const cumulativeAverage =
    totalCreditsAttempted > 0
      ? Number((weightedScoreSum / totalCreditsAttempted).toFixed(1))
      : 0;
  const gpa4 =
    totalCreditsAttempted > 0
      ? Number((weightedGpaSum / totalCreditsAttempted).toFixed(2))
      : 0;

  const overallAttendanceRate =
    courses.length > 0
      ? Math.round(
          courses.reduce((sum, c) => sum + c.attendanceRate, 0) / courses.length
        )
      : 100;

  const hasCriticalAbsence = courses.some((c) => c.absenceWarningLevel === 'critical');
  const hasFailedCourse = courses.some((c) => c.total < 50);

  let academicStanding: StudentTranscriptSummary['academicStanding'] = 'ناجح';
  if (hasFailedCourse || hasCriticalAbsence || cumulativeAverage < 60) {
    academicStanding = 'تحت الملاحظة الأكاديمية';
  } else if (cumulativeAverage >= 90 && overallAttendanceRate >= 90) {
    academicStanding = 'مرتبة الشرف الأولى';
  } else if (isEligibleForHonors(cumulativeAverage) && overallAttendanceRate >= 85) {
    academicStanding = 'مرتبة الشرف';
  }

  const isHonorRoll =
    !hasFailedCourse &&
    !hasCriticalAbsence &&
    isEligibleForHonors(cumulativeAverage) &&
    overallAttendanceRate >= 85;

  return {
    studentId: student.id,
    studentName: student.name,
    department: student.department,
    level: student.level,
    verificationCode: generateVerificationCode(student.id),
    issuedDate,
    courses,
    cumulativeAverage,
    gpa4,
    totalCreditsAttempted,
    totalCreditsEarned,
    overallAttendanceRate,
    academicStanding,
    isHonorRoll,
  };
}

/**
 * Ranks all students by cumulative average (tie-broken by overall attendance rate).
 */
export function computeHonorRollAndRankings(
  students: Student[],
  subjects: Subject[],
  grades: GradeRecord[],
  attendance: AttendanceRecord[]
): StudentRankEntry[] {
  const entries = (students || []).map((student) => {
    const transcript = computeStudentTranscript(student, subjects, grades, attendance);
    const passedCoursesCount = transcript.courses.filter((c) => c.passed).length;
    return {
      rank: 0,
      student,
      cumulativeAverage: transcript.cumulativeAverage,
      gpa4: transcript.gpa4,
      overallAttendanceRate: transcript.overallAttendanceRate,
      academicStanding: transcript.academicStanding,
      isHonorRoll: transcript.isHonorRoll,
      passedCoursesCount,
      totalCoursesCount: transcript.courses.length,
    };
  });

  entries.sort((a, b) => {
    if (b.cumulativeAverage !== a.cumulativeAverage) {
      return b.cumulativeAverage - a.cumulativeAverage;
    }
    return b.overallAttendanceRate - a.overallAttendanceRate;
  });

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

/**
 * Scans all student-course records to detect early academic or attendance risk.
 */
export function computeEarlyWarningRadar(
  students: Student[],
  subjects: Subject[],
  grades: GradeRecord[],
  attendance: AttendanceRecord[]
): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];

  for (const student of students || []) {
    for (const sub of subjects || []) {
      const subId = sub.docId || sub.name;
      const gradeRec = (grades || []).find(
        (g) => g.studentId === student.id && g.subjectId === subId
      );
      const totalScore =
        gradeRec?.total !== undefined
          ? Number(gradeRec.total)
          : gradeRec
          ? computeTotalScore(gradeRec)
          : 0;

      const subAtt = (attendance || []).filter(
        (a) => a.studentId === student.id && a.subjectId === subId
      );
      const attStats = computeAttendanceStats(subAtt);

      const hasAbsenceRisk = attStats.warningLevel !== 'none';
      const hasGradeRisk = gradeRec !== undefined && totalScore < 65;

      if (!hasAbsenceRisk && !hasGradeRisk) continue;

      let category: RiskCategory = 'grade';
      if (hasAbsenceRisk && hasGradeRisk) {
        category = 'both';
      } else if (hasAbsenceRisk) {
        category = 'absence';
      }

      const isCritical =
        attStats.warningLevel === 'critical' || (gradeRec !== undefined && totalScore < 50);
      const severity: RiskSeverity = isCritical ? 'critical' : 'warning';

      const reasons: string[] = [];
      if (hasAbsenceRisk) {
        reasons.push(
          `نسبة الغياب ${attStats.absenceRate}% (${attStats.absent} غياب من ${attStats.totalLectures})`
        );
      }
      if (hasGradeRisk) {
        reasons.push(`مجموع السعي والدرجة ${totalScore}/100 (${getArabicGradeTitle(totalScore)})`);
      }

      let recommendedAction = 'متابعة دورية من أستاذ المادة';
      if (category === 'both') {
        recommendedAction = 'استدعاء إرشاد أكاديمي عاجل + إنذار غياب رسمي';
      } else if (category === 'absence') {
        recommendedAction =
          attStats.warningLevel === 'critical'
            ? 'إصدار إنذار غياب نهائي قبل الحرمان'
            : 'إرسال تنبيه مواظبة أولي للطالب';
      } else {
        recommendedAction =
          totalScore < 50
            ? 'تكليف بنشاط تعويضي ومراجعة المكتب الاستشاري'
            : 'توجيه الطالب لرفع درجة الكويز أو التقرير';
      }

      alerts.push({
        id: `${student.id}-${subId}`,
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.phone || '-',
        department: student.department,
        level: student.level,
        subjectId: subId,
        subjectName: sub.name,
        category,
        severity,
        totalScore,
        absenceRate: attStats.absenceRate,
        absentCount: attStats.absent,
        totalLectures: attStats.totalLectures,
        reasonSummary: reasons.join(' · '),
        recommendedAction,
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    if (b.absenceRate !== a.absenceRate) {
      return b.absenceRate - a.absenceRate;
    }
    return a.totalScore - b.totalScore;
  });
}

/**
 * Formats an official Telegram notification for an Early-Warning Radar alert.
 */
export function formatEarlyWarningTelegram(alert: EarlyWarningAlert): string {
  const badge =
    alert.severity === 'critical' ? '🚨 إنذار أكاديمي عاجل' : '⚠️ تنبيه متابعة أكاديمية';
  return `${badge}
👤 الطالب: ${alert.studentName} (${alert.studentId})
📘 المقرر: ${alert.subjectName}
📊 الحالة المرصودة: ${alert.reasonSummary}
📌 الإجراء المعتمد: ${alert.recommendedAction}`;
}
