import type {
  AttendanceRecord,
  BarcodeSession,
  Professor,
  ProfessorRoleType,
  Subject,
} from '../types.ts';

/**
 * Generates a deterministic or random unique Professor Barcode ID (e.g. PRF-104829)
 */
export function generateProfessorBarcodeId(seed?: string | number): string {
  if (seed !== undefined) {
    const str = String(seed);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 900000;
    }
    const code = 100000 + Math.abs(hash);
    return `PRF-${code}`;
  }
  const randomSix = Math.floor(100000 + Math.random() * 900000);
  return `PRF-${randomSix}`;
}

/**
 * Generates a unique 6-digit Barcode Session Code (e.g. BAR-482910)
 */
export function generateSessionBarcodeToken(seed?: string | number): string {
  if (seed !== undefined) {
    const str = String(seed);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 37 + str.charCodeAt(i)) % 900000;
    }
    const code = 100000 + Math.abs(hash);
    return `BAR-${code}`;
  }
  const randomSix = Math.floor(100000 + Math.random() * 900000);
  return `BAR-${randomSix}`;
}

/**
 * Builds the JSON payload encoded inside the Professor/Lecture QR barcode
 */
export function buildBarcodeQrPayload(params: {
  sessionCode: string;
  profCode: string;
  professorId: string;
  professorName: string;
  subjectId: string;
  subjectName: string;
  lectureTitle: string;
  room: string;
  date: string;
}): string {
  return JSON.stringify({
    type: 'PROFESSOR_LECTURE_BARCODE',
    sessionCode: params.sessionCode,
    profCode: params.profCode,
    professorId: params.professorId,
    professorName: params.professorName,
    subjectId: params.subjectId,
    subjectName: params.subjectName,
    lectureTitle: params.lectureTitle,
    room: params.room,
    date: params.date,
  });
}

/**
 * Creates a new BarcodeSession object ready to be stored in SystemData
 */
