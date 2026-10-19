import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Award,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizSubmission, Subject } from '../types.ts';
import {
  computeQuizAnalytics,
  formatQuizLaunchTelegram,
} from '../utils/quizzes.ts';

interface ProfessorQuizzesManagerProps {
  quizzes: Quiz[];
  submissions: QuizSubmission[];
  subjects: Subject[];
  selectedSubject?: Subject | null;
  professorName: string;
  isAdminView?: boolean;
  onAddQuiz: (quiz: Omit<Quiz, 'docId'>) => void;
  onToggleQuizActive: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ProfessorQuizzesManager: React.FC<ProfessorQuizzesManagerProps> = ({
  quizzes,
  submissions,
  subjects,
  selectedSubject,
  professorName,
  isAdminView = false,
  onAddQuiz,
  onToggleQuizActive,
  onDeleteQuiz,
  onNotification,
  showToast,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');

  // New Quiz Form State
  const [subjectId, setSubjectId] = useState<string>(
    selectedSubject?.docId || subjects[0]?.docId || 'sub-1'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [autoSyncToGrades, setAutoSyncToGrades] = useState<boolean>(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q-1',
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      points: 10,
      explanation: '',
    },
    {
      id: 'q-2',
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      points: 10,
      explanation: '',
    },
  ]);

  const displayedQuizzes = isAdminView
    ? quizzes || []
    : (quizzes || []).filter(
        (q) => !selectedSubject || q.subjectId === selectedSubject.docId
      );

  const displayedSubmissions = (submissions || []).filter((s) => {
    if (!isAdminView && selectedSubject && s.subjectId !== selectedSubject.docId) {
      return false;
    }
    if (selectedQuizFilter !== 'all' && s.quizId !== selectedQuizFilter) {
      return false;
    }
    return true;
  });

  const handleQuestionChange = (
    idx: number,
    field: keyof QuizQuestion,
    value: any
  ) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qIdx].options] as [string, string, string, string];
      opts[optIdx] = value;
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  const handleAddQuestionSlot = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: 'q-' + (prev.length + 1),
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        points: 5,
        explanation: '',
      },
    ]);
  };

  const handleCreateQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('يرجى إدخال عنوان الاختبار الإلكتروني', 'error');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].questionText.trim()) {
        showToast(`يرجى كتابة نص السؤال رقم ${i + 1}`, 'error');
        return;
      }
      if (questions[i].options.some((o) => !o.trim())) {
        showToast(`يرجى تعبئة جميع الخيارات الأربعة للسؤال رقم ${i + 1}`, 'error');
        return;
      }
    }

    const targetSub =
      selectedSubject ||
      subjects.find((s) => s.docId === subjectId) ||
      subjects[0];

    const totalPoints = questions.reduce((acc, q) => acc + Number(q.points || 5), 0);

    const newQuiz: Omit<Quiz, 'docId'> = {
      subjectId: targetSub?.docId || 'sub-1',
      subjectName: targetSub?.name || 'مقرر دراسي',
      professorName: professorName,
      title: title.trim(),
      description: description.trim() || undefined,
      durationMinutes: Math.max(1, Number(durationMinutes) || 10),
      maxScore: totalPoints,
      isActive: true,
      autoSyncToGrades,
      createdAt: new Date().toISOString().split('T')[0],
      questions,
    };

    onAddQuiz(newQuiz);
    setTitle('');
    setDescription('');
    setShowCreateForm(false);
  };

  const totalSubCount = displayedSubmissions.length;
  const avgEarned =
    totalSubCount > 0
      ? (
          displayedSubmissions.reduce((a, b) => a + b.earnedScore, 0) /
          totalSubCount
        ).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            {isAdminView
              ? 'إدارة الاختبارات الإلكترونية القصيرة والتصحيح الآلي'
              : `الاختبارات القصيرة والكويزات — ${selectedSubject?.name || ''}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            إعداد الاختبارات المؤقتة، متابعة تسليمات الطلبة الفورية، ومزامنة درجات الكويز مع سجل السعي تلقائياً
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0"
        >
          <Plus size={15} />
          <span>{showCreateForm ? 'إغلاق نموذج الإنشاء' : 'إنشاء اختبار قصير جديد'}</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold mb-1">الاختبارات المنشورة</p>
            <p className="text-2xl font-black text-white font-mono tabular-nums">
              {displayedQuizzes.length}
            </p>
          </div>
          <Clock size={22} className="text-blue-400" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold mb-1">إجمالي تسليمات الطلبة</p>
            <p className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {totalSubCount}
            </p>
          </div>
          <Users size={22} className="text-emerald-400" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold mb-1">متوسط درجات التسليم</p>
            <p className="text-2xl font-black text-cyan-400 font-mono tabular-nums">
              {avgEarned} <span className="text-xs text-slate-500">/ 20</span>
            </p>
          </div>
          <TrendingUp size={22} className="text-cyan-400" />
        </div>
      </div>

      {/* Create New Quiz Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateQuizSubmit}
          className="bg-slate-900/90 border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-5"
        >
          <h4 className="text-base font-black text-white pb-3 border-b border-slate-800">
            إعداد ونشر اختبار قصير مؤقت للطلبة
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isAdminView && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  المادة الدراسية
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                >
                  {subjects.map((s) => (
                    <option key={s.docId} value={s.docId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={isAdminView ? 'md:col-span-1' : 'md:col-span-2'}>
              <label
                htmlFor="quiz-title-input"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                عنوان الاختبار القصير
              </label>
              <input
                id="quiz-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: الكويز الثاني: أمن الشبكات والتشفير..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="quiz-duration-input"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                المدة الزمنية (بالدقائق)
              </label>
              <input
                id="quiz-duration-input"
                type="number"
                min={1}
                max={60}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono tabular-nums text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                أسئلة الاختبار ({questions.length} أسئلة)
              </span>
              <button
                type="button"
                onClick={handleAddQuestionSlot}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                + إضافة سؤال إضافي
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={q.id || qIdx}
                className="py-4 border-b border-slate-800/80 last:border-b-0 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-9">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      نص السؤال {qIdx + 1}
                    </label>
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) =>
                        handleQuestionChange(qIdx, 'questionText', e.target.value)
                      }
                      placeholder="اكتب السؤال العلمي هنا..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      الإجابة الصحيحة
                    </label>
                    <select
                      value={q.correctOptionIndex}
                      onChange={(e) =>
                        handleQuestionChange(
                          qIdx,
                          'correctOptionIndex',
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 outline-none focus:border-blue-500"
                    >
                      <option value={0}>الخيار الأول (1)</option>
                      <option value={1}>الخيار الثاني (2)</option>
                      <option value={2}>الخيار الثالث (3)</option>
                      <option value={3}>الخيار الرابع (4)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {q.options.map((opt, optIdx) => (
                    <input
                      key={optIdx}
                      type="text"
                      value={opt}
                      onChange={(e) =>
                        handleOptionChange(qIdx, optIdx, e.target.value)
                      }
                      placeholder={`الخيار ${optIdx + 1}`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncToGrades}
                onChange={(e) => setAutoSyncToGrades(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>مزامنة درجة الطالب تلقائياً مع حقل الكويز (/20) في سجل السعي</span>
            </label>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              نشر الاختبار وتفعيله للطلبة
            </button>
          </div>
        </form>
      )}

      {/* Published Quizzes List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h4 className="text-base font-black text-white">
          قائمة الاختبارات القصيرة المعتمدة ({displayedQuizzes.length})
        </h4>

        <div className="divide-y divide-slate-800/80">
          {displayedQuizzes.map((q) => {
            const stats = computeQuizAnalytics(q.docId || '', submissions);
            return (
              <div
                key={q.docId || q.title}
                className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-bold text-cyan-400">{q.subjectName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {q.durationMinutes} دقيقة
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {q.questions.length} أسئلة ({q.maxScore} درجة)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        q.isActive
                          ? 'text-emerald-400 font-bold'
                          : 'text-slate-500 font-bold'
                      }
                    >
                      {q.isActive ? 'متاح للطلبة' : 'مغلق'}
                    </span>
                  </div>

                  <h5 className="text-sm sm:text-base font-black text-white">
                    {q.title}
                  </h5>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>
                      التسليمات:{' '}
                      <strong className="font-mono tabular-nums text-white">
                        {stats.totalSubmissions}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      المتوسط:{' '}
                      <strong className="font-mono tabular-nums text-cyan-400">
                        {stats.averageScore} / {q.maxScore}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      نسبة النجاح:{' '}
                      <strong className="font-mono tabular-nums text-emerald-400">
                        {stats.passRatePercent}%
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => q.docId && onToggleQuizActive(q.docId)}
                    className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {q.isActive ? (
                      <>
                        <ToggleRight size={15} className="text-emerald-400" />
                        <span>إغلاق التقديم</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={15} className="text-slate-400" />
                        <span>إعادة التفعيل</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onNotification(formatQuizLaunchTelegram(q));
                      showToast('تم إرسال إشعار الاختبار عبر تيليجرام للطلبة!');
                    }}
                    className="px-3.5 py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Send size={13} />
                    <span>إشعار تيليجرام</span>
                  </button>

                  {q.docId && (
                    <button
                      type="button"
                      aria-label={`حذف ${q.title}`}
                      onClick={() => onDeleteQuiz(q.docId!)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {displayedQuizzes.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-500">
              لا توجد اختبارات قصيرة منشورة لهذا المقرر حالياً.
            </p>
          )}
        </div>
      </div>

      {/* Student Submissions & Auto-Grading Log Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-white">
              سجل تسليمات الطلبة والتصحيح الفوري ({displayedSubmissions.length})
            </h4>
            <p className="text-xs text-slate-400">
              الدرجات تُحتسب آلياً وتُحدّث حقل الكويز (/20) في سجل درجات السعي للطالب
            </p>
          </div>

          <select
            aria-label="تصفية التسليمات حسب الاختبار"
            value={selectedQuizFilter}
            onChange={(e) => setSelectedQuizFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
          >
            <option value="all">جميع الاختبارات ({displayedQuizzes.length})</option>
            {displayedQuizzes.map((q) => (
              <option key={q.docId} value={q.docId}>
                {q.title}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3 font-bold">اسم الطالب</th>
                <th className="py-3 px-3 font-bold">الاختبار والمقرر</th>
                <th className="py-3 px-3 font-bold">الإجابات الصحيحة</th>
                <th className="py-3 px-3 font-bold">الدرجة المكتسبة</th>
                <th className="py-3 px-3 font-bold">زمن الإنجاز</th>
                <th className="py-3 px-3 font-bold">تاريخ التسليم</th>
                <th className="py-3 px-3 font-bold">حالة الرصد بالسعي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedSubmissions.map((s) => (
                <tr
                  key={s.docId || `${s.quizId}-${s.studentId}`}
                  className="hover:bg-slate-950/50 transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-white">
                    <div>{s.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {s.studentId}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div className="font-bold text-white">{s.quizTitle}</div>
                    <div className="text-[11px] text-slate-500">{s.subjectName}</div>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-200 font-bold">
                    {s.correctCount} / {s.totalQuestions}
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums font-black text-emerald-400">
                    {s.earnedScore} / {s.maxScore}
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-400">
                    {Math.floor(s.timeSpentSeconds / 60)} د و{' '}
                    {s.timeSpentSeconds % 60} ثا
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-400">
                    {s.submittedAt}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-emerald-400 font-bold">
                      {s.syncedToGrades ? 'مرصود في السعي تلقائياً' : 'سجل تدريبي'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {displayedSubmissions.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-500">
              لا توجد تسليمات مسجلة لهذا الاختبار بعد.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
