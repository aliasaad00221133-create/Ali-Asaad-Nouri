import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileCheck2,
  Printer,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { CurrentUser, StudentClearance } from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';

interface StudentClearancePanelProps {
  student: CurrentUser;
  clearance: StudentClearance;
  onRequestClearanceReview: (studentId: string, note: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog: (action: string) => void;
}

export const StudentClearancePanel: React.FC<StudentClearancePanelProps> = ({
  student,
  clearance,
  onRequestClearanceReview,
  showToast,
  addLog,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [requestNote, setRequestNote] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    generateQRCodeDataUrl(clearance.clearanceCode).then((url) => {
      if (mounted) setQrUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [clearance.clearanceCode]);

  const handleDownloadSmartIdAndClearance = () => {
    const content = [
      '========================================================',
      '   الجامعة الذكية التفاعلية — وثيقة براءة الذمة والهوية الجامعية   ',
      '========================================================',
      `الاسم الكامل: ${clearance.studentName}`,
      `الرقم الجامعي: ${clearance.studentId}`,
      `القسم العلمي: ${clearance.department} (${clearance.level})`,
      `رقم البطاقة الجامعية الذكية: ${clearance.smartCardNumber}`,
      `رمز التحقق لبراءة الذمة: ${clearance.clearanceCode}`,
      `فصيلة الدم: ${clearance.bloodGroup}`,
      `صلاحية الهوية: من ${clearance.issueDate} إلى ${clearance.expiryDate}`,
      `الحالة النهائية لبراءة الذمة: ${clearance.overallStatus} (${clearance.completionPercent}%)`,
      '--------------------------------------------------------',
      'تفاصيل مصادقة الشعب والأقسام الجامعية:',
      ...clearance.departments.map(
        (d, i) =>
          `${i + 1}. ${d.departmentTitle}\n   المسؤول المخول: ${d.officerName}\n   الحالة: ${d.status} | التاريخ: ${d.updatedAt}\n   الملاحظات: ${d.note || 'لا توجد'}`
      ),
      '========================================================',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `هوية_وبراءة_ذمة_${clearance.studentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('تم تحميل وثيقة براءة الذمة الرقمية والهوية الجامعية بنجاح!');
    addLog(`الطالب ${student.name} قام بتحميل وثيقة براءة الذمة الرقمية (${clearance.clearanceCode})`);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = requestNote.trim() || 'يرجى التفضل بتدقيق واستكمال براءة الذمة الرقمية الخاصة بي.';
    onRequestClearanceReview(student.id, trimmed);
    setRequestNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Grid: Digital Smart University ID Card + Clearance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Smart University ID Card (Interactive Visual Card) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-blue-950/90 to-slate-950 border border-blue-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                  <CreditCard size={15} />
                  <span>الهوية الجامعية الرقمية الذكية · Smart Campus ID</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {clearance.studentName}
                </h3>
              </div>
              <div className="text-left font-mono tabular-nums">
                <span className="text-[11px] text-slate-400 block">رقم البطاقة الذكية</span>
                <span className="text-xs sm:text-sm font-black text-cyan-400">
                  {clearance.smartCardNumber}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 items-center">
              <div className="sm:col-span-2 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">الرقم الجامعي الرسمي:</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {clearance.studentId}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">القسم العلمي:</span>
                  <span className="font-bold text-white">{clearance.department}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">المرحلة الدراسية وفصيلة الدم:</span>
                  <span className="font-bold text-white">
                    {clearance.level} · <strong className="font-mono text-cyan-300">{clearance.bloodGroup}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">رمز براءة الذمة الموحد:</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {clearance.clearanceCode}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">صلاحية الهوية الأكاديمية:</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {clearance.issueDate} — {clearance.expiryDate}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-lg mx-auto">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="باركود الهوية الجامعية وبراءة الذمة"
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 object-contain"
                  />
                ) : (
                  <div className="w-28 h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                    QR
                  </div>
                )}
                <span className="text-[10px] font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {clearance.clearanceCode}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-300">حالة الهوية وبراءة الذمة:</span>
              <strong
                className={
                  clearance.overallStatus === 'مكتملة'
                    ? 'text-emerald-400'
                    : clearance.overallStatus === 'معلقة لوجود ذمة'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }
              >
                {clearance.overallStatus} ({clearance.completionPercent}%)
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSmartIdAndClearance}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download size={14} />
                <span>تحميل الهوية ووثيقة براءة الذمة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clearance Status & Review Request Box */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 size={18} className="text-emerald-400" />
                <span>مؤشر إنجاز براءة الذمة الرقمية</span>
              </h3>
              <span className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                {clearance.completionPercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all ${
                  clearance.overallStatus === 'مكتملة'
                    ? 'bg-emerald-500'
                    : clearance.overallStatus === 'معلقة لوجود ذمة'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${clearance.completionPercent}%` }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {clearance.overallStatus === 'مكتملة'
                ? 'تم استكمال جميع مصادقات براءة الذمة الرقمية بنجاح. يمكنك الآن استلام الوثيقة الرسمية أو دخول الامتحانات النهائية دون أي عوائق إدارية.'
                : 'يرجى مراجعة حالة الشعب أدناه أو إرسال طلب تدقيق إلكتروني ليقوم القسم المعني بالمصادقة الفورية.'}
            </p>
          </div>

          <form onSubmit={handleSubmitReview} className="space-y-3 pt-3 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-200">
              طلب تدقيق أو تسوية ذمة إلكتروني للشعب المعنية
            </label>
            <textarea
              rows={2}
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="اكتب توضيحاً (مثال: تم تسليم الكتاب المستعار للمكتبة المركزية اليوم)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>إرسال طلب تدقيق واستكمال براءة الذمة</span>
            </button>
          </form>
        </div>
      </div>

      {/* Detailed 5-Department Official Approval Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">
              جدول مصادقات براءة الذمة الرسمية (الشعب الخمس)
            </h3>
            <p className="text-xs text-slate-400">
              تُحدث هذه الصفحة لحظياً فور مصادقة الأستاذ أو مسؤول الشعبة المختصة
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            رمز التوثيق: {clearance.clearanceCode}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {clearance.departments.map((dept, idx) => (
            <div
              key={dept.key}
              className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="font-mono tabular-nums">0{idx + 1}</span>
                  <span
                    className={`font-bold ${
                      dept.status === 'مكتمل'
                        ? 'text-emerald-400'
                        : dept.status === 'معلق - ذمة'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {dept.status}
                  </span>
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm leading-snug">
                  {dept.departmentTitle}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">المخول: {dept.officerName}</p>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-300 space-y-1">
                <p className="line-clamp-2">{dept.note || 'بريء الذمة رسمياً'}</p>
                <span className="block text-[10px] text-slate-500 font-mono tabular-nums">
                  {dept.updatedAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
