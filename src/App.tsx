import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  User,
  Users,
  BookOpen,
  Calendar,
  Scale,
  Clock,
  ShieldAlert,
  QrCode,
  Settings,
  LogOut,
  ArrowRight,
  FileCheck2,
  Cloud,
  Share2,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  AuditLog,
  BarcodeSession,
  ClearanceDepartmentKey,
  ClearanceStepStatus,
  CurrentUser,
  Lecture,
  Professor,
  Quiz,
  QuizSubmission,
  Student,
  StudentClearance,
  Subject,
  SystemData,
  AttendanceRecord,
  GradeRecord,
  Broadcast,
  ScheduleSlot,
  StudentRequest,
  SystemSettings,
} from './types.ts';
import {
  getInitialSeedData,
  loadStoredData,
  saveStoredData,
  getDefaultClearances,
} from './utils/storage.ts';
import { sendTelegramNotification } from './utils/telegram.ts';
import {
  applyApprovedRequestToState,
  rejectRequestInState,
  formatRequestResolutionTelegram,
} from './utils/requests.ts';
import { evaluateQuizSubmission } from './utils/quizzes.ts';
import {
  createBarcodeSessionObject,
  generateProfessorBarcodeId,
  resolveScannedProfessorBarcode,
  applyStudentBarcodeCheckIn,
} from './utils/barcode.ts';
import {
  createStudentClearanceRecord,
  updateClearanceDepartmentStep,
  approveAllClearanceDepartments,
} from './utils/clearance.ts';
import { decodeProfessorInvitePayload } from './utils/professorShare.ts';
import {
  subscribeToAuthChanges,
  signInWithGoogleCloud,
  signOutFromGoogleCloud,
  saveSystemSnapshotToCloud,
  loadSystemSnapshotFromCloud,
  syncClearanceRecordToCloud,
  testFirestoreConnection,
} from './utils/firebase.ts';
import { generateQRCodeDataUrl } from './utils/qr.ts';
import { AcademicBackground } from './components/AcademicBackground.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { BroadcastManager } from './components/BroadcastManager.tsx';
import { ProfessorsManager } from './components/ProfessorsManager.tsx';
import { StudentsManager } from './components/StudentsManager.tsx';
import { SubjectsManager } from './components/SubjectsManager.tsx';
import { AdminSettings } from './components/AdminSettings.tsx';
import { ProfessorAttendance } from './components/ProfessorAttendance.tsx';
import { ProfessorGrades } from './components/ProfessorGrades.tsx';
import { ProfessorLectures } from './components/ProfessorLectures.tsx';
import { ProfessorRequestsManager } from './components/ProfessorRequestsManager.tsx';
import { ProfessorQuizzesManager } from './components/ProfessorQuizzesManager.tsx';
import { ProfessorBarcodeHub } from './components/ProfessorBarcodeHub.tsx';
import { ClearanceManager } from './components/ClearanceManager.tsx';
import { CloudSyncPanel } from './components/CloudSyncPanel.tsx';
import { AcademicRadarPanel } from './components/AcademicRadarPanel.tsx';
import { ExportReports } from './components/ExportReports.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { CalendarTimeline } from './components/CalendarTimeline.tsx';
import { Toast } from './components/Toast.tsx';

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<SystemData>({
    professors: [],
    students: [],
    subjects: [],
    attendance: [],
    grades: [],
    lectures: [],
    broadcasts: [],
    schedule: [],
    requests: [],
    quizzes: [],
    quizSubmissions: [],
    clearances: [],
    settings: {},
  });
  const [loading, setLoading] = useState(true);

  // Cloud Sync & Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [cloudConnected, setCloudConnected] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState<number>(1);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active Navigation
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [profTab, setProfTab] = useState<
    | 'barcode'
    | 'clearance'
    | 'attendance'
    | 'grades'
    | 'quizzes'
    | 'lectures'
    | 'requests'
    | 'reports'
    | 'schedule'
  >('barcode');
  const [studentInitialTab, setStudentInitialTab] = useState<
    'overview' | 'schedule' | 'requests' | 'quizzes' | 'transcript' | 'barcode' | 'clearance'
  >('overview');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Toast & Audit Logs
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      time: new Date().toLocaleTimeString('ar-IQ'),
      action:
        'إقلاع المنظومة الأكاديمية وتفعيل نظام براءة الذمة الرقمية والمزامنة السحابية عبر Firebase Firestore',
    },
  ]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const addLog = (action: string) => {
    setAuditLogs((prev) => [
      { time: new Date().toLocaleTimeString('ar-IQ'), action },
      ...prev.slice(0, 30),
    ]);
  };

  // Load Initial or Stored Data & Firebase Connection
  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.emailVerified) {
        try {
          const remote = await loadSystemSnapshotFromCloud();
          if (remote && remote.data && remote.data.students?.length > 0) {
            const hydrated: SystemData = {
              ...remote.data,
              clearances:
                remote.data.clearances && remote.data.clearances.length > 0
                  ? remote.data.clearances
                  : getDefaultClearances(remote.data.students),
            };
            setData(hydrated);
            saveStoredData(hydrated);
            setSyncVersion(remote.version);
            setLastSyncedAt(new Date().toLocaleTimeString('ar-IQ'));
          }
        } catch (err) {
          console.warn('Cloud snapshot load skipped:', err);
        }
      }
    });

    testFirestoreConnection().then((ok) => setCloudConnected(ok));

    const init = async () => {
      const stored = loadStoredData();
      let activeData: SystemData;
      if (stored && stored.students && stored.students.length > 0) {
        if (!stored.clearances || stored.clearances.length === 0) {
          stored.clearances = getDefaultClearances(stored.students);
        }
        activeData = stored;
        setData(stored);
      } else {
        const seeded = await getInitialSeedData();
        activeData = seeded;
        setData(seeded);
        saveStoredData(seeded);
      }

      // Support ?autostart=1 or ?role=admin|professor|student&tab=schedule&prof=username&invite=token
      const params = new URLSearchParams(window.location.search);
      const profParam = params.get('prof');
      const inviteParam = params.get('invite');
      const roleParam =
        params.get('role') ||
        (profParam || inviteParam ? 'professor' : null) ||
        (params.get('autostart') === '1' ? 'admin' : null);
      const tabParam = params.get('tab');

      // If an encrypted professor invite payload is present, hydrate it into activeData
      if (inviteParam) {
        const invited = decodeProfessorInvitePayload(inviteParam);
        if (invited) {
          const existsProf = (activeData.professors || []).some(
            (p) => p.username === invited.username || p.docId === invited.docId
          );
          if (!existsProf) {
            const newProf: Professor = {
              docId: invited.docId,
              profCode: invited.profCode,
              name: invited.name,
              username: invited.username,
              password: invited.password || '123',
              department: invited.department,
              roleType: invited.roleType,
              isFrozen: false,
            };
            const newSub: Subject = {
              docId: `sub-${invited.username}`,
              name: invited.subjectName || `مقرر ${invited.name}`,
              professorId: invited.docId,
            };
            const newSession = createBarcodeSessionObject({
              professor: newProf,
              subject: newSub,
              lectureTitle: invited.lectureTitle || `محاضرة الأستاذ ${invited.name}`,
              room: 'قاعة الخوارزمي الكبرى (Hall A)',
              durationMinutes: 90,
            });
            activeData = {
              ...activeData,
              professors: [...(activeData.professors || []), newProf],
              subjects: [...(activeData.subjects || []), newSub],
              barcodeSessions: [newSession, ...(activeData.barcodeSessions || [])],
            };
            setData(activeData);
            saveStoredData(activeData);
          }
        }
      }

      if (roleParam === 'admin') {
        setUser({
          role: 'admin',
          docId: 'admin',
          id: 'admin',
          name: 'إدارة النظام المركزية العليا',
        });
        if (tabParam) setAdminTab(tabParam);
      } else if (roleParam === 'professor') {
        const q = profParam?.trim().toLowerCase() || '';
        const matchedProf =
          (q
            ? activeData.professors.find(
                (p) =>
                  p.username.toLowerCase() === q ||
                  p.docId?.toLowerCase() === q ||
                  p.profCode?.toLowerCase() === q ||
                  p.name.toLowerCase().includes(q)
              )
            : null) || activeData.professors[0];

        if (matchedProf) {
          setUser({
            role: 'professor',
            docId: matchedProf.docId,
            id: matchedProf.docId || 'prof-1',
            name: matchedProf.name,
            username: matchedProf.username,
          });
          const profSub =
            activeData.subjects.find(
              (s) => s.professorId === matchedProf.docId || s.professorId === matchedProf.username
            ) || activeData.subjects[0];
          if (profSub) {
            setSelectedSubject(profSub);
          }
          if (tabParam) setProfTab(tabParam as any);
        }
      } else if (roleParam === 'student') {
        const firstStu = activeData.students[0];
        if (firstStu) {
          setUser({
            role: 'student',
            docId: firstStu.docId,
            id: firstStu.id,
            name: firstStu.name,
            department: firstStu.department,
            level: firstStu.level,
            phone: firstStu.phone,
          });
          if (
            tabParam === 'schedule' ||
            tabParam === 'requests' ||
            tabParam === 'quizzes' ||
            tabParam === 'transcript' ||
            tabParam === 'barcode' ||
            tabParam === 'clearance' ||
            tabParam === 'overview'
          ) {
            setStudentInitialTab(tabParam);
          }
        }
      }

      setLoading(false);
    };
    init();

    return () => {
      unsubAuth();
    };
  }, []);

  const updateAndPersist = (newData: SystemData) => {
    setData(newData);
    saveStoredData(newData);
    if (firebaseUser && firebaseUser.emailVerified) {
      saveSystemSnapshotToCloud(newData, syncVersion + 1)
        .then((res) => {
          setLastSyncedAt(res.syncedAt);
          setSyncVersion((v) => v + 1);
        })
        .catch((err) => {
          console.warn('Auto cloud sync deferred:', err);
        });
    }
  };

  // Cloud Sync Handlers
  const handleGoogleSignIn = async () => {
    try {
      const fbUser = await signInWithGoogleCloud();
      setFirebaseUser(fbUser);
      addLog(`ربط الحساب السحابي Google: ${fbUser.email}`);
      showToast(`تم ربط الحساب السحابي (${fbUser.email}) بقاعدة بيانات Firestore!`);
    } catch (err) {
      showToast('تعذر إكمال تسجيل الدخول بحساب Google، يرجى المحاولة مجدداً', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutFromGoogleCloud();
    setFirebaseUser(null);
    showToast('تم فصل الحساب السحابي مع الاحتفاظ بالبيانات المحلية');
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await saveSystemSnapshotToCloud(data, syncVersion + 1);
      setLastSyncedAt(res.syncedAt);
      setSyncVersion((v) => v + 1);
      addLog(`مزامنة سحابية فورية ناجحة مع Firestore (${res.syncedAt})`);
      showToast('تم حفظ ومزامنة كافة سجلات الجامعة على السحابة بنجاح!');
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء المزامنة مع السحابة', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    try {
      const remote = await loadSystemSnapshotFromCloud();
      if (remote && remote.data) {
        setData(remote.data);
        saveStoredData(remote.data);
        setSyncVersion(remote.version);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-IQ'));
        addLog('استرجاع أحدث نسخة سحابية من قاعدة بيانات Firestore');
        showToast('تم استرجاع وتحديث البيانات من السحابة بنجاح!');
      } else {
        showToast('لا توجد نسخة سحابية سابقة، يمكنك رفع النسخة الحالية أولاً');
      }
    } catch (err) {
      showToast('تعذر استرجاع النسخة السحابية حالياً', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Digital Clearance & Smart University ID Handlers
  const handleUpdateClearanceStep = (
    studentId: string,
    departmentKey: ClearanceDepartmentKey,
    status: ClearanceStepStatus,
    note?: string
  ) => {
    const currentList = data.clearances || getDefaultClearances(data.students);
    let updatedRecord: StudentClearance | null = null;
    const nextList = currentList.map((rec) => {
      if (rec.studentId !== studentId) return rec;
      updatedRecord = updateClearanceDepartmentStep(rec, departmentKey, status, note);
      return updatedRecord;
    });

    updateAndPersist({ ...data, clearances: nextList });
    if (updatedRecord) {
      syncClearanceRecordToCloud(updatedRecord).catch(() => {});
      addLog(
        `تحديث براءة ذمة الطالب (${ (updatedRecord as StudentClearance).studentName }) — الحالة العامة: ${(updatedRecord as StudentClearance).overallStatus} (${(updatedRecord as StudentClearance).completionPercent}%)`
      );
      showToast(
        `تم تحديث مصادقة الشعبة للطالب ${(updatedRecord as StudentClearance).studentName} (${(updatedRecord as StudentClearance).completionPercent}%)`
      );
    }
  };

  const handleApproveAllClearance = (studentId: string) => {
    const currentList = data.clearances || getDefaultClearances(data.students);
    let updatedRecord: StudentClearance | null = null;
    const nextList = currentList.map((rec) => {
      if (rec.studentId !== studentId) return rec;
      updatedRecord = approveAllClearanceDepartments(rec);
      return updatedRecord;
    });

    updateAndPersist({ ...data, clearances: nextList });
    if (updatedRecord) {
      syncClearanceRecordToCloud(updatedRecord).catch(() => {});
      addLog(
        `اعتماد براءة الذمة الرقمية الكاملة (100%) للطالب ${(updatedRecord as StudentClearance).studentName} (${(updatedRecord as StudentClearance).clearanceCode})`
      );
      showToast(
        `تم اعتماد براءة الذمة الرقمية الكاملة (100%) للطالب ${(updatedRecord as StudentClearance).studentName}!`
      );
    }
  };

  const handleStudentRequestClearanceReview = (studentId: string, note: string) => {
    const currentList = data.clearances || getDefaultClearances(data.students);
    const target = currentList.find((c) => c.studentId === studentId);
    addLog(
      `طلب تدقيق براءة ذمة إلكتروني من الطالب ${target?.studentName || studentId}: ${note.slice(0, 45)}`
    );
    showToast('تم إرسال طلب تدقيق براءة الذمة إلى الشعب المعنية والإدارة المركزية!');
  };

  // Admin Data Actions
  const handleAddBroadcast = (b: Omit<Broadcast, 'docId'>) => {
    const item: Broadcast = { ...b, docId: 'bc-' + Date.now() };
    const updated = { ...data, broadcasts: [item, ...(data.broadcasts || [])] };
    updateAndPersist(updated);
    addLog(`نشر أمر إداري جديد: ${b.message.slice(0, 35)}...`);
    showToast('تم نشر التعميم الإداري بنجاح!');
  };

  const handleDeleteBroadcast = (docId: string) => {
    const updated = {
      ...data,
      broadcasts: (data.broadcasts || []).filter((b) => b.docId !== docId),
    };
    updateAndPersist(updated);
    addLog('حذف تعميم إداري');
    showToast('تم حذف التعميم');
  };

  const handleAddProfessor = async (
    p: Omit<Professor, 'docId'>,
    initialSubjectName?: string,
    initialLectureTitle?: string
  ) => {
    const newProfId = 'prof-' + Date.now();
    const profCode = p.profCode || generateProfessorBarcodeId(p.username);
    const item: Professor = { ...p, docId: newProfId, profCode };

    const subjectNameToUse =
      initialSubjectName?.trim() || `مقرر ومحاضرات ${p.name}`;
    const newSubject: Subject = {
      docId: 'sub-' + Date.now(),
      name: subjectNameToUse,
      professorId: newProfId,
    };

    const initialSession = createBarcodeSessionObject({
      professor: item,
      subject: newSubject,
      lectureTitle:
        initialLectureTitle?.trim() ||
        `محاضرة ${p.name} (${p.roleType || 'أستاذ ضيف'}) — التسجيل بالباركود`,
      room: 'قاعة الخوارزمي الكبرى (Hall A)',
      durationMinutes: 60,
    });
    initialSession.qrDataUrl = await generateQRCodeDataUrl(initialSession.qrPayload);

    const updated: SystemData = {
      ...data,
      professors: [item, ...(data.professors || [])],
      subjects: [newSubject, ...(data.subjects || [])],
      barcodeSessions: [initialSession, ...(data.barcodeSessions || [])],
    };
    updateAndPersist(updated);
    addLog(
      `إضافة حساب ${p.roleType || 'أستاذ'} جديد (${p.name}) وتوليد باركود الأستاذ (${profCode}) وجلسة (${initialSession.sessionCode})`
    );
    showToast(
      `تمت إضافة الأستاذ (${p.name}) وتوليد باركود التسجيل (${profCode}) بنجاح!`
    );
  };

  const handleCreateBarcodeSession = (
    session: BarcodeSession,
    newSubject?: Omit<Subject, 'docId'>
  ) => {
    let updatedSubjects = data.subjects || [];
    let finalSession = session;

    if (newSubject) {
      const createdSub: Subject = {
        ...newSubject,
        docId: session.subjectId || 'sub-' + Date.now(),
      };
      updatedSubjects = [...updatedSubjects, createdSub];
      finalSession = { ...session, subjectId: createdSub.docId! };
    }

    const updated: SystemData = {
      ...data,
      subjects: updatedSubjects,
      barcodeSessions: [finalSession, ...(data.barcodeSessions || [])],
    };
    updateAndPersist(updated);
    addLog(
      `توليد باركود محاضرة جديد (${finalSession.sessionCode}) للأستاذ ${finalSession.professorName}`
    );
    showToast(`تم توليد باركود المحاضرة (${finalSession.sessionCode}) وفتحه للطلاب!`);
  };

  const handleToggleBarcodeSessionActive = (sessionId: string) => {
    const updatedSessions = (data.barcodeSessions || []).map((s) =>
      s.docId === sessionId ? { ...s, isActive: !s.isActive } : s
    );
    updateAndPersist({ ...data, barcodeSessions: updatedSessions });
    showToast('تم تحديث حالة جلسة الباركود');
  };

  const handleDeleteBarcodeSession = (sessionId: string) => {
    const updatedSessions = (data.barcodeSessions || []).filter((s) => s.docId !== sessionId);
    updateAndPersist({ ...data, barcodeSessions: updatedSessions });
    showToast('تم حذف جلسة الباركود');
  };

  const handleStudentCheckInByBarcode = (
    rawCode: string,
    method: 'qr' | 'code' | 'direct',
    overrideStudent?: { id: string; name: string; department?: string }
  ) => {
    const targetStu = overrideStudent || {
      id: user?.id || 'STU-102941',
      name: user?.name || 'طالب',
      department: user?.department,
    };

    const resolution = resolveScannedProfessorBarcode(
      rawCode,
      data.barcodeSessions || [],
      data.professors || [],
      data.subjects || []
    );

    if (!resolution.matched) {
      const errMsg = resolution.errorMessage || 'رمز الباركود غير صالح';
      showToast(errMsg, 'error');
      return { success: false, message: errMsg };
    }

    const { alreadyRegistered, updatedSessions, updatedAttendance, checkInTime } =
      applyStudentBarcodeCheckIn({
        studentId: targetStu.id,
        studentName: targetStu.name,
        studentDepartment: targetStu.department,
        resolution,
        sessions: data.barcodeSessions || [],
        attendance: data.attendance || [],
        method,
      });

    updateAndPersist({
      ...data,
      barcodeSessions: updatedSessions,
      attendance: updatedAttendance,
    });

    const profName = resolution.professorName || 'أستاذ المادة';
    const subName = resolution.subjectName || 'مقرر دراسي';
    const sessCode = resolution.session?.sessionCode || rawCode.toUpperCase();

    if (alreadyRegistered) {
      showToast(`الطالب ${targetStu.name} مسجل حاضر بالفعل لدى ${profName}!`, 'success');
    } else {
      addLog(
        `تسجيل حضور بالباركود للطالب ${targetStu.name} عند الأستاذ ${profName} (${sessCode})`
      );
      showToast(
        `تم تسجيل الحضور بنجاح عند الأستاذ ${profName} في مادة ${subName}!`,
        'success'
      );
    }

    return {
      success: true,
      message: 'تم التسجيل بنجاح',
      professorName: profName,
      subjectName: subName,
      sessionCode: sessCode,
      profCode: resolution.profCode,
      checkInTime,
    };
  };

  const handleToggleFreezeProf = (prof: Professor) => {
    const updatedList = (data.professors || []).map((p) =>
      p.docId === prof.docId ? { ...p, isFrozen: !p.isFrozen } : p
    );
    const updated = { ...data, professors: updatedList };
    updateAndPersist(updated);
    const statusText = !prof.isFrozen ? 'تجميد' : 'تفعيل';
    addLog(`${statusText} حساب الأستاذ: ${prof.name}`);
    showToast(`تم ${statusText} حساب الأستاذ بنجاح`);
  };

  const handleDeleteProfessor = (docId: string) => {
    const updated = {
      ...data,
      professors: (data.professors || []).filter((p) => p.docId !== docId),
    };
    updateAndPersist(updated);
    addLog('حذف حساب أستاذ من النظام');
    showToast('تم حذف حساب الأستاذ');
  };

  const handleAddStudent = (s: Omit<Student, 'docId'>) => {
    const item: Student = { ...s, docId: 'stu-' + Date.now() };
    const newClearance = createStudentClearanceRecord(item);
    const updated: SystemData = {
      ...data,
      students: [...(data.students || []), item],
      clearances: [newClearance, ...(data.clearances || [])],
    };
    updateAndPersist(updated);
    addLog(`تسجيل طالب جديد وتوليد هوية ذكية وبراءة ذمة: ${s.name} (${s.id})`);
    showToast('تم تسجيل الطالب وتوليد هويته الجامعية الذكية وسجل براءة الذمة!');
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const updatedList = (data.students || []).map((s) =>
      s.docId === updatedStudent.docId ? updatedStudent : s
    );
    const updated = { ...data, students: updatedList };
    updateAndPersist(updated);
    addLog(`تحديث بيانات الطالب: ${updatedStudent.name}`);
    showToast('تم تحديث بيانات الطالب بنجاح');
  };

  const handleDeleteStudent = (docId: string) => {
    const updated = {
      ...data,
      students: (data.students || []).filter((s) => s.docId !== docId),
    };
    updateAndPersist(updated);
    addLog('حذف سجل طالب');
    showToast('تم حذف الطالب من السجل');
  };

  const handleAddSubject = (s: Omit<Subject, 'docId'>) => {
    const item: Subject = { ...s, docId: 'sub-' + Date.now() };
    const updated = { ...data, subjects: [...(data.subjects || []), item] };
    updateAndPersist(updated);
    addLog(`إسناد مادة دراسية جديدة: ${s.name}`);
    showToast('تم إسناد المادة بنجاح!');
  };

  const handleDeleteSubject = (docId: string) => {
    const updated = {
      ...data,
      subjects: (data.subjects || []).filter((s) => s.docId !== docId),
    };
    updateAndPersist(updated);
    addLog('إلغاء إسناد مادة دراسية');
    showToast('تم إلغاء المادة');
  };

  const handleSaveSettings = (settings: SystemSettings) => {
    const updated = { ...data, settings };
    updateAndPersist(updated);
    addLog('تحديث إعدادات ربط تيليجرام');
    showToast('تم حفظ إعدادات النظام بنجاح!');
  };

  // Schedule Slot Actions
  const handleAddScheduleSlot = (slot: Omit<ScheduleSlot, 'docId'>) => {
    const item: ScheduleSlot = { ...slot, docId: 'slot-' + Date.now() };
    const updated = { ...data, schedule: [...(data.schedule || []), item] };
    updateAndPersist(updated);
    addLog(`إضافة موعد محاضرة في الجدول: ${slot.subjectName}`);
  };

  const handleUpdateScheduleSlot = (slot: ScheduleSlot) => {
    const updatedList = (data.schedule || []).map((s) =>
      s.docId === slot.docId ? slot : s
    );
    const updated = { ...data, schedule: updatedList };
    updateAndPersist(updated);
    addLog(`تحديث موعد محاضرة في الجدول: ${slot.subjectName}`);
  };

  const handleDeleteScheduleSlot = (docId: string) => {
    const updated = {
      ...data,
      schedule: (data.schedule || []).filter((s) => s.docId !== docId),
    };
    updateAndPersist(updated);
    addLog('حذف موعد محاضرة من الجدول');
    showToast('تم حذف المحاضرة من الجدول');
  };

  // Professor Actions
  const handleSaveAttendance = async (records: AttendanceRecord[]) => {
    const subId = records[0]?.subjectId;
    const curDate = records[0]?.date;
    const remaining = (data.attendance || []).filter(
      (r) => !(r.subjectId === subId && r.date === curDate)
    );
    const stamped = records.map((r) => ({ ...r, docId: r.docId || 'att-' + Math.random().toString(36).substring(2, 9) }));
    const updated = { ...data, attendance: [...remaining, ...stamped] };
    updateAndPersist(updated);
  };

  const handleSaveGrades = async (newGrades: GradeRecord[]) => {
    const subId = newGrades[0]?.subjectId;
    const remaining = (data.grades || []).filter((g) => g.subjectId !== subId);
    const stamped = newGrades.map((g) => ({ ...g, docId: g.docId || 'grd-' + Math.random().toString(36).substring(2, 9) }));
    const updated = { ...data, grades: [...remaining, ...stamped] };
    updateAndPersist(updated);
  };

  const handleAddLecture = (l: Omit<Lecture, 'docId'>) => {
    const item: Lecture = { ...l, docId: 'lec-' + Date.now() };
    const updated = { ...data, lectures: [item, ...(data.lectures || [])] };
    updateAndPersist(updated);
  };

  const handleDeleteLecture = (docId: string) => {
    const updated = {
      ...data,
      lectures: (data.lectures || []).filter((l) => l.docId !== docId),
    };
    updateAndPersist(updated);
    addLog('حذف محاضرة دراسية');
    showToast('تم حذف المحاضرة');
  };

  // Student Self-Attendance
  const handleSelfAttendance = (subjectId: string, subjectName: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const exists = (data.attendance || []).some(
      (r) => r.studentId === user.id && r.subjectId === subjectId && r.date === today
    );

    if (exists) {
      showToast('أنت مسجل حاضر بالفعل في هذه المحاضرة اليوم!', 'success');
      return;
    }

    const rec: AttendanceRecord = {
      docId: 'att-' + Date.now(),
      studentId: user.id,
      subjectId,
      date: today,
      status: 'حاضر',
    };

    const updated = { ...data, attendance: [...(data.attendance || []), rec] };
    updateAndPersist(updated);
  };

  // Student Requests & Grade Appeals Actions
  const handleSubmitStudentRequest = (req: Omit<StudentRequest, 'docId'>) => {
    const newReq: StudentRequest = { ...req, docId: 'req-' + Date.now() };
    const updated = { ...data, requests: [newReq, ...(data.requests || [])] };
    updateAndPersist(updated);
    const typeLabel = req.type === 'excuse' ? 'طلب إجازة غياب' : 'طلب اعتراض وتدقيق درجة';
    addLog(`رفع ${typeLabel} من الطالب ${req.studentName} لمادة ${req.subjectName}`);
    showToast(`تم إرسال ${typeLabel} إلى أستاذ المادة بنجاح!`);
  };

  const handleApproveStudentRequest = async (
    req: StudentRequest,
    approvedScoreOverride?: number,
    professorNote?: string
  ) => {
    const { updatedRequest, updatedAttendance, updatedGrades } = applyApprovedRequestToState(
      req,
      data.attendance || [],
      data.grades || [],
      approvedScoreOverride,
      professorNote
    );

    const updatedRequests = (data.requests || []).map((r) =>
      r.docId === req.docId ? updatedRequest : r
    );

    const updated: SystemData = {
      ...data,
      requests: updatedRequests,
      attendance: updatedAttendance,
      grades: updatedGrades,
    };

    updateAndPersist(updated);

    const actionDesc =
      req.type === 'excuse'
        ? `قبول إجازة الطالب ${req.studentName} وتحويل غياب يوم ${req.absenceDate} إلى (مجاز)`
        : `قبول اعتراض درجة الطالب ${req.studentName} وتحديث السجل إلى ${updatedRequest.requestedScore}`;
    addLog(actionDesc);
    showToast('تم قبول الطلب وتحديث السجل الأكاديمي للطالب تلقائياً!');

    await sendTelegramNotification(
      data.settings,
      formatRequestResolutionTelegram(updatedRequest)
    );
  };

  const handleRejectStudentRequest = async (req: StudentRequest, professorNote?: string) => {
    const rejectedReq = rejectRequestInState(req, professorNote);
    const updatedRequests = (data.requests || []).map((r) =>
      r.docId === req.docId ? rejectedReq : r
    );
    const updated: SystemData = {
      ...data,
      requests: updatedRequests,
    };
    updateAndPersist(updated);
    addLog(`رفض طلب الطالب ${req.studentName} في مادة ${req.subjectName}`);
    showToast('تم تسجيل قرار رفض الطلب', 'error');

    await sendTelegramNotification(
      data.settings,
      formatRequestResolutionTelegram(rejectedReq)
    );
  };

  // Online Timed Quizzes & Auto-Grading Actions
  const handleAddQuiz = (quiz: Omit<Quiz, 'docId'>) => {
    const newQuiz: Quiz = { ...quiz, docId: 'quiz-' + Date.now() };
    const updated: SystemData = {
      ...data,
      quizzes: [newQuiz, ...(data.quizzes || [])],
    };
    updateAndPersist(updated);
    addLog(`نشر اختبار إلكتروني قصير جديد: ${quiz.title} (${quiz.subjectName})`);
    showToast('تم نشر الاختبار الإلكتروني وتفعيله للطلبة بنجاح!');
  };

  const handleToggleQuizActive = (quizId: string) => {
    const updatedQuizzes = (data.quizzes || []).map((q) =>
      q.docId === quizId ? { ...q, isActive: !q.isActive } : q
    );
    updateAndPersist({ ...data, quizzes: updatedQuizzes });
    addLog('تحديث حالة إتاحة اختبار إلكتروني');
    showToast('تم تحديث حالة الاختبار الإلكتروني');
  };

  const handleDeleteQuiz = (quizId: string) => {
    const updatedQuizzes = (data.quizzes || []).filter((q) => q.docId !== quizId);
    updateAndPersist({ ...data, quizzes: updatedQuizzes });
    addLog('حذف اختبار إلكتروني قصير');
    showToast('تم حذف الاختبار الإلكتروني');
  };

  const handleStudentSubmitQuiz = (
    quiz: Quiz,
    selectedAnswers: number[],
    timeSpentSeconds: number
  ): QuizSubmission => {
    const { submission, updatedGrades } = evaluateQuizSubmission(
      quiz,
      user?.id || 'STU-102941',
      user?.name || 'طالب',
      selectedAnswers,
      timeSpentSeconds,
      data.grades || []
    );

    const remainingSubs = (data.quizSubmissions || []).filter(
      (s) => !(s.quizId === quiz.docId && s.studentId === submission.studentId)
    );

    const updated: SystemData = {
      ...data,
      quizSubmissions: [submission, ...remainingSubs],
      grades: updatedGrades,
    };

    updateAndPersist(updated);
    addLog(
      `تسليم وتصحيح آلي لاختبار (${quiz.title}) للطالب ${submission.studentName} — الدرجة: ${submission.earnedScore}/${submission.maxScore}`
    );
    showToast(
      `تم تصحيح الاختبار فوراً! درجتك: ${submission.earnedScore}/${submission.maxScore} وتم رصدها في السعي`
    );
    return submission;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-sm text-slate-300">جاري إقلاع البيئة التفاعلية الذكية...</p>
      </div>
    );
  }

  const latestBroadcast = (data.broadcasts || [])[0];

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 font-sans relative overflow-x-hidden selection:bg-blue-500 selection:text-white" dir="rtl">
      {/* Prestigious University Academic Architectural Background */}
      <AcademicBackground />

      {/* Floating Toast Alerts */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <OfflineIndicator />

      {/* Main Content */}
      {!user ? (
        <LoginScreen
          onLogin={(loggedInUser) => {
            setUser(loggedInUser);
            addLog(`تسجيل دخول: ${loggedInUser.name} (${loggedInUser.role})`);
            showToast(`مرحباً بك يا ${loggedInUser.name}`);
          }}
          systemData={data}
          showToast={showToast}
        />
      ) : (
        <div className="relative z-10 min-h-screen pb-16">
          {/* Header Navigation */}
          <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 shadow-xl backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg border border-blue-400/30 shrink-0">
                  <GraduationCap size={20} className="text-white" />
                </div>
                <span className="font-black text-xs sm:text-base text-white truncate">
                  الجامعة الذكية التفاعلية
                </span>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 font-bold">
                <span>
                  {user.role === 'admin'
                    ? 'الإدارة المركزية العليا'
                    : user.role === 'student'
                    ? `بوابة الطالب: ${user.name}`
                    : `بوابة الأستاذ: ${user.name}`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">الحرم الجامعي الأكاديمي</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <PWAInstallButton systemData={data} showToast={showToast} variant="header" />
                <button
                  type="button"
                  onClick={() => {
                    addLog(`تسجيل خروج المستخدم: ${user.name}`);
                    setUser(null);
                    setSelectedSubject(null);
                  }}
                  className="px-2.5 sm:px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">تسجيل الخروج</span>
                  <span className="sm:hidden">خروج</span>
                </button>
              </div>
            </div>
          </header>

              {/* Main Container */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Broadcast Announcement Banner */}
                {latestBroadcast && (
                  <div className="bg-slate-900/85 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                        <Megaphone size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-0.5">
                          <span>تعميم إداري مركزي</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-amber-300/80">{latestBroadcast.date}</span>
                        </div>
                        <p className="text-white text-xs sm:text-sm font-bold">{latestBroadcast.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROLE 1: ADMIN VIEW */}
                {user.role === 'admin' && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Admin Navigation Sidebar */}
                    <div className="w-full lg:w-60 shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-1.5">
                      {[
                        { id: 'dashboard', label: 'لوحة المؤشرات', icon: LayoutDashboard },
                        { id: 'clearance', label: 'براءة الذمة والهويات الذكية', icon: FileCheck2 },
                        { id: 'cloud', label: 'المزامنة السحابية Firestore', icon: Cloud },
                        { id: 'radar', label: 'رادار الإنذار ولوحة الشرف', icon: ShieldAlert },
                        { id: 'broadcasts', label: 'التعميمات والأوامر', icon: Megaphone },
                        { id: 'professors', label: 'إدارة ومشاركة الأساتذة', icon: Share2 },
                        { id: 'students', label: 'شؤون الطلبة والباركود', icon: Users },
                        { id: 'subjects', label: 'المقررات الدراسية', icon: BookOpen },
                        { id: 'schedule', label: 'الجدول والتقويم', icon: Calendar },
                        { id: 'quizzes', label: 'الاختبارات الإلكترونية', icon: Clock },
                        { id: 'requests', label: 'الإجازات والاعتراضات', icon: Scale },
                        { id: 'settings', label: 'إعدادات تيليجرام', icon: Settings },
                      ].map((item) => {
                        const Icon = item.icon;
                        const active = adminTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setAdminTab(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 lg:px-4 py-2.5 lg:py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                              active
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500/40'
                                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
                            }`}
                          >
                            <Icon size={15} className={`shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Admin Content Area */}
                    <div className="flex-1 min-w-0">
                      {adminTab === 'dashboard' && (
                        <AdminDashboard
                          data={data}
                          logs={auditLogs}
                          onNavigateTab={(tab) => setAdminTab(tab)}
                        />
                      )}
                      {adminTab === 'clearance' && (
                        <ClearanceManager
                          students={data.students || []}
                          clearances={data.clearances || []}
                          onUpdateStep={handleUpdateClearanceStep}
                          onApproveAll={handleApproveAllClearance}
                          showToast={showToast}
                        />
                      )}
                      {adminTab === 'cloud' && (
                        <CloudSyncPanel
                          firebaseUser={firebaseUser}
                          cloudConnected={cloudConnected}
                          lastSyncedAt={lastSyncedAt}
                          syncVersion={syncVersion}
                          isSyncing={isSyncing}
                          data={data}
                          onGoogleSignIn={handleGoogleSignIn}
                          onGoogleSignOut={handleGoogleSignOut}
                          onPushToCloud={handlePushToCloud}
                          onPullFromCloud={handlePullFromCloud}
                        />
                      )}
                      {adminTab === 'radar' && (
                        <AcademicRadarPanel
                          students={data.students || []}
                          subjects={data.subjects || []}
                          grades={data.grades || []}
                          attendance={data.attendance || []}
                          onNotification={(msg) => sendTelegramNotification(data.settings, msg)}
                          showToast={showToast}
                          addLog={addLog}
                        />
                      )}
                      {adminTab === 'broadcasts' && (
                        <BroadcastManager
                          broadcasts={data.broadcasts}
                          onAdd={handleAddBroadcast}
                          onDelete={handleDeleteBroadcast}
                          onNotification={(msg) => sendTelegramNotification(data.settings, msg)}
                        />
                      )}
                      {adminTab === 'professors' && (
                        <ProfessorsManager
                          professors={data.professors}
                          subjects={data.subjects || []}
                          barcodeSessions={data.barcodeSessions || []}
                          students={data.students || []}
                          onAdd={handleAddProfessor}
                          onCreateBarcodeSession={handleCreateBarcodeSession}
                          onToggleFreeze={handleToggleFreezeProf}
                          onDelete={handleDeleteProfessor}
                          showToast={showToast}
                        />
                      )}
                      {adminTab === 'students' && (
                        <StudentsManager
                          students={data.students}
                          onAdd={handleAddStudent}
                          onUpdate={handleUpdateStudent}
                          onDelete={handleDeleteStudent}
                        />
                      )}
                      {adminTab === 'subjects' && (
                        <SubjectsManager
                          subjects={data.subjects}
                          professors={data.professors}
                          onAdd={handleAddSubject}
                          onDelete={handleDeleteSubject}
                        />
                      )}
                      {adminTab === 'schedule' && (
                        <CalendarTimeline
                          currentUser={user}
                          schedule={data.schedule || []}
                          subjects={data.subjects || []}
                          onAddSlot={handleAddScheduleSlot}
                          onUpdateSlot={handleUpdateScheduleSlot}
                          onDeleteSlot={handleDeleteScheduleSlot}
                          onNotification={(msg) => sendTelegramNotification(data.settings, msg)}
                          showToast={showToast}
                          addLog={addLog}
                        />
                      )}
                      {adminTab === 'quizzes' && (
                        <ProfessorQuizzesManager
                          quizzes={data.quizzes || []}
                          submissions={data.quizSubmissions || []}
                          subjects={data.subjects || []}
                          professorName={user.name}
                          isAdminView={true}
                          onAddQuiz={handleAddQuiz}
                          onToggleQuizActive={handleToggleQuizActive}
                          onDeleteQuiz={handleDeleteQuiz}
                          onNotification={(msg) => sendTelegramNotification(data.settings, msg)}
                          showToast={showToast}
                        />
                      )}
                      {adminTab === 'requests' && (
                        <ProfessorRequestsManager
                          requests={data.requests || []}
                          isAdminView={true}
                          onApprove={handleApproveStudentRequest}
                          onReject={handleRejectStudentRequest}
                        />
                      )}
                      {adminTab === 'settings' && (
                        <AdminSettings
                          settings={data.settings}
                          onSave={handleSaveSettings}
                          showToast={showToast}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ROLE 2: PROFESSOR VIEW */}
                {user.role === 'professor' && (
                  <div className="space-y-6">
                    {!selectedSubject ? (
                      <div className="space-y-6">
                        <div>
                          <div className="mb-4">
                            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                              <BookOpen className="text-blue-500" /> المقررات والمواد المسندة إليك
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              اختر المقرر الدراسي لإدارة سجل الحضور، أو أنشئ باركود محاضرة مباشر لكي يسجل الطلاب عندك
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(data.subjects || [])
                              .filter(
                                (s) => s.professorId === user.docId || s.professorId === user.username
                              )
                              .map((sub) => (
                                <div
                                  key={sub.docId || sub.name}
                                  onClick={() => setSelectedSubject(sub)}
                                  className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-blue-500/50 transition-all cursor-pointer group"
                                >
                                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
                                    <BookOpen size={24} />
                                  </div>
                                  <h3 className="text-lg font-bold text-white mb-2">{sub.name}</h3>
                                  <p className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                    <span>فتح سجل المادة والباركود</span>
                                    <ArrowRight size={14} className="rotate-180" />
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Professor Barcode Hub always available even before selecting a subject */}
                        <ProfessorBarcodeHub
                          professor={
                            (data.professors || []).find(
                              (p) => p.docId === user.docId || p.username === user.username
                            ) || {
                              docId: user.docId,
                              name: user.name,
                              username: user.username || 'prof',
                              roleType: 'أستاذ ضيف',
                            }
                          }
                          subjects={data.subjects || []}
                          students={data.students || []}
                          sessions={data.barcodeSessions || []}
                          onCreateSession={handleCreateBarcodeSession}
                          onToggleSessionActive={handleToggleBarcodeSessionActive}
                          onDeleteSession={handleDeleteBarcodeSession}
                          onRegisterStudentInSession={(code, stu, method) => {
                            handleStudentCheckInByBarcode(code, method, stu);
                          }}
                          showToast={showToast}
                        />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Course Header & Tabs */}
                        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedSubject(null)}
                              className="text-blue-400 text-xs font-bold mb-1.5 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <ArrowRight size={14} className="rotate-180" />
                              <span>العودة لقائمة المواد المسندة</span>
                            </button>
                            <h2 className="text-lg sm:text-xl font-black text-white">{selectedSubject.name}</h2>
                          </div>

                          <div className="flex items-center overflow-x-auto bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
                            {[
                              { id: 'barcode', label: 'باركود الأستاذ والطلاب' },
                              { id: 'clearance', label: 'براءة الذمة الرقمية' },
                              { id: 'attendance', label: 'الحضور والإنذار' },
                              { id: 'grades', label: 'رصد الدرجات' },
                              { id: 'quizzes', label: 'الاختبارات القصيرة' },
                              { id: 'requests', label: 'الإجازات والاعتراضات' },
                              { id: 'lectures', label: 'رفع المحاضرات' },
                              { id: 'schedule', label: 'الجدول والقاعات' },
                              { id: 'reports', label: 'تصدير التقارير' },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setProfTab(tab.id as any)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                  profTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Active Course View */}
                        <div>
                          {profTab === 'barcode' && (
                            <ProfessorBarcodeHub
                              professor={
                                (data.professors || []).find(
                                  (p) => p.docId === user.docId || p.username === user.username
                                ) || {
                                  docId: user.docId,
                                  name: user.name,
                                  username: user.username || 'prof',
                                  roleType: 'ملاك دائم',
                                }
                              }
                              subjects={data.subjects || []}
                              students={data.students || []}
                              sessions={data.barcodeSessions || []}
                              onCreateSession={handleCreateBarcodeSession}
                              onToggleSessionActive={handleToggleBarcodeSessionActive}
                              onDeleteSession={handleDeleteBarcodeSession}
                              onRegisterStudentInSession={(code, stu, method) => {
                                handleStudentCheckInByBarcode(code, method, stu);
                              }}
                              showToast={showToast}
                            />
                          )}
                          {profTab === 'clearance' && (
                            <ClearanceManager
                              students={data.students || []}
                              clearances={data.clearances || []}
                              onUpdateStep={handleUpdateClearanceStep}
                              onApproveAll={handleApproveAllClearance}
                              showToast={showToast}
                            />
                          )}
                          {profTab === 'attendance' && (
                            <ProfessorAttendance
                              subject={selectedSubject}
                              students={data.students}
                              records={data.attendance}
                              onSave={handleSaveAttendance}
                              onNotification={(msg) =>
                                sendTelegramNotification(data.settings, msg)
                              }
                              showToast={showToast}
                              addLog={addLog}
                            />
                          )}
                          {profTab === 'grades' && (
                            <ProfessorGrades
                              subject={selectedSubject}
                              students={data.students}
                              grades={data.grades}
                              onSave={handleSaveGrades}
                              onNotification={(msg) =>
                                sendTelegramNotification(data.settings, msg)
                              }
                              showToast={showToast}
                              addLog={addLog}
                            />
                          )}
                          {profTab === 'quizzes' && (
                            <ProfessorQuizzesManager
                              quizzes={data.quizzes || []}
                              submissions={data.quizSubmissions || []}
                              subjects={data.subjects || []}
                              selectedSubject={selectedSubject}
                              professorName={user.name}
                              onAddQuiz={handleAddQuiz}
                              onToggleQuizActive={handleToggleQuizActive}
                              onDeleteQuiz={handleDeleteQuiz}
                              onNotification={(msg) =>
                                sendTelegramNotification(data.settings, msg)
                              }
                              showToast={showToast}
                            />
                          )}
                          {profTab === 'requests' && (
                            <ProfessorRequestsManager
                              requests={data.requests || []}
                              subject={selectedSubject}
                              onApprove={handleApproveStudentRequest}
                              onReject={handleRejectStudentRequest}
                            />
                          )}
                          {profTab === 'lectures' && (
                            <ProfessorLectures
                              subject={selectedSubject}
                              lectures={data.lectures}
                              onAdd={handleAddLecture}
                              onDelete={handleDeleteLecture}
                              onNotification={(msg) =>
                                sendTelegramNotification(data.settings, msg)
                              }
                              addLog={addLog}
                              showToast={showToast}
                            />
                          )}
                          {profTab === 'schedule' && (
                            <CalendarTimeline
                              currentUser={user}
                              schedule={data.schedule || []}
                              subjects={data.subjects || []}
                              filterSubjectId={selectedSubject.docId}
                              onAddSlot={handleAddScheduleSlot}
                              onUpdateSlot={handleUpdateScheduleSlot}
                              onDeleteSlot={handleDeleteScheduleSlot}
                              onNotification={(msg) =>
                                sendTelegramNotification(data.settings, msg)
                              }
                              addLog={addLog}
                              showToast={showToast}
                            />
                          )}
                          {profTab === 'reports' && (
                            <ExportReports
                              subject={selectedSubject}
                              students={data.students}
                              attendance={data.attendance}
                              grades={data.grades}
                              addLog={addLog}
                              showToast={showToast}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ROLE 3: STUDENT VIEW */}
                {user.role === 'student' && (
                  <StudentPortal
                    student={user}
                    allStudents={data.students || []}
                    professors={data.professors || []}
                    subjects={data.subjects}
                    attendance={data.attendance}
                    grades={data.grades}
                    lectures={data.lectures}
                    schedule={data.schedule || []}
                    requests={data.requests || []}
                    quizzes={data.quizzes || []}
                    quizSubmissions={data.quizSubmissions || []}
                    barcodeSessions={data.barcodeSessions || []}
                    clearances={data.clearances || []}
                    initialTab={studentInitialTab}
                    onSelfAttendance={handleSelfAttendance}
                    onCheckInByBarcode={(rawCode, method) =>
                      handleStudentCheckInByBarcode(rawCode, method)
                    }
                    onRequestClearanceReview={handleStudentRequestClearanceReview}
                    onSubmitRequest={handleSubmitStudentRequest}
                    onSubmitQuiz={handleStudentSubmitQuiz}
                    onNotification={(msg) =>
                      sendTelegramNotification(data.settings, msg)
                    }
                    showToast={showToast}
                    addLog={addLog}
                  />
                )}
              </main>
            </div>
          )}
    </div>
  );
}
