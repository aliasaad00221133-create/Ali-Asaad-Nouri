import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  GraduationCap,
  QrCode,
  TrendingUp,
} from 'lucide-react';
import {
  AttendanceRecord,
  BarcodeSession,
  CurrentUser,
  GradeRecord,
  Lecture,
  Professor,
  Quiz,
  QuizSubmission,
  ScheduleSlot,
  Student,
  StudentClearance,
  StudentRequest,
  Subject,
} from '../types.ts';
import { getArabicGradeTitle } from '../utils/grading.ts';
import { createStudentClearanceRecord } from '../utils/clearance.ts';
import { CertificateModal, QRScannerModal } from './Modals.tsx';
import { CalendarTimeline } from './CalendarTimeline.tsx';
import { StudentRequestsPanel } from './StudentRequestsPanel.tsx';
import { StudentQuizzesPanel } from './StudentQuizzesPanel.tsx';
import { StudentTranscriptPanel } from './StudentTranscriptPanel.tsx';
import { StudentBarcodePanel } from './StudentBarcodePanel.tsx';
import { StudentClearancePanel } from './StudentClearancePanel.tsx';

interface StudentPortalProps {
  student: CurrentUser;
  allStudents?: Student[];
  professors?: Professor[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  lectures: Lecture[];
  schedule: ScheduleSlot[];
  requests: StudentRequest[];
  quizzes: Quiz[];
  quizSubmissions: QuizSubmission[];
  barcodeSessions?: BarcodeSession[];
  clearances?: StudentClearance[];
  initialTab?:
    | 'overview'
    | 'schedule'
    | 'requests'
    | 'quizzes'
    | 'transcript'
    | 'barcode'
    | 'clearance';
  onSelfAttendance: (subjectId: string, subjectName: string) => void;
  onCheckInByBarcode: (
    rawCode: string,
    method: 'qr' | 'code' | 'direct'
  ) => {
    success: boolean;
    message: string;
    professorName?: string;
    subjectName?: string;
    sessionCode?: string;
    profCode?: string;
    checkInTime?: string;
  };
  onRequestClearanceReview?: (studentId: string, note: string) => void;
  onSubmitRequest: (req: Omit<StudentRequest, 'docId'>) => void;
  onSubmitQuiz: (
    quiz: Quiz,
    selectedAnswers: number[],
    timeSpentSeconds: number
  ) => QuizSubmission;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog: (action: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  allStudents = [],
  professors = [],
  subjects,
  attendance,
  grades,
  lectures,
  schedule,
  requests,
  quizzes,
  quizSubmissions,
  barcodeSessions = [],
  clearances = [],
  initialTab = 'overview',
  onSelfAttendance,
  onCheckInByBarcode,
  onRequestClearanceReview,
  onSubmitRequest,
  onSubmitQuiz,
  onNotification,
  showToast,
  addLog,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'schedule' | 'requests' | 'quizzes' | 'transcript' | 'barcode' | 'clearance'
  >(initialTab);
  const [scanModal, setScanModal] = useState(false);
  const [showCert, setShowCert] = useState(false);

  const studentGrades = (grades || []).filter((g) => g.studentId === student.id);
  const studentAttendance = (attendance || []).filter((r) => r.studentId === student.id);
  const pendingMyRequestsCount = (requests || []).filter(
    (r) => r.studentId === student.id && r.status === 'قيد المراجعة'
  ).length;
  const activeQuizzesCount = (quizzes || []).filter((q) => q.isActive).length;
  const activeBarcodeCount = (barcodeSessions || []).filter((s) => s.isActive).length;

  const myClearance =
    clearances.find((c) => c.studentId === student.id) ||
    createStudentClearanceRecord({
      id: student.id,
      name: student.name,
      level: student.level || 'المرحلة الثالثة',
      department: student.department || 'هندسة تقنيات البرمجيات',
      phone: student.phone || '',
    });

  const downloadAllLecturesSummary = () => {
    if (!lectures || lectures.length === 0) {
      showToast('لا توجد محاضرات مرفوعة حالياً للتحميل', 'error');
      return;
    }

    let content = `=== فهرس المحاضرات والملازم الدراسية المعتمدة ===\nالطالب: ${student.name} (${student.id})\nالقسم: ${student.department || '-'}\nالتاريخ: ${new Date().toLocaleDateString('ar-IQ')}\n\n`;

    lectures.forEach((l, idx) => {
      content += `${idx + 1}. [${l.subjectName}]\n   العنوان: ${l.title}\n   رابط التحميل: ${l.fileUrl}\n   ملاحظات: ${l.notes || 'لا توجد'} (تاريخ الرفع: ${l.date})\n------------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `فهرس_محاضرات_${student.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('تم تحميل فهرس وروابط جميع المحاضرات بنجاح!');
    addLog(`الطالب ${student.name} قام بتحميل فهرس وروابط كافة المحاضرات`);
  };

  return (
    <div className="space-y-6">
      {/* Student Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-100 font-bold mb-1.5">
            <GraduationCap size={15} />
            <span>بوابة الطالب الذكية الموحدة</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-1">أهلاً بك، {student.name}</h2>
          <p className="text-blue-100 text-xs sm:text-sm font-medium">
            الرقم الجامعي: <span className="font-mono font-bold text-white">{student.id}</span> · القسم:{' '}
            <span className="text-white font-bold">{student.department || '-'}</span> ·{' '}
            <span className="text-white font-bold">{student.level || '-'}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={downloadAllLecturesSummary}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download size={15} /> تحميل كل المحاضرات
          </button>

          <button
            type="button"
            onClick={() => setShowCert(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Award size={15} /> شهادة التقدير
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clearance')}
            className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Award size={15} /> الهوية الذكية وبراءة الذمة ({myClearance.completionPercent}%)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('barcode')}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <QrCode size={15} /> تسجيل الحضور بباركود الأستاذ
          </button>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex flex-wrap bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          نظرة عامة والدرجات
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('clearance')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'clearance'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الهوية الذكية وبراءة الذمة ({myClearance.completionPercent}%)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('barcode')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'barcode'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          باركود الأساتذة وتسجيل الحضور ({activeBarcodeCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'transcript'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الوثيقة الأكاديمية ولوحة الشرف
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'quizzes'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الاختبارات القصيرة ومُحاكي السعي ({activeQuizzesCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          التقويم والجدول اليومي
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الإجازات والاعتراضات ({pendingMyRequestsCount > 0 ? `${pendingMyRequestsCount} قيد المراجعة` : 'خدمة الطلبة'})
        </button>
      </div>

      {activeTab === 'clearance' ? (
        <StudentClearancePanel
          student={student}
          clearance={myClearance}
          onRequestClearanceReview={(stuId, note) => {
            if (onRequestClearanceReview) {
              onRequestClearanceReview(stuId, note);
            }
          }}
          showToast={showToast}
          addLog={addLog}
        />
      ) : activeTab === 'barcode' ? (
        <StudentBarcodePanel
          student={student}
          professors={professors}
          subjects={subjects}
          barcodeSessions={barcodeSessions}
          attendance={attendance}
          onCheckInByCode={onCheckInByBarcode}
        />
      ) : activeTab === 'transcript' ? (
        <StudentTranscriptPanel
          student={student}
          allStudents={allStudents}
          subjects={subjects}
          grades={grades}
          attendance={attendance}
          showToast={showToast}
          addLog={addLog}
        />
      ) : activeTab === 'quizzes' ? (
        <StudentQuizzesPanel
          student={student}
          subjects={subjects}
          quizzes={quizzes}
          submissions={quizSubmissions}
          grades={grades}
          onSubmitQuiz={onSubmitQuiz}
          showToast={showToast}
        />
      ) : activeTab === 'schedule' ? (
        <CalendarTimeline
          currentUser={student}
          schedule={schedule}
          subjects={subjects}
          onAddSlot={() => {}}
          onUpdateSlot={() => {}}
          onDeleteSlot={() => {}}
          onNotification={onNotification}
          showToast={showToast}
          addLog={addLog}
        />
      ) : activeTab === 'requests' ? (
        <StudentRequestsPanel
          student={student}
          subjects={subjects}
          attendance={attendance}
          grades={grades}
          requests={requests}
          onSubmitRequest={onSubmitRequest}
          showToast={showToast}
        />
      ) : (
        <>
          {/* Modals */}
          {scanModal && (
        <QRScannerModal
          title="امسح باركود الأستاذ أو المحاضرة"
          placeholder="BAR-101920 أو PRF-409120"
          onScan={(code) => {
            const res = onCheckInByBarcode(code, 'qr');
            if (res.success) {
              setScanModal(false);
            }
          }}
          onClose={() => setScanModal(false)}
        />
      )}

      {showCert && (
        <CertificateModal
          student={{
            id: student.id,
            name: student.name,
            level: student.level || 'المرحلة الثالثة',
            department: student.department || 'العلوم التكنولوجية',
            phone: student.phone || '',
          }}
          onClose={() => setShowCert(false)}
        />
      )}

      {/* Lectures & Study Materials */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-cyan-400" /> المحاضرات والملازم الدراسية المتاحة (
          {(lectures || []).length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(lectures || []).map((l) => (
            <div
              key={l.docId || l.title}
              className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-cyan-500/40 transition-colors"
            >
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 inline-block mb-2">
                  {l.subjectName}
                </span>
                <h4 className="font-bold text-white text-sm leading-snug">{l.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{l.notes || 'لا توجد ملاحظات'}</p>
                <span className="text-[10px] text-slate-500 block mt-2 font-mono">{l.date}</span>
              </div>

              <a
                href={l.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow"
              >
                <Download size={13} /> فتح / تحميل المحاضرة
              </a>
            </div>
          ))}

          {(lectures || []).length === 0 && (
            <p className="col-span-full text-center py-6 text-slate-500 text-xs">
              لا توجد محاضرات مرفوعة حالياً من الأساتذة.
            </p>
          )}
        </div>
      </div>

      {/* Grades & Attendance Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grades Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            <h3 className="text-base font-bold text-white">نتائجك ودرجات السعي التفصيلية</h3>
          </div>

          <div className="space-y-3">
            {studentGrades.map((g, idx) => {
              const sub = (subjects || []).find((s) => s.docId === g.subjectId);
              const gradeTitle = getArabicGradeTitle(g.total);

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-white text-sm">{sub?.name || 'مقرر دراسي'}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full font-black text-xs">
                        المجموع: {g.total} / 100
                      </span>
                      <span className="text-[11px] font-bold text-cyan-400">({gradeTitle})</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <div>
                      تقرير: <span className="font-bold text-white block">{g.report || 0}</span>
                    </div>
                    <div>
                      حضور: <span className="font-bold text-white block">{g.attendanceScore || 0}</span>
                    </div>
                    <div>
                      مختبر: <span className="font-bold text-white block">{g.lab || 0}</span>
                    </div>
                    <div>
                      فصلي: <span className="font-bold text-white block">{g.midterm || 0}</span>
                    </div>
                    <div>
                      كويز: <span className="font-bold text-white block">{g.quiz || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {studentGrades.length === 0 && (
              <p className="text-center py-6 text-slate-500 text-xs">لا توجد درجات مرصودة حالياً.</p>
            )}
          </div>
        </div>

        {/* Attendance Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-cyan-400" />
            <h3 className="text-base font-bold text-white">سجل الحضور والمواظبة اليومي</h3>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {studentAttendance.map((r, idx) => {
              const sub = (subjects || []).find((s) => s.docId === r.subjectId);
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800"
                >
                  <div>
                    <p className="font-bold text-white text-xs">{sub?.name || 'مقرر'}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{r.date}</span>
                  </div>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                      r.status === 'حاضر'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              );
            })}

            {studentAttendance.length === 0 && (
              <p className="text-center py-6 text-slate-500 text-xs">
                لا توجد سجلات حضور مسجلة حالياً.
              </p>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
