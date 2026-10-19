import type {
  ClearanceDepartmentApproval,
  ClearanceDepartmentKey,
  ClearanceStepStatus,
  Student,
  StudentClearance,
} from '../types.ts';

export const CLEARANCE_DEPARTMENTS_CATALOG: Array<{
  key: ClearanceDepartmentKey;
  departmentTitle: string;
  officerName: string;
}> = [
  {
    key: 'finance',
    departmentTitle: 'شعبة الحسابات والمالية المركزية',
    officerName: 'أ. صادق الكعبي',
  },
  {
    key: 'library',
    departmentTitle: 'المكتبة المركزية والاستعارة العلمية',
    officerName: 'د. سنان الهاشمي',
  },
  {
    key: 'labs',
    departmentTitle: 'المختبرات العلمية وعُهدة الأجهزة',
    officerName: 'م.م. حيدر الموسوي',
  },
  {
    key: 'examination',
    departmentTitle: 'اللجنة الامتحانية والقسم العلمي',
    officerName: 'أ.د. علي الساعدي',
  },
  {
    key: 'student_affairs',
    departmentTitle: 'وحدة الهويات وشؤون الطلبة والتسجيل',
    officerName: 'أ. نورس العامري',
  },
];

export function generateClearanceCode(studentId: string): string {
  const digits = studentId.replace(/\D/g, '') || '100000';
  return `CLR-${digits.slice(-6).padStart(6, '0')}`;
}

export function generateSmartCardNumber(studentId: string): string {
  const digits = studentId.replace(/\D/g, '') || '100000';
  return `UID-2026-${digits.slice(-6).padStart(6, '0')}`;
}

export function buildClearanceQrPayload(params: {
  clearanceCode: string;
  smartCardNumber: string;
  studentId: string;
  studentName: string;
  department: string;
  overallStatus: string;
  completionPercent: number;
}): string {
  return JSON.stringify({
    type: 'ROYAL_UNI_SMART_ID_CLEARANCE',
    v: 1,
    clearanceCode: params.clearanceCode,
    smartCardNumber: params.smartCardNumber,
    studentId: params.studentId,
    studentName: params.studentName,
    department: params.department,
    status: params.overallStatus,
    percent: params.completionPercent,
  });
}

export function computeClearanceMetrics(departments: ClearanceDepartmentApproval[]): {
  completionPercent: number;
  overallStatus: 'مكتملة' | 'قيد الاستكمال' | 'معلقة لوجود ذمة';
  completedCount: number;
  blockedCount: number;
  pendingCount: number;
} {
  const total = departments.length || 1;
  const completedCount = departments.filter((d) => d.status === 'مكتمل').length;
  const blockedCount = departments.filter((d) => d.status === 'معلق - ذمة').length;
  const pendingCount = departments.filter((d) => d.status === 'قيد المراجعة').length;
  const completionPercent = Math.round((completedCount / total) * 100);

  let overallStatus: 'مكتملة' | 'قيد الاستكمال' | 'معلقة لوجود ذمة' = 'قيد الاستكمال';
  if (blockedCount > 0) {
    overallStatus = 'معلقة لوجود ذمة';
  } else if (completedCount === total) {
    overallStatus = 'مكتملة';
  }

  return {
    completionPercent,
    overallStatus,
    completedCount,
    blockedCount,
    pendingCount,
  };
}

export function createStudentClearanceRecord(
  student: Student,
  overrides?: Partial<{
    statuses: Record<ClearanceDepartmentKey, { status: ClearanceStepStatus; note?: string }>;
    bloodGroup: string;
  }>
): StudentClearance {
  const today = new Date().toISOString().split('T')[0];
  const clearanceCode = generateClearanceCode(student.id);
  const smartCardNumber = generateSmartCardNumber(student.id);

  const departments: ClearanceDepartmentApproval[] = CLEARANCE_DEPARTMENTS_CATALOG.map((cat) => {
    const custom = overrides?.statuses?.[cat.key];
    const status: ClearanceStepStatus = custom?.status || 'مكتمل';
    const defaultNote =
      status === 'مكتمل'
        ? 'بريء الذمة رسمياً — لا توجد التزامات معلقة'
        : status === 'معلق - ذمة'
        ? 'توجد عُهدة أو التزام يتطلب المراجعة'
        : 'بانتظار مصادقة مسؤول الشعبة';

    return {
      key: cat.key,
      departmentTitle: cat.departmentTitle,
      officerName: cat.officerName,
      status,
      note: custom?.note || defaultNote,
      updatedAt: today,
    };
  });

  const { completionPercent, overallStatus } = computeClearanceMetrics(departments);

  const qrPayload = buildClearanceQrPayload({
    clearanceCode,
    smartCardNumber,
    studentId: student.id,
    studentName: student.name,
    department: student.department,
    overallStatus,
    completionPercent,
  });

  return {
    docId: `clr-${student.id}`,
    studentId: student.id,
    studentName: student.name,
    department: student.department,
    level: student.level,
    clearanceCode,
    smartCardNumber,
    bloodGroup: overrides?.bloodGroup || 'O+',
    issueDate: '2026-09-01',
    expiryDate: '2027-08-31',
    departments,
    overallStatus,
    completionPercent,
    lastUpdated: today,
    qrPayload,
  };
}

export function updateClearanceDepartmentStep(
  record: StudentClearance,
  departmentKey: ClearanceDepartmentKey,
  newStatus: ClearanceStepStatus,
  note?: string
): StudentClearance {
  const today = new Date().toISOString().split('T')[0];
  const updatedDepartments = record.departments.map((d) => {
    if (d.key !== departmentKey) return d;
    const resolvedNote =
      note !== undefined && note.trim() !== ''
        ? note.trim()
        : newStatus === 'مكتمل'
        ? 'تمت المصادقة وإبراء الذمة إلكترونياً'
        : newStatus === 'معلق - ذمة'
        ? 'توجد ذمة معلقة تتطلب المراجعة'
        : 'قيد التدقيق والمراجعة من الشعبة المختصة';
    return {
      ...d,
      status: newStatus,
      note: resolvedNote,
      updatedAt: today,
    };
  });

  const { completionPercent, overallStatus } = computeClearanceMetrics(updatedDepartments);
  const qrPayload = buildClearanceQrPayload({
    clearanceCode: record.clearanceCode,
    smartCardNumber: record.smartCardNumber,
    studentId: record.studentId,
    studentName: record.studentName,
    department: record.department,
    overallStatus,
    completionPercent,
  });

  return {
    ...record,
    departments: updatedDepartments,
    overallStatus,
    completionPercent,
    lastUpdated: today,
    qrPayload,
  };
}

export function approveAllClearanceDepartments(
  record: StudentClearance,
  note?: string
): StudentClearance {
  const today = new Date().toISOString().split('T')[0];
  const updatedDepartments = record.departments.map((d) => ({
    ...d,
    status: 'مكتمل' as ClearanceStepStatus,
    note: note || 'تمت المصادقة الشاملة وإبراء الذمة الرقمية بنجاح',
    updatedAt: today,
  }));

  const { completionPercent, overallStatus } = computeClearanceMetrics(updatedDepartments);
  const qrPayload = buildClearanceQrPayload({
    clearanceCode: record.clearanceCode,
    smartCardNumber: record.smartCardNumber,
    studentId: record.studentId,
    studentName: record.studentName,
    department: record.department,
    overallStatus,
    completionPercent,
  });

  return {
    ...record,
    departments: updatedDepartments,
    overallStatus,
    completionPercent,
    lastUpdated: today,
    qrPayload,
  };
}
