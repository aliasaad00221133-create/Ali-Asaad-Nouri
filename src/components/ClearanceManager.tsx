import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileCheck2,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  ClearanceDepartmentKey,
  ClearanceStepStatus,
  Student,
  StudentClearance,
} from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';

interface ClearanceManagerProps {
  students: Student[];
  clearances: StudentClearance[];
  onUpdateStep: (
    studentId: string,
    departmentKey: ClearanceDepartmentKey,
    status: ClearanceStepStatus,
    note?: string
  ) => void;
  onApproveAll: (studentId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ClearanceManager: React.FC<ClearanceManagerProps> = ({
  clearances,
  onUpdateStep,
  onApproveAll,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'مكتملة' | 'قيد الاستكمال' | 'معلقة لوجود ذمة'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    clearances[0]?.studentId || 'STU-102941'
  );
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const buildQrs = async () => {
      const nextMap: Record<string, string> = {};
      for (const c of clearances) {
        nextMap[c.studentId] = await generateQRCodeDataUrl(c.clearanceCode);
      }
      if (mounted) setQrMap(nextMap);
    };
    buildQrs();
    return () => {
      mounted = false;
    };
  }, [clearances]);

  const filteredClearances = clearances.filter((c) => {
    const matchesSearch =
      c.studentName.includes(searchQuery.trim()) ||
      c.studentId.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      c.clearanceCode.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      c.department.includes(searchQuery.trim());
    const matchesStatus = statusFilter === 'all' || c.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeRecord =
    clearances.find((c) => c.studentId === selectedStudentId) ||
    filteredClearances[0] ||
    clearances[0];

  const completedTotal = clearances.filter((c) => c.overallStatus === 'مكتملة').length;
  const inProgressTotal = clearances.filter((c) => c.overallStatus === 'قيد الاستكمال').length;
  const blockedTotal = clearances.filter((c) => c.overallStatus === 'معلقة لوجود ذمة').length;

  const handleDownloadClearanceReport = (rec: StudentClearance) => {
    const lines = [
      '=== وثيقة براءة الذمة الرقمية والهوية الجامعية الذكية ===',
      `اسم الطالب: ${rec.studentName}`,
      `الرقم الجامعي: ${rec.studentId}`,
      `القسم العلمي: ${rec.department} · ${rec.level}`,
      `رمز براءة الذمة: ${rec.clearanceCode}`,
      `رقم البطاقة الذكية: ${rec.smartCardNumber}`,
      `الحالة العامة: ${rec.overallStatus} (${rec.completionPercent}%)`,
      `تاريخ آخر تحديث: ${rec.lastUpdated}`,
      '--------------------------------------------------------',
      ...rec.departments.map(
        (d, idx) =>
          `${idx + 1}. ${d.departmentTitle} | المسؤول: ${d.officerName} | الحالة: ${d.status} | ملاحظات: ${d.note || '-'}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `براءة_ذمة_${rec.studentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`تم تصدير وثيقة براءة الذمة الرسمية للطالب ${rec.studentName}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-1">
            <FileCheck2 size={16} />
            <span>منظومة براءة الذمة الرقمية والهويات الجامعية الذكية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            إدارة براءة الذمة الموحدة وإصدار الهوية الذكية
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مصادقة إلكترونية فورية في جميع الشعب الخمس (المالية، المكتبة المركزية، المختبرات، اللجنة الامتحانية، شؤون الطلبة)
          </p>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center">
            <span className="text-[11px] text-slate-400 block">مكتملة (100%)</span>
            <span className="text-lg font-black text-emerald-400 font-mono tabular-nums">
              {completedTotal}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center">
            <span className="text-[11px] text-slate-400 block">قيد الاستكمال</span>
            <span className="text-lg font-black text-amber-400 font-mono tabular-nums">
              {inProgressTotal}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center">
            <span className="text-[11px] text-slate-400 block">معلقة (ذمة)</span>
            <span className="text-lg font-black text-rose-400 font-mono tabular-nums">
              {blockedTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الطالب، الرقم الجامعي (STU-...)، أو رمز براءة الذمة (CLR-...)..."
            aria-label="ابحث في سجلات براءة الذمة"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'مكتملة', label: 'مكتملة' },
            { id: 'قيد الاستكمال', label: 'قيد الاستكمال' },
            { id: 'معلقة لوجود ذمة', label: 'معلقة (ذمة)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Students List (Right) + Active Student Clearance & Smart ID (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Students Directory Column */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">قائمة الطلبة وحالة براءة الذمة</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {filteredClearances.length} طالب
            </span>
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pl-1">
            {filteredClearances.map((rec) => {
              const isSelected = activeRecord?.studentId === rec.studentId;
              return (
                <button
                  key={rec.studentId}
                  type="button"
                  onClick={() => setSelectedStudentId(rec.studentId)}
                  className={`w-full text-right p-4 rounded-2xl border transition-all cursor-pointer block ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-lg'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-white">{rec.studentName}</span>
                    <span
                      className={`text-xs font-bold font-mono tabular-nums whitespace-nowrap shrink-0 ${
                        rec.overallStatus === 'مكتملة'
                          ? 'text-emerald-400'
                          : rec.overallStatus === 'معلقة لوجود ذمة'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {rec.overallStatus} · {rec.completionPercent}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono tabular-nums whitespace-nowrap shrink-0">{rec.studentId}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-cyan-400 whitespace-nowrap shrink-0">{rec.clearanceCode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{rec.department}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full transition-all ${
                        rec.overallStatus === 'مكتملة'
                          ? 'bg-emerald-500'
                          : rec.overallStatus === 'معلقة لوجود ذمة'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${rec.completionPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}

            {filteredClearances.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-500">
                لا توجد سجلات مطابقة لمعايير البحث الحالية.
              </p>
            )}
          </div>
        </div>

        {/* Active Student Detail & Smart ID Column */}
        {activeRecord && (
          <div className="lg:col-span-7 space-y-6">
            {/* Smart University ID Card Preview */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-black text-lg">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-blue-300 font-bold">
                      <span>الهوية الجامعية الذكية الموحدة</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{activeRecord.smartCardNumber}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                      {activeRecord.studentName}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {activeRecord.department} · {activeRecord.level} · فصيلة الدم:{' '}
                      <span className="font-mono font-bold text-white">{activeRecord.bloodGroup}</span>
                    </p>
                  </div>
                </div>

                {qrMap[activeRecord.studentId] && (
                  <div className="bg-white p-2 rounded-2xl shadow-md shrink-0 flex items-center gap-3">
                    <img
                      src={qrMap[activeRecord.studentId]}
                      alt={`باركود براءة الذمة ${activeRecord.clearanceCode}`}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span>
                    رمز براءة الذمة:{' '}
                    <strong className="font-mono tabular-nums text-cyan-400">
                      {activeRecord.clearanceCode}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    الصلاحية:{' '}
                    <strong className="font-mono tabular-nums text-white">
                      {activeRecord.expiryDate}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    نسبة الإنجاز:{' '}
                    <strong className="font-mono tabular-nums text-emerald-400">
                      {activeRecord.completionPercent}%
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApproveAll(activeRecord.studentId)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ShieldCheck size={15} />
                    <span>اعتماد براءة الذمة الكاملة (100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadClearanceReport(activeRecord)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download size={14} />
                    <span>تصدير الوثيقة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5 University Clearance Departments Checklist */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  مراحل تدقيق ومصادقة الشعب الجامعية الخمس
                </h3>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  آخر تحديث: {activeRecord.lastUpdated}
                </span>
              </div>

              <div className="space-y-3">
                {activeRecord.departments.map((dept, index) => {
                  const noteKey = `${activeRecord.studentId}_${dept.key}`;
                  const noteValue =
                    customNotes[noteKey] !== undefined ? customNotes[noteKey] : dept.note || '';

                  return (
                    <div
                      key={dept.key}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono tabular-nums text-slate-400">
                              0{index + 1}.
                            </span>
                            <h4 className="text-sm font-bold text-white">{dept.departmentTitle}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            المخول بالمصادقة: <span className="text-slate-200">{dept.officerName}</span>{' '}
                            · التاريخ: <span className="font-mono tabular-nums">{dept.updatedAt}</span>
                          </p>
                        </div>

                        {/* Interactive Status Selector Buttons */}
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                          {(
                            [
                              { status: 'مكتمل', label: 'مكتمل' },
                              { status: 'قيد المراجعة', label: 'قيد المراجعة' },
                              { status: 'معلق - ذمة', label: 'معلق (ذمة)' },
                            ] as Array<{ status: ClearanceStepStatus; label: string }>
                          ).map((btn) => {
                            const active = dept.status === btn.status;
                            return (
                              <button
                                key={btn.status}
                                type="button"
                                onClick={() =>
                                  onUpdateStep(
                                    activeRecord.studentId,
                                    dept.key,
                                    btn.status,
                                    noteValue
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                  active
                                    ? btn.status === 'مكتمل'
                                      ? 'bg-emerald-600 text-white'
                                      : btn.status === 'معلق - ذمة'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-amber-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Note Input + Save Note Button */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={noteValue}
                          onChange={(e) =>
                            setCustomNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))
                          }
                          placeholder="أضف ملاحظة رسمية لهذه الشعبة..."
                          aria-label={`ملاحظة ${dept.departmentTitle}`}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStep(activeRecord.studentId, dept.key, dept.status, noteValue)
                          }
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          حفظ الملاحظة
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
