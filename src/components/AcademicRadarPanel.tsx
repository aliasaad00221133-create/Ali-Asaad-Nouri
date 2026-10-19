import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  FileText,
  Search,
  Send,
  ShieldAlert,
  Trophy,
  X,
} from 'lucide-react';
import {
  AttendanceRecord,
  GradeRecord,
  Student,
  Subject,
} from '../types.ts';
import {
  computeEarlyWarningRadar,
  computeHonorRollAndRankings,
  EarlyWarningAlert,
  formatEarlyWarningTelegram,
} from '../utils/transcript.ts';
import { StudentTranscriptPanel } from './StudentTranscriptPanel.tsx';

interface AcademicRadarPanelProps {
  students: Student[];
  subjects: Subject[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  onNotification: (msg: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog: (action: string) => void;
}

export const AcademicRadarPanel: React.FC<AcademicRadarPanelProps> = ({
  students,
  subjects,
  grades,
  attendance,
  onNotification,
  showToast,
  addLog,
}) => {
  const [activeMode, setActiveMode] = useState<'radar' | 'honor_roll'>('radar');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'absence' | 'grade'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifiedIds, setNotifiedIds] = useState<Record<string, boolean>>({});
  const [selectedTranscriptStudent, setSelectedTranscriptStudent] = useState<Student | null>(null);

  const alerts = computeEarlyWarningRadar(students, subjects, grades, attendance);
  const rankings = computeHonorRollAndRankings(students, subjects, grades, attendance);

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const honorRollCount = rankings.filter((r) => r.isHonorRoll).length;
  const avgCollegeGpa =
    rankings.length > 0
      ? (rankings.reduce((sum, r) => sum + r.gpa4, 0) / rankings.length).toFixed(2)
      : '0.00';

  const filteredAlerts = alerts.filter((a) => {
    if (riskFilter === 'critical' && a.severity !== 'critical') return false;
    if (riskFilter === 'absence' && a.category !== 'absence' && a.category !== 'both') return false;
    if (riskFilter === 'grade' && a.category !== 'grade' && a.category !== 'both') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.studentName.toLowerCase().includes(q) ||
        a.studentId.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSendSingleWarning = async (alert: EarlyWarningAlert) => {
    setNotifiedIds((prev) => ({ ...prev, [alert.id]: true }));
    addLog(
      `إرسال إنذار أكاديمي مبكر للطالب ${alert.studentName} في مقرر ${alert.subjectName}`
    );
    showToast(
      `تم إرسال الإنذار الأكاديمي للطالب ${alert.studentName} وتوثيقه في السجل الرسمي!`,
      'success'
    );
    await onNotification(formatEarlyWarningTelegram(alert));
  };

  const handleBroadcastCriticalWarnings = async () => {
    const criticalList = alerts.filter((a) => a.severity === 'critical');
    if (criticalList.length === 0) {
      showToast('لا توجد حالات حرجة حالياً لإرسال تنبيه جماعي', 'error');
      return;
    }
    const nextMap: Record<string, boolean> = { ...notifiedIds };
    criticalList.forEach((a) => {
      nextMap[a.id] = true;
    });
    setNotifiedIds(nextMap);
    addLog(`تعميم إنذار مبكر جماعي لعدد (${criticalList.length}) حالة حرجة عبر تيليجرام`);
    showToast(`تم إرسال الإنذارات الرسمية لكافة الحالات الحرجة (${criticalList.length}) بنجاح!`);
    await onNotification(
      `🚨 <b>تقرير رادار الإنذار المبكر المركزي</b>\nتم رصد <b>${criticalList.length}</b> حالة حرجة (تجاوز غياب أو تعثر سعي) وتم توجيه التبليغات الرسمية للطلبة المعنيين.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white text-balance">
            رادار الإنذار الأكاديمي المبكر ولوحة الشرف
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            الرقابة الاستباقية على نسب الغياب وتعثر السعي، مع تصنيف الأوائل وإصدار الوثائق الموثقة بالباركود
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setActiveMode('radar')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeMode === 'radar'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              رادار الإنذار المبكر ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('honor_roll')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeMode === 'honor_roll'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              لوحة الشرف وإصدار الوثائق ({rankings.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">إجمالي حالات الرصد المبكر</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
              {alerts.length}
            </span>
            <span className="text-xs font-bold text-slate-400">حالة مرصودة</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">حالات حرجة (خطر حرمان / رسوب)</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tabular-nums">
              {criticalCount}
            </span>
            <span className="text-xs font-bold text-rose-400">تدخل عاجل</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">طلبة لوحة الشرف للعمادة</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
              {honorRollCount}
            </span>
            <span className="text-xs font-bold text-emerald-400">امتياز ومواظبة</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">متوسط المعدل التراكمي (GPA)</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono tabular-nums">
              {avgCollegeGpa}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 4.00</span>
          </div>
        </div>
      </div>

      {/* MODE 1: EARLY-WARNING ACADEMIC & ABSENCE RADAR */}
      {activeMode === 'radar' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'all', label: `الكل (${alerts.length})` },
                { id: 'critical', label: `حالات حرجة (${criticalCount})` },
                { id: 'absence', label: 'إنذارات الغياب' },
                { id: 'grade', label: 'تعثر السعي والدرجات' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRiskFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    riskFilter === f.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الطالب أو المادة..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleBroadcastCriticalWarnings}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldAlert size={15} />
                <span>تعميم إنذار للحالات الحرجة</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3.5 whitespace-nowrap">الطالب والرقم الجامعي</th>
                  <th className="p-3.5 whitespace-nowrap">المقرر الدراسي</th>
                  <th className="p-3.5 whitespace-nowrap">مستوى الخطورة</th>
                  <th className="p-3.5 text-center whitespace-nowrap">نسبة الغياب</th>
                  <th className="p-3.5 text-center whitespace-nowrap">مجموع السعي</th>
                  <th className="p-3.5">التشخيص والتوصية الأكاديمية</th>
                  <th className="p-3.5 text-center whitespace-nowrap">الإجراء الرسمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredAlerts.map((alert) => {
                  const isSent = Boolean(notifiedIds[alert.id]);
                  return (
                    <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-white">{alert.studentName}</div>
                        <div className="text-[11px] font-mono text-blue-400" dir="ltr">
                          {alert.studentId} · {alert.studentPhone}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-200">{alert.subjectName}</td>
                      <td className="p-3.5 font-bold whitespace-nowrap">
                        {alert.severity === 'critical' ? (
                          <span className="text-rose-400 inline-flex items-center gap-1">
                            <AlertTriangle size={14} />
                            <span>حرج / إنذار نهائي</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 inline-flex items-center gap-1">
                            <AlertTriangle size={14} />
                            <span>تنبيه مبكر</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono tabular-nums font-bold whitespace-nowrap">
                        <span
                          className={
                            alert.absenceRate >= 15
                              ? 'text-rose-400'
                              : alert.absenceRate >= 10
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }
                        >
                          {alert.absenceRate}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono tabular-nums font-bold whitespace-nowrap">
                        <span
                          className={
                            alert.totalScore < 50
                              ? 'text-rose-400'
                              : alert.totalScore < 65
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {alert.totalScore} / 100
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-bold">{alert.reasonSummary}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          التوصية: {alert.recommendedAction}
                        </div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSendSingleWarning(alert)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                            isSent
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {isSent ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>تم التبليغ الرسمي</span>
                            </>
                          ) : (
                            <>
                              <Send size={13} />
                              <span>إرسال إنذار رسمي</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                      لا توجد حالات إنذار مطابقة لمعايير التصفية الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE 2: DEAN'S HONOR ROLL & OFFICIAL TRANSCRIPT ISSUANCE */}
      {activeMode === 'honor_roll' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Trophy size={19} className="text-amber-400" />
                <span>لوحة الشرف للعمادة وإصدار الوثائق الأكاديمية الموثقة</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                اختر أي طالب لمعاينة وطباعة وثيقته الأكاديمية الرسمية الموثقة بباركود التحقق الرقمي
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3.5 whitespace-nowrap">الترتيب</th>
                  <th className="p-3.5 whitespace-nowrap">الرقم الجامعي</th>
                  <th className="p-3.5 whitespace-nowrap">اسم الطالب</th>
                  <th className="p-3.5">القسم والمرحلة</th>
                  <th className="p-3.5 text-center whitespace-nowrap">المعدل التراكمي</th>
                  <th className="p-3.5 text-center whitespace-nowrap">GPA (4.00)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">المواظبة</th>
                  <th className="p-3.5 text-center whitespace-nowrap">المرتبة الأكاديمية</th>
                  <th className="p-3.5 text-center whitespace-nowrap">الوثيقة الرسمية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rankings.map((entry) => (
                  <tr key={entry.student.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono tabular-nums font-black text-amber-400 whitespace-nowrap">
                      #{entry.rank}
                    </td>
                    <td className="p-3.5 font-mono tabular-nums text-blue-400 font-bold whitespace-nowrap" dir="ltr">
                      {entry.student.id}
                    </td>
                    <td className="p-3.5 font-bold text-white whitespace-nowrap">{entry.student.name}</td>
                    <td className="p-3.5 text-slate-300">
                      {entry.student.department} · {entry.student.level}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums font-black text-white whitespace-nowrap">
                      {entry.cumulativeAverage}%
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums font-bold text-cyan-400 whitespace-nowrap">
                      {entry.gpa4.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                      {entry.overallAttendanceRate}%
                    </td>
                    <td className="p-3.5 text-center font-bold whitespace-nowrap">
                      <span
                        className={
                          entry.isHonorRoll
                            ? 'text-amber-400'
                            : entry.academicStanding === 'ناجح'
                            ? 'text-blue-400'
                            : 'text-rose-400'
                        }
                      >
                        {entry.academicStanding}
                      </span>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedTranscriptStudent(entry.student)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileText size={13} />
                        <span>إصدار الوثيقة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Student Transcript Preview Modal */}
      {selectedTranscriptStudent && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white">
                  معاينة الوثيقة الأكاديمية الرسمية — {selectedTranscriptStudent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTranscriptStudent(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white cursor-pointer"
                aria-label="إغلاق معاينة الوثيقة"
              >
                <X size={18} />
              </button>
            </div>

            <StudentTranscriptPanel
              student={selectedTranscriptStudent}
              allStudents={students}
              subjects={subjects}
              grades={grades}
              attendance={attendance}
              showToast={showToast}
              addLog={addLog}
            />
          </div>
        </div>
      )}
    </div>
  );
};
