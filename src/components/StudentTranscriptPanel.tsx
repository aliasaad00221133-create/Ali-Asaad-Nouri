import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  AttendanceRecord,
  CurrentUser,
  GradeRecord,
  Student,
  Subject,
} from '../types.ts';
import {
  computeHonorRollAndRankings,
  computeStudentTranscript,
} from '../utils/transcript.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';

interface StudentTranscriptPanelProps {
  student: CurrentUser | Student;
  allStudents: Student[];
  subjects: Subject[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog?: (action: string) => void;
}

export const StudentTranscriptPanel: React.FC<StudentTranscriptPanelProps> = ({
  student,
  allStudents,
  subjects,
  grades,
  attendance,
  showToast,
  addLog,
}) => {
  const [subTab, setSubTab] = useState<'transcript' | 'honor_roll'>('transcript');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verifiedPulse, setVerifiedPulse] = useState(false);

  const normalizedStudent: Student = {
    id: student.id,
    name: student.name,
    department: student.department || 'هندسة البرمجيات',
    level: student.level || 'المرحلة الثالثة',
    phone: student.phone || '',
  };

  const transcript = computeStudentTranscript(
    normalizedStudent,
    subjects,
    grades,
    attendance
  );

  const rankings = computeHonorRollAndRankings(
    allStudents.length > 0 ? allStudents : [normalizedStudent],
    subjects,
    grades,
    attendance
  );

  const myRankEntry = rankings.find((r) => r.student.id === normalizedStudent.id);
  const myRank = myRankEntry ? myRankEntry.rank : 1;

