export type ProfessorRoleType = 'ملاك دائم' | 'أستاذ ضيف';

export interface Professor {
  docId?: string;
  profCode?: string; // PRF-XXXXXX
  name: string;
  username: string;
  password?: string;
  department?: string;
  roleType?: ProfessorRoleType;
  qrCode?: string;
  isFrozen?: boolean;
}

export interface BarcodeCheckInEntry {
  studentId: string;
  studentName: string;
  department?: string;
  scannedAt: string;
  method: 'qr' | 'code' | 'direct';
}

export interface BarcodeSession {
  docId: string;
  sessionCode: string; // e.g. BAR-482910
  profCode: string;    // e.g. PRF-101842
  professorId: string;
  professorName: string;
  professorRole?: ProfessorRoleType;
  subjectId: string;
  subjectName: string;
  lectureTitle: string;
  room: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  durationMinutes: number;
  isActive: boolean;
  qrPayload: string;
  qrDataUrl?: string;
  registeredStudents: BarcodeCheckInEntry[];
}

export interface Student {
  docId?: string;
  id: string; // STU-XXXXXX
  name: string;
  level: string;
  department: string;
  phone: string;
  qrCode?: string;
}

export interface Subject {
  docId?: string;
  name: string;
  professorId: string;
}

export type AttendanceStatus = 'حاضر' | 'غائب' | 'مجاز';

export interface AttendanceRecord {
  docId?: string;
  studentId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface GradeRecord {
  docId?: string;
  studentId: string;
  subjectId: string;
  report: number;
  attendanceScore: number;
  lab: number;
  midterm: number;
  quiz: number;
  total: number;
}

export interface Lecture {
  docId?: string;
  subjectId: string;
  subjectName: string;
  title: string;
  fileUrl: string;
  notes?: string;
  date: string;
}

export interface Broadcast {
  docId?: string;
  message: string;
  target?: string;
  date: string;
}

export type DayOfWeek = 'السبت' | 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';
export type LectureType = 'نظري' | 'عملي' | 'امتحان';

export interface ScheduleSlot {
  docId?: string;
  subjectId: string;
  subjectName: string;
  professorName: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "10:30"
  room: string;      // e.g. "قاعة الخوارزمي الكبرى"
  type: LectureType;
  notes?: string;
}

export type RequestType = 'excuse' | 'appeal';
export type RequestStatus = 'قيد المراجعة' | 'مقبول' | 'مرفوض';
export type GradeComponentField = 'report' | 'attendanceScore' | 'lab' | 'midterm' | 'quiz';

export interface StudentRequest {
  docId?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  reason: string;
  // For 'excuse' (طلب إجازة أو عذر غياب رسمي)
  absenceDate?: string; // YYYY-MM-DD
  attachmentUrl?: string;
  // For 'appeal' (طلب اعتراض وتدقيق درجة سعي)
  gradeComponent?: GradeComponentField;
  currentScore?: number;
  requestedScore?: number;
  // Professor / Admin resolution
  professorNote?: string;
  resolvedAt?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  points: number;
  explanation?: string;
}

export interface Quiz {
  docId?: string;
  subjectId: string;
  subjectName: string;
  professorName: string;
  title: string;
  description?: string;
  durationMinutes: number;
  maxScore: number;
  isActive: boolean;
  autoSyncToGrades: boolean;
  createdAt: string;
  questions: QuizQuestion[];
}

export interface QuizSubmission {
  docId?: string;
  quizId: string;
  quizTitle: string;
  subjectId: string;
  subjectName: string;
  studentId: string;
  studentName: string;
  answers: number[];
  earnedScore: number;
  maxScore: number;
  normalizedQuizScore20: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  timeSpentSeconds: number;
  syncedToGrades: boolean;
}

export type ClearanceDepartmentKey =
  | 'finance'
  | 'library'
  | 'labs'
  | 'examination'
  | 'student_affairs';

export type ClearanceStepStatus = 'مكتمل' | 'قيد المراجعة' | 'معلق - ذمة';

export interface ClearanceDepartmentApproval {
  key: ClearanceDepartmentKey;
  departmentTitle: string;
  officerName: string;
  status: ClearanceStepStatus;
  note?: string;
  updatedAt: string;
}

export interface StudentClearance {
  docId: string;
  studentId: string;
  studentName: string;
  department: string;
  level: string;
  clearanceCode: string; // e.g. CLR-102941
  smartCardNumber: string; // e.g. UID-2026-102941
  bloodGroup: string;
  issueDate: string;
  expiryDate: string;
  departments: ClearanceDepartmentApproval[];
  overallStatus: 'مكتملة' | 'قيد الاستكمال' | 'معلقة لوجود ذمة';
  completionPercent: number;
  lastUpdated: string;
  qrPayload: string;
  qrDataUrl?: string;
}

export interface SystemSettings {
  telegramToken?: string;
  telegramChatId?: string;
}

export interface AuditLog {
  time: string;
  action: string;
}

export interface SystemData {
  professors: Professor[];
  students: Student[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  lectures: Lecture[];
  broadcasts: Broadcast[];
  schedule: ScheduleSlot[];
  requests: StudentRequest[];
  quizzes: Quiz[];
  quizSubmissions: QuizSubmission[];
  barcodeSessions?: BarcodeSession[];
  clearances?: StudentClearance[];
  settings: SystemSettings;
}

export type UserRole = 'admin' | 'professor' | 'student';

export interface CurrentUser {
  role: UserRole;
  docId?: string;
  id: string;
  name: string;
  username?: string;
  department?: string;
  level?: string;
  phone?: string;
  isFrozen?: boolean;
}


