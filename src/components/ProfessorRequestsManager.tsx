import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Calendar,
  Scale,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { StudentRequest, Subject } from '../types.ts';
import {
  countRequestsByStatus,
  getGradeComponentLabel,
  getGradeComponentMax,
} from '../utils/requests.ts';

interface ProfessorRequestsManagerProps {
  requests: StudentRequest[];
  subject?: Subject | null;
  isAdminView?: boolean;
  onApprove: (req: StudentRequest, approvedScoreOverride?: number, professorNote?: string) => void;
  onReject: (req: StudentRequest, professorNote?: string) => void;
}

export const ProfessorRequestsManager: React.FC<ProfessorRequestsManagerProps> = ({
  requests,
  subject,
  isAdminView = false,
  onApprove,
  onReject,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'قيد المراجعة' | 'مقبول' | 'مرفوض'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'excuse' | 'appeal'>('all');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [scoreOverrideMap, setScoreOverrideMap] = useState<Record<string, string>>({});

  // Scope requests by subject if professor is viewing a specific course
  const scopedRequests = (requests || []).filter((r) =>
    subject?.docId ? r.subjectId === subject.docId : true
  );

  const filteredRequests = scopedRequests.filter((r) => {
    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const matchesType = typeFilter === 'all' ? true : r.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const stats = countRequestsByStatus(scopedRequests);

  const handleNoteChange = (docId: string, val: string) => {
    setNotesMap((prev) => ({ ...prev, [docId]: val }));
  };

  const handleScoreOverrideChange = (docId: string, val: string) => {
    setScoreOverrideMap((prev) => ({ ...prev, [docId]: val }));
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي الطلبات الواردة</span>
          <span className="text-2xl font-black text-white font-mono tabular-nums">{stats.total}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-bold block mb-1">بانتظار البتّ والتدقيق</span>
          <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">
            {stats.pending}
          </span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-bold block mb-1">تم قبولها وتحديث السجل</span>
          <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
            {stats.approved}
          </span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400 font-bold block mb-1">طلبات مرفوضة</span>
          <span className="text-2xl font-black text-rose-400 font-mono tabular-nums">
            {stats.rejected}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-white">
            {isAdminView
              ? 'مركز إدارة طلبات الإجازات والاعتراضات الأكاديمية'
              : `طلبات الإجازات وتدقيق الدرجات — ${subject?.name || 'جميع المواد'}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            قبول طلب الإجازة يحوّل غياب الطالب تلقائياً إلى (مجاز)، وقبول الاعتراض يعدّل درجة السعي ويعيد حساب المجموع
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {[
              { id: 'all', label: 'كل الأنواع' },
              { id: 'excuse', label: 'إجازات الغياب' },
              { id: 'appeal', label: 'اعتراضات الدرجات' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  typeFilter === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {[
              { id: 'all', label: 'كل الحالات' },
              { id: 'قيد المراجعة', label: 'قيد المراجعة' },
              { id: 'مقبول', label: 'المقبولة' },
              { id: 'مرفوض', label: 'المرفوضة' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === st.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((req) => {
          const docKey = req.docId || req.studentId + req.createdAt;
          const isExcuse = req.type === 'excuse';
          const isPending = req.status === 'قيد المراجعة';
          const maxScore = getGradeComponentMax(req.gradeComponent);
          const defaultOverride =
            scoreOverrideMap[docKey] !== undefined
              ? scoreOverrideMap[docKey]
              : String(req.requestedScore ?? req.currentScore ?? 0);

          const statusTextClass =
            req.status === 'مقبول'
              ? 'text-emerald-400'
              : req.status === 'مرفوض'
              ? 'text-rose-400'
              : 'text-amber-400';

          const StatusIcon =
            req.status === 'مقبول'
              ? CheckCircle2
              : req.status === 'مرفوض'
              ? XCircle
              : Clock;

          return (
            <div
              key={docKey}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            >
              {/* Header Row: Unboxed Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-black text-white text-sm">{req.studentName}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono text-slate-400 tabular-nums" dir="ltr">
                    {req.studentId}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-blue-400 font-bold flex items-center gap-1">
                    {isExcuse ? <FileText size={13} /> : <Scale size={13} />}
                    <span>{isExcuse ? 'طلب إجازة / عذر غياب رسمي' : 'اعتراض وتدقيق درجة سعي'}</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300 font-medium">{req.subjectName}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono text-slate-400 tabular-nums">{req.createdAt}</span>
                </div>

                <div className={`flex items-center gap-1.5 text-xs font-bold ${statusTextClass}`}>
                  <StatusIcon size={15} />
                  <span>{req.status}</span>
                </div>
              </div>

              {/* Request Body & Context */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center pt-1">
                <div className="lg:col-span-7 space-y-2.5">
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {req.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    {isExcuse ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-amber-400" />
                          <span>تاريخ الغياب المطلوب إجازته:</span>
                          <strong className="font-mono text-white tabular-nums" dir="ltr">
                            {req.absenceDate || '-'}
                          </strong>
                        </span>
                        {req.attachmentUrl && (
                          <a
                            href={req.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <ExternalLink size={13} />
                            <span>فحص الوثيقة / التقرير المرفق</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <span>
                          المفردة:{' '}
                          <strong className="text-white">
                            {getGradeComponentLabel(req.gradeComponent)}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الدرجة الحالية:{' '}
                          <strong className="font-mono text-slate-200 tabular-nums" dir="ltr">
                            {req.currentScore ?? 0} / {maxScore}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الدرجة التي يطالب بها الطالب:{' '}
                          <strong className="font-mono text-cyan-400 tabular-nums" dir="ltr">
                            {req.requestedScore ?? 0} / {maxScore}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action / Resolution Zone */}
                <div className="lg:col-span-5 lg:border-r lg:border-slate-800 lg:pr-5 pt-3 lg:pt-0 border-t border-slate-800 lg:border-t-0 space-y-3">
                  {isPending ? (
                    <>
                      {!isExcuse && (
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-xs font-bold text-slate-300">
                            الدرجة المعتمدة بعد التدقيق (من {maxScore}):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={maxScore}
                            value={defaultOverride}
                            onChange={(e) => handleScoreOverrideChange(docKey, e.target.value)}
                            className="w-24 text-center px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-blue-500 outline-none tabular-nums"
                          />
                        </div>
                      )}

                      <div>
                        <input
                          type="text"
                          value={notesMap[docKey] || ''}
                          onChange={(e) => handleNoteChange(docKey, e.target.value)}
                          placeholder="اكتب قرار الأستاذ أو سبب القبول/الرفض..."
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const scoreNum = !isExcuse ? Number(defaultOverride) : undefined;
                            onApprove(req, scoreNum, notesMap[docKey]);
                          }}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow whitespace-nowrap shrink-0"
                        >
                          <Check size={14} />
                          <span>
                            {isExcuse ? 'قبول وتحويل لـ (مجاز)' : 'قبول وتعديل الدرجة'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onReject(req, notesMap[docKey])}
                          className="py-2 px-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <X size={14} />
                          <span>رفض الطلب</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold">القرار النهائي المعتمد:</span>
                        <span className={`font-bold ${statusTextClass}`}>{req.status}</span>
                      </div>
                      <p className="text-slate-200 font-medium">
                        {req.professorNote || 'تم البتّ في الطلب رسمياً'}
                      </p>
                      {req.resolvedAt && (
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums" dir="ltr">
                          تاريخ القرار: {req.resolvedAt}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="bg-slate-900/80 border border-dashed border-slate-800 rounded-2xl py-12 text-center">
            <p className="text-sm font-bold text-slate-300">لا توجد طلبات مطابقة للفلتر المحدد</p>
            <p className="text-xs text-slate-500 mt-1">
              جميع طلبات الإجازات والاعتراضات المرفوعة من الطلبة ستظهر هنا للمراجعة والاعتماد.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
