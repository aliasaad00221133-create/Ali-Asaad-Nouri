import React, { useState } from 'react';
import {
  FileText,
  Scale,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  Calendar,
  BookOpen,
} from 'lucide-react';
import {
  AttendanceRecord,
  CurrentUser,
  GradeComponentField,
  GradeRecord,
  RequestType,
  StudentRequest,
  Subject,
} from '../types.ts';
import {
  GRADE_COMPONENT_LABELS,
  getGradeComponentLabel,
  getGradeComponentMax,
  countRequestsByStatus,
} from '../utils/requests.ts';

interface StudentRequestsPanelProps {
  student: CurrentUser;
  subjects: Subject[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  requests: StudentRequest[];
  onSubmitRequest: (req: Omit<StudentRequest, 'docId'>) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentRequestsPanel: React.FC<StudentRequestsPanelProps> = ({
  student,
  subjects,
  attendance,
  grades,
  requests,
  onSubmitRequest,
  showToast,
}) => {
  const [formType, setFormType] = useState<RequestType>('excuse');
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.docId || 'sub-1');
  const [absenceDate, setAbsenceDate] = useState<string>('2026-10-18');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [gradeComponent, setGradeComponent] = useState<GradeComponentField>('midterm');
  const [requestedScore, setRequestedScore] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'excuse' | 'appeal'>('all');

  const myRequests = (requests || []).filter((r) => r.studentId === student.id);
  const filteredRequests = myRequests.filter((r) =>
    filterType === 'all' ? true : r.type === filterType
  );

  const stats = countRequestsByStatus(myRequests);

  const selectedSubjectObj = subjects.find((s) => s.docId === subjectId) || subjects[0];
  const studentGradeForSub = (grades || []).find(
    (g) => g.studentId === student.id && g.subjectId === subjectId
  );

  const currentComponentScore = studentGradeForSub
    ? Number(studentGradeForSub[gradeComponent] || 0)
    : 0;
  const maxComponentScore = getGradeComponentMax(gradeComponent);

  // Student absences for quick selection
  const myAbsences = (attendance || []).filter(
    (a) => a.studentId === student.id && a.subjectId === subjectId && a.status === 'غائب'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !selectedSubjectObj) {
      showToast('يرجى اختيار المادة الدراسية أولاً', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('يرجى كتابة سبب الطلب أو التوضيح الرسمي', 'error');
      return;
    }

    if (formType === 'excuse') {
      if (!absenceDate) {
        showToast('يرجى تحديد تاريخ الغياب المطلوب تحويله إلى إجازة', 'error');
        return;
      }
      onSubmitRequest({
        studentId: student.id,
        studentName: student.name,
        subjectId,
        subjectName: selectedSubjectObj.name,
        type: 'excuse',
        status: 'قيد المراجعة',
        createdAt: new Date().toISOString().split('T')[0],
        absenceDate,
        attachmentUrl: attachmentUrl.trim() || undefined,
        reason: reason.trim(),
      });
    } else {
      const parsedReqScore = Number(requestedScore);
      if (!requestedScore.trim() || Number.isNaN(parsedReqScore)) {
        showToast('يرجى إدخال الدرجة المتوقعة بعد التدقيق', 'error');
        return;
      }
      if (parsedReqScore < 0 || parsedReqScore > maxComponentScore) {
        showToast(`الدرجة المطلوبة يجب أن تكون بين 0 و ${maxComponentScore}`, 'error');
        return;
      }
      onSubmitRequest({
        studentId: student.id,
        studentName: student.name,
        subjectId,
        subjectName: selectedSubjectObj.name,
        type: 'appeal',
        status: 'قيد المراجعة',
        createdAt: new Date().toISOString().split('T')[0],
        gradeComponent,
        currentScore: currentComponentScore,
        requestedScore: parsedReqScore,
        reason: reason.trim(),
      });
    }

    setReason('');
    setAttachmentUrl('');
    setRequestedScore('');
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي طلباتي المقدمة</span>
          <span className="text-2xl font-black text-white font-mono tabular-nums">{stats.total}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400/90 font-bold block mb-1">قيد المراجعة لدى الأستاذ</span>
          <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">{stats.pending}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400/90 font-bold block mb-1">طلبات مقبولة ومعتمدة</span>
          <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">{stats.approved}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400/90 font-bold block mb-1">طلبات مرفوضة</span>
          <span className="text-2xl font-black text-rose-400 font-mono tabular-nums">{stats.rejected}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column: Submit New Request */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-black text-white">تقديم طلب رسمي جديد للأستاذ</h3>
            <p className="text-xs text-slate-400 mt-1">
              يُرسل الطلب مباشرة إلى أستاذ المقرر للبتّ فيه وتحديث سجل الحضور أو الدرجات تلقائياً
            </p>
          </div>

          {/* Segmented Request Type Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setFormType('excuse')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                formType === 'excuse'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>طلب إجازة / عذر غياب</span>
            </button>
            <button
              type="button"
              onClick={() => setFormType('appeal')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                formType === 'appeal'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale size={14} />
              <span>اعتراض على درجة سعي</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                المقرر الدراسي المعني
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
              >
                {(subjects || []).map((sub) => (
                  <option key={sub.docId} value={sub.docId}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {formType === 'excuse' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    تاريخ المحاضرة المطلوب تحويل غيابها إلى (مجاز)
                  </label>
                  <input
                    type="date"
                    value={absenceDate}
                    onChange={(e) => setAbsenceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 outline-none"
                  />
                  {myAbsences.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <span>أيام غيابك المسجلة:</span>
                      {myAbsences.map((ab) => (
                        <button
                          key={ab.docId || ab.date}
                          type="button"
                          onClick={() => setAbsenceDate(ab.date)}
                          className="underline text-amber-400 hover:text-amber-300 font-mono cursor-pointer"
                        >
                          {ab.date}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    رابط التقرير الطبي أو الكتاب الرسمي (اختياري)
                  </label>
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      مفردة التقييم المعترض عليها
                    </label>
                    <select
                      value={gradeComponent}
                      onChange={(e) => setGradeComponent(e.target.value as GradeComponentField)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                    >
                      {(Object.keys(GRADE_COMPONENT_LABELS) as GradeComponentField[]).map((key) => (
                        <option key={key} value={key}>
                          {GRADE_COMPONENT_LABELS[key].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      الدرجة المتوقعة (من {maxComponentScore})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={maxComponentScore}
                      value={requestedScore}
                      onChange={(e) => setRequestedScore(e.target.value)}
                      placeholder={`المرصودة حالياً: ${currentComponentScore}`}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                  <span>الدرجة المرصودة حالياً في السجل:</span>
                  <span className="font-mono font-black text-cyan-400 tabular-nums">
                    {currentComponentScore} / {maxComponentScore}
                  </span>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {formType === 'excuse'
                  ? 'بيان العذر الرسمي أو السبب الموجب للإجازة'
                  : 'توضيح تفاصيل الاعتراض ومبررات طلب التدقيق'}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  formType === 'excuse'
                    ? 'مثال: إجازة مرضية مصدقة من المستشفى الجامعي أو مشاركة رسمية...'
                    : 'مثال: يرجى مراجعة جمع درجات السؤال الثاني في الورقة الامتحانية...'
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
            >
              <Send size={15} />
              <span>
                {formType === 'excuse'
                  ? 'إرسال طلب الإجازة لأستاذ المادة'
                  : 'رفع طلب تدقيق الدرجة لأستاذ المادة'}
              </span>
            </button>
          </form>
        </div>

        {/* List Column: Student Requests History & Status */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-white">سجل متابعة طلباتي واعتراضاتي</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديثات فورية لحالة الطلب وقرار أستاذ المادة مع الملاحظات الرسمية
              </p>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 self-start">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'excuse', label: 'الإجازات' },
                { id: 'appeal', label: 'الاعتراضات' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    filterType === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const isExcuse = req.type === 'excuse';
              const statusColor =
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
                  key={req.docId}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
                >
                  {/* Top metadata line (Zero-Pill Discipline: clean unboxed text with separators) */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-bold text-blue-400">
                        {isExcuse ? 'طلب إجازة رسمية' : 'اعتراض على درجة'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{req.createdAt}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300 font-medium">{req.subjectName}</span>
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
                      <StatusIcon size={14} />
                      <span>{req.status}</span>
                    </div>
                  </div>

                  {/* Core Request Details */}
                  <div className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
                    <p className="font-medium text-white mb-2">{req.reason}</p>

                    {isExcuse ? (
                      <div className="flex flex-wrap items-center gap-4 text-slate-400 pt-2 border-t border-slate-800/80">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          <span>تاريخ الغياب:</span>
                          <strong className="font-mono text-white tabular-nums">
                            {req.absenceDate || '-'}
                          </strong>
                        </span>
                        {req.attachmentUrl && (
                          <a
                            href={req.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            <ExternalLink size={12} />
                            <span>عرض المرفق / التقرير الرسمي</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4 text-slate-400 pt-2 border-t border-slate-800/80">
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={13} className="text-slate-500" />
                          <span>المفردة:</span>
                          <strong className="text-white">
                            {getGradeComponentLabel(req.gradeComponent)}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الدرجة السابقة:{' '}
                          <strong className="font-mono text-slate-300 tabular-nums">
                            {req.currentScore ?? 0}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الدرجة المطلوبة:{' '}
                          <strong className="font-mono text-cyan-400 tabular-nums">
                            {req.requestedScore ?? 0}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Professor Resolution Note if resolved */}
                  {req.professorNote && (
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-400 font-bold ml-1.5">رد أستاذ المادة:</span>
                        <span>{req.professorNote}</span>
                      </div>
                      {req.resolvedAt && (
                        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                          تاريخ البت: {req.resolvedAt}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredRequests.length === 0 && (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs font-bold text-slate-400">
                  لا توجد طلبات مسجلة ضمن هذا التصنيف حالياً.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  يمكنك استخدام النموذج المجاور لرفع طلب إجازة غياب أو طلب تدقيق درجة سعي.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