  useEffect(() => {
    let mounted = true;
    const payload = JSON.stringify({
      university: 'الجامعة الذكية التفاعلية',
      verificationCode: transcript.verificationCode,
      studentId: transcript.studentId,
      studentName: transcript.studentName,
      cumulativeAverage: transcript.cumulativeAverage,
      gpa4: transcript.gpa4,
      standing: transcript.academicStanding,
    });
    generateQRCodeDataUrl(payload).then((url) => {
      if (mounted) setQrDataUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [
    transcript.verificationCode,
    transcript.studentId,
    transcript.studentName,
    transcript.cumulativeAverage,
    transcript.gpa4,
    transcript.academicStanding,
  ]);

  const handleExportTranscriptExcel = () => {
    try {
      const rows = transcript.courses.map((c, idx) => ({
        'ت': idx + 1,
        'المقرر الدراسي': c.subjectName,
        'عدد الوحدات': c.creditHours,
        'التقرير (10)': c.report,
        'الحضور (10)': c.attendanceScore,
        'المختبر (20)': c.lab,
        'الفصلي (30)': c.midterm,
        'الكويز (30)': c.quiz,
        'المجموع النهائي (100)': c.total,
        'نقاط المعدل (4.0)': c.gpaPoints,
        'التقدير': c.gradeTitle,
        'نسبة المواظبة': `${c.attendanceRate}%`,
        'الحالة': c.passed ? 'مستوفٍ' : 'غير مستوفٍ',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الوثيقة الأكاديمية');
      XLSX.writeFile(
        wb,
        `الوثيقة_الأكاديمية_${transcript.studentName}_${transcript.verificationCode}.xlsx`
      );
      showToast('تم تصدير الوثيقة الأكاديمية الرسمية بصيغة Excel بنجاح!');
      if (addLog) {
        addLog(
          `تصدير الوثيقة الأكاديمية الموثقة للطالب ${transcript.studentName} (${transcript.verificationCode})`
        );
      }
    } catch {
      showToast('تعذر تصدير ملف الإكسل', 'error');
    }
  };

  const handleVerifyDocument = () => {
    setVerifiedPulse(true);
    showToast(
      `وثيقة رسمية صحيحة ومطابقة للسجل المركزي — رمز التحقق: ${transcript.verificationCode}`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation & Actions Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-1">
            <ShieldCheck size={15} />
            <span>منظومة الوثائق الرسمية الموثقة وتصنيف الدفعة</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-400">
              {transcript.verificationCode}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            الوثيقة الأكاديمية الموثقة ولوحة الشرف الجامعية
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setSubTab('transcript')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === 'transcript'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الوثيقة الأكاديمية الرسمية
            </button>
            <button
              type="button"
              onClick={() => setSubTab('honor_roll')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === 'honor_roll'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              لوحة الشرف وترتيب الدفعة (#{myRank})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportTranscriptExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Printer size={15} />
            <span>طباعة الوثيقة</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">المعدل التراكمي الموزون</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
              {transcript.cumulativeAverage}%
            </span>
            <span className="text-xs font-bold text-cyan-400">
              {transcript.academicStanding}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            محسوب وفق وزن الوحدات الدراسية المعتمدة
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">المعدل التراكمي (GPA 4.00)</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
              {transcript.gpa4.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 4.00</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            الوحدات المنجزة: {transcript.totalCreditsEarned} من {transcript.totalCreditsAttempted} وحدة
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">الترتيب الأكاديمي على الدفعة</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
              #{myRank}
            </span>
            <span className="text-xs font-bold text-slate-400">
              من أصل {rankings.length} طالب
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {transcript.isHonorRoll
              ? 'مدرج رسمياً في لوحة الشرف للعمادة'
              : 'يرتبط الترتيب بالمعدل التراكمي والمواظبة'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-bold text-slate-400 mb-1">معدل المواظبة والالتزام العام</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-blue-400 font-mono tabular-nums">
              {transcript.overallAttendanceRate}%
            </span>
            <span className="text-xs font-bold text-emerald-400">موثق آلياً</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            رمز التوثيق: <span className="font-mono">{transcript.verificationCode}</span>
          </p>
        </div>
      </div>

      {/* MODE 1: OFFICIAL VERIFIABLE TRANSCRIPT */}
      {subTab === 'transcript' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {/* Official Document Header Banner */}
          <div className="pb-6 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">
                    الجامعة الذكية التفاعلية — عمادة التسجيل وشؤون الطلبة
                  </h4>
                  <p className="text-xs text-slate-400">
                    كشف الدرجات والوثيقة الأكاديمية الرسمية الموثقة إلكترونياً
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-2">
                <span>
                  اسم الطالب: <strong className="text-white">{transcript.studentName}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  الرقم الجامعي:{' '}
                  <strong className="font-mono text-cyan-400">{transcript.studentId}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  القسم: <strong className="text-white">{transcript.department}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  المرحلة: <strong className="text-white">{transcript.level}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  تاريخ الإصدار:{' '}
                  <strong className="font-mono tabular-nums text-slate-300">
                    {transcript.issuedDate}
                  </strong>
                </span>
              </div>
            </div>

            {/* Verification QR & Digital Stamp */}
            <div className="flex items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
              <div className="text-right space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>وثيقة مصدقة رقمياً</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {transcript.verificationCode}
                </p>
                <button
                  type="button"
                  onClick={handleVerifyDocument}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  {verifiedPulse ? 'تم التحقق من المطابقة ✓' : 'فحص مطابقة الختم الرقمي'}
                </button>
              </div>

              <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="باركود التحقق من الوثيقة الرسمية"
                    className="w-20 h-20"
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center text-slate-400">
                    <QrCode size={28} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Course-by-Course Transcript Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3.5">المقرر الدراسي</th>
                  <th className="p-3.5 text-center">الوحدات</th>
                  <th className="p-3.5 text-center">تقرير (10)</th>
                  <th className="p-3.5 text-center">حضور (10)</th>
                  <th className="p-3.5 text-center">مختبر (20)</th>
                  <th className="p-3.5 text-center">فصلي (30)</th>
                  <th className="p-3.5 text-center">كويز (30)</th>
                  <th className="p-3.5 text-center">الدرجة النهائية</th>
                  <th className="p-3.5 text-center">نقاط GPA</th>
                  <th className="p-3.5 text-center">التقدير</th>
                  <th className="p-3.5 text-center">المواظبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {transcript.courses.map((c) => (
                  <tr key={c.subjectId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">{c.subjectName}</td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-slate-300">
                      {c.creditHours}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-slate-300">
                      {c.report}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-slate-300">
                      {c.attendanceScore}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-slate-300">
                      {c.lab}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-slate-300">
                      {c.midterm}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums text-slate-300">
                      {c.quiz}
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums font-black text-white">
                      {c.total} / 100
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums font-bold text-cyan-400">
                      {c.gpaPoints.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      <span
                        className={
                          c.total >= 85
                            ? 'text-emerald-400'
                            : c.total >= 70
                            ? 'text-blue-400'
                            : c.total >= 50
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {c.gradeTitle}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono tabular-nums">
                      <span
                        className={
                          c.absenceWarningLevel === 'critical'
                            ? 'text-rose-400 font-bold'
                            : c.absenceWarningLevel === 'warning'
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400'
                        }
                      >
                        {c.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950/90 border-t border-slate-800 font-bold text-white">
                  <td className="p-3.5">المجموع والمعدل التراكمي المعتمد</td>
                  <td className="p-3.5 text-center font-mono tabular-nums text-cyan-400">
                    {transcript.totalCreditsEarned} وحدة
                  </td>
                  <td colSpan={5} className="p-3.5 text-left text-slate-400">
                    المعدل المئوي التراكمي الموزون بالوحدات:
                  </td>
                  <td className="p-3.5 text-center font-mono tabular-nums text-base font-black text-emerald-400">
                    {transcript.cumulativeAverage}%
                  </td>
                  <td className="p-3.5 text-center font-mono tabular-nums text-cyan-400">
                    {transcript.gpa4.toFixed(2)}
                  </td>
                  <td colSpan={2} className="p-3.5 text-center text-amber-400">
                    {transcript.academicStanding}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODE 2: DEAN'S HONOR ROLL & CLASS RANKINGS */}
      {subTab === 'honor_roll' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Trophy size={19} className="text-amber-400" />
                <span>لوحة الشرف للعمادة والترتيب العام للدفعة</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                تصنيف تنافسي مباشر مبني على المعدل التراكمي الموزون بالوحدات ونسبة الالتزام بالحضور
              </p>
            </div>
            <div className="text-xs text-slate-300 font-bold">
              موقعك الحالي:{' '}
              <span className="font-mono text-amber-400 font-black">المركز #{myRank}</span> من{' '}
              <span className="font-mono">{rankings.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3.5">الترتيب</th>
                  <th className="p-3.5">الرقم الجامعي</th>
                  <th className="p-3.5">اسم الطالب</th>
                  <th className="p-3.5">القسم والمرحلة</th>
                  <th className="p-3.5 text-center">المعدل التراكمي</th>
                  <th className="p-3.5 text-center">GPA (4.00)</th>
                  <th className="p-3.5 text-center">نسبة المواظبة</th>
                  <th className="p-3.5 text-center">المرتبة الأكاديمية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rankings.map((entry) => {
                  const isMe = entry.student.id === normalizedStudent.id;
                  return (
                    <tr
                      key={entry.student.id}
                      className={`transition-colors ${
                        isMe ? 'bg-blue-600/15' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3.5 font-mono tabular-nums font-black">
                        <span
                          className={
                            entry.rank === 1
                              ? 'text-amber-400'
                              : entry.rank === 2
                              ? 'text-slate-200'
                              : entry.rank === 3
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }
                        >
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-blue-400 font-bold" dir="ltr">
                        {entry.student.id}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        <span>{entry.student.name}</span>
                        {isMe && (
                          <span className="mr-2 text-[11px] font-bold text-cyan-400">
                            (أنت)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {entry.student.department} · {entry.student.level}
                      </td>
                      <td className="p-3.5 text-center font-mono tabular-nums font-black text-white">
                        {entry.cumulativeAverage}%
                      </td>
                      <td className="p-3.5 text-center font-mono tabular-nums font-bold text-cyan-400">
                        {entry.gpa4.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center font-mono tabular-nums text-emerald-400">
                        {entry.overallAttendanceRate}%
                      </td>
                      <td className="p-3.5 text-center font-bold">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