export function createBarcodeSessionObject(params: {
  professor: Professor;
  subject: Subject;
  lectureTitle: string;
  room: string;
  date?: string;
  durationMinutes?: number;
  sessionCode?: string;
  qrDataUrl?: string;
}): BarcodeSession {
  const today = params.date || new Date().toISOString().split('T')[0];
  const profCode = params.professor.profCode || generateProfessorBarcodeId(params.professor.username);
  const sessionCode = params.sessionCode || generateSessionBarcodeToken(`${profCode}-${params.subject.docId}-${Date.now()}`);
  const professorId = params.professor.docId || params.professor.username;
  const subjectId = params.subject.docId || 'sub-1';
  const roleType: ProfessorRoleType = params.professor.roleType || 'ملاك دائم';

  const qrPayload = buildBarcodeQrPayload({
    sessionCode,
    profCode,
    professorId,
    professorName: params.professor.name,
    subjectId,
    subjectName: params.subject.name,
    lectureTitle: params.lectureTitle,
    room: params.room,
    date: today,
  });

  return {
    docId: `bs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sessionCode,
    profCode,
    professorId,
    professorName: params.professor.name,
    professorRole: roleType,
    subjectId,
    subjectName: params.subject.name,
    lectureTitle: params.lectureTitle,
    room: params.room,
    date: today,
    createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    durationMinutes: params.durationMinutes || 45,
    isActive: true,
    qrPayload,
    qrDataUrl: params.qrDataUrl,
    registeredStudents: [],
  };
}

export interface BarcodeResolutionResult {
  matched: boolean;
  session?: BarcodeSession;
  subjectId?: string;
  subjectName?: string;
  professorName?: string;
  profCode?: string;
  errorMessage?: string;
}

/**
 * Resolves a scanned QR string, Session Code (BAR-XXXXXX), Professor Barcode (PRF-XXXXXX),
 * or raw 6-digit PIN against active barcode sessions and professors/subjects.
 */
export function resolveScannedProfessorBarcode(
  rawInput: string,
  sessions: BarcodeSession[],
  professors: Professor[],
  subjects: Subject[]
): BarcodeResolutionResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      matched: false,
      errorMessage: 'يرجى إدخال أو مسح كود باركود الأستاذ أو رمز الجلسة.',
    };
  }

  // 1. Try parsing JSON QR payload
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.sessionCode) {
        const foundSession = sessions.find(
          (s) => s.sessionCode.toLowerCase() === String(parsed.sessionCode).toLowerCase()
        );
        if (foundSession) {
          if (!foundSession.isActive) {
            return {
              matched: false,
              errorMessage: 'جلسة الباركود هذه مغلقة حالياً من قبل أستاذ المادة.',
            };
          }
          return {
            matched: true,
            session: foundSession,
            subjectId: foundSession.subjectId,
            subjectName: foundSession.subjectName,
            professorName: foundSession.professorName,
            profCode: foundSession.profCode,
          };
        }
      }
      if (parsed.subjectId) {
        return {
          matched: true,
          subjectId: parsed.subjectId,
          subjectName: parsed.subjectName || 'مقرر دراسي',
          professorName: parsed.professorName || 'أستاذ المادة',
          profCode: parsed.profCode || 'PRF-DIRECT',
        };
      }
    } catch {
      // Fall through to code matching
    }
  }

  const normalized = trimmed.toUpperCase();

  // 2. Match by Session Code (e.g. BAR-482910 or 482910)
  const matchedBySession = sessions.find(
    (s) =>
      s.sessionCode.toUpperCase() === normalized ||
      s.sessionCode.replace(/^BAR-/i, '') === normalized
  );

  if (matchedBySession) {
    if (!matchedBySession.isActive) {
      return {
        matched: false,
        errorMessage: 'جلسة الباركود هذه مغلقة حالياً من قبل أستاذ المادة.',
      };
    }
    return {
      matched: true,
      session: matchedBySession,
      subjectId: matchedBySession.subjectId,
      subjectName: matchedBySession.subjectName,
      professorName: matchedBySession.professorName,
      profCode: matchedBySession.profCode,
    };
  }

  // 3. Match by Professor Barcode ID (e.g. PRF-101842 or active session for that professor)
  const activeSessionByProfCode = sessions.find(
    (s) =>
      s.isActive &&
      (s.profCode.toUpperCase() === normalized ||
        s.profCode.replace(/^PRF-/i, '') === normalized ||
        s.professorId.toUpperCase() === normalized)
  );

  if (activeSessionByProfCode) {
    return {
      matched: true,
      session: activeSessionByProfCode,
      subjectId: activeSessionByProfCode.subjectId,
      subjectName: activeSessionByProfCode.subjectName,
      professorName: activeSessionByProfCode.professorName,
      profCode: activeSessionByProfCode.profCode,
    };
  }

  // 4. Match Professor directly from professors list if they have an assigned subject
  const matchedProf = professors.find(
    (p) =>
      p.profCode?.toUpperCase() === normalized ||
      p.profCode?.replace(/^PRF-/i, '') === normalized ||
      p.username.toUpperCase() === normalized ||
      p.docId?.toUpperCase() === normalized
  );

  if (matchedProf) {
    const profSubject = subjects.find(
      (sub) => sub.professorId === matchedProf.docId || sub.professorId === matchedProf.username
    );
    if (profSubject) {
      return {
        matched: true,
        subjectId: profSubject.docId || 'sub-1',
        subjectName: profSubject.name,
        professorName: matchedProf.name,
        profCode: matchedProf.profCode || generateProfessorBarcodeId(matchedProf.username),
      };
    }
  }

  return {
    matched: false,
    errorMessage: 'لم يتم العثور على باركود أستاذ أو جلسة محاضرة مطابقة لهذا الرمز.',
  };
}

/**
 * Registers a student into a BarcodeSession and updates/adds the corresponding AttendanceRecord
 */
export function applyStudentBarcodeCheckIn(params: {
  studentId: string;
  studentName: string;
  studentDepartment?: string;
  resolution: BarcodeResolutionResult;
  sessions: BarcodeSession[];
  attendance: AttendanceRecord[];
  method?: 'qr' | 'code' | 'direct';
  dateOverride?: string;
}): {
  alreadyRegistered: boolean;
  updatedSessions: BarcodeSession[];
  updatedAttendance: AttendanceRecord[];
  checkInTime: string;
} {
  const {
    studentId,
    studentName,
    studentDepartment,
    resolution,
    sessions,
    attendance,
    method = 'qr',
  } = params;

  const targetDate =
    params.dateOverride ||
    resolution.session?.date ||
    new Date().toISOString().split('T')[0];
  const targetSubjectId = resolution.subjectId || resolution.session?.subjectId || 'sub-1';
  const checkInTime = new Date().toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const alreadyInSession = resolution.session
    ? resolution.session.registeredStudents.some((st) => st.studentId === studentId)
    : false;

  const existingAttendance = attendance.find(
    (r) =>
      r.studentId === studentId &&
      r.subjectId === targetSubjectId &&
      r.date === targetDate &&
      r.status === 'حاضر'
  );

  const alreadyRegistered = alreadyInSession && Boolean(existingAttendance);

  // Update sessions
  const updatedSessions = sessions.map((s) => {
    if (resolution.session && s.docId === resolution.session.docId) {
      const exists = s.registeredStudents.some((st) => st.studentId === studentId);
      if (exists) return s;
      return {
        ...s,
        registeredStudents: [
          {
            studentId,
            studentName,
            department: studentDepartment,
            scannedAt: checkInTime,
            method,
          },
          ...s.registeredStudents,
        ],
      };
    }
    return s;
  });

  // Update attendance records (set status to 'حاضر' or insert new record)
  const otherAttendance = attendance.filter(
    (r) => !(r.studentId === studentId && r.subjectId === targetSubjectId && r.date === targetDate)
  );

  const newRecord: AttendanceRecord = {
    docId: existingAttendance?.docId || `att-qr-${Date.now()}`,
    studentId,
    subjectId: targetSubjectId,
    date: targetDate,
    status: 'حاضر',
  };

  return {
    alreadyRegistered,
    updatedSessions,
    updatedAttendance: [...otherAttendance, newRecord],
    checkInTime,
  };
}
