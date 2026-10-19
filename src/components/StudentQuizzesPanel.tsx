import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Award,
  Sliders,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  CurrentUser,
  GradeRecord,
  Quiz,
  QuizSubmission,
  Subject,
} from '../types.ts';
import {
  simulateCourseGrade,
  GradeSimulationInput,
} from '../utils/quizzes.ts';

interface StudentQuizzesPanelProps {
  student: CurrentUser;
  subjects: Subject[];
  quizzes: Quiz[];
  submissions: QuizSubmission[];
  grades: GradeRecord[];
  onSubmitQuiz: (
    quiz: Quiz,
    selectedAnswers: number[],
    timeSpentSeconds: number
  ) => QuizSubmission;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentQuizzesPanel: React.FC<StudentQuizzesPanelProps> = ({
  student,
  subjects,
  quizzes,
  submissions,
  grades,
  onSubmitQuiz,
  showToast,
}) => {
  const [subMode, setSubMode] = useState<'quizzes' | 'simulator'>('quizzes');

  // Active Quiz Taking State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [latestResult, setLatestResult] = useState<{
    quiz: Quiz;
    submission: QuizSubmission;
  } | null>(null);

  const startTimestampRef = useRef<number>(0);

  // Grade Simulator State
  const [simSubjectId, setSimSubjectId] = useState<string>(
    subjects[0]?.docId || 'sub-1'
  );
  const currentSubjectGrade = (grades || []).find(
    (g) => g.studentId === student.id && g.subjectId === simSubjectId
  );

  const [simValues, setSimValues] = useState<GradeSimulationInput>({
    report: currentSubjectGrade?.report ?? 8,
    attendanceScore: currentSubjectGrade?.attendanceScore ?? 8,
    lab: currentSubjectGrade?.lab ?? 16,
    midterm: currentSubjectGrade?.midterm ?? 22,
    quiz: currentSubjectGrade?.quiz ?? 15,
  });

  useEffect(() => {
    const found = (grades || []).find(
      (g) => g.studentId === student.id && g.subjectId === simSubjectId
    );
    if (found) {
      setSimValues({
        report: found.report,
        attendanceScore: found.attendanceScore,
        lab: found.lab,
        midterm: found.midterm,
        quiz: found.quiz,
      });
    } else {
      setSimValues({
        report: 8,
        attendanceScore: 9,
        lab: 16,
        midterm: 22,
        quiz: 15,
      });
    }
  }, [simSubjectId, grades, student.id]);

  // Countdown timer for active quiz
  useEffect(() => {
    if (!activeQuiz) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeQuiz]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (activeQuiz && remainingSeconds === 0 && startTimestampRef.current > 0) {
      handleFinishQuiz(true);
    }
  }, [remainingSeconds, activeQuiz]);

  const startQuizSession = (quiz: Quiz) => {
    setLatestResult(null);
    setActiveQuiz(quiz);
    setSelectedAnswers(new Array(quiz.questions.length).fill(-1));
    setRemainingSeconds(quiz.durationMinutes * 60);
    startTimestampRef.current = Date.now();
  };

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  };

  const handleFinishQuiz = (isAutoTimeout = false) => {
    if (!activeQuiz) return;

    if (!isAutoTimeout) {
      const unansweredCount = selectedAnswers.filter((a) => a === -1).length;
      if (unansweredCount > 0) {
        showToast(
          `يرجى الإجابة على جميع الأسئلة قبل التسليم (متبقي ${unansweredCount} سؤال)`,
          'error'
        );
        return;
      }
    }

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - startTimestampRef.current) / 1000)
    );
    const submission = onSubmitQuiz(activeQuiz, selectedAnswers, elapsedSeconds);
    setLatestResult({ quiz: activeQuiz, submission });
    setActiveQuiz(null);
    startTimestampRef.current = 0;
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const mySubmissions = (submissions || []).filter(
    (s) => s.studentId === student.id
  );

  const simResult = simulateCourseGrade(simValues);

  return (
    <div className="space-y-6">
      {/* Top Sub-Mode Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white">
            الاختبارات القصيرة التفاعلية ومُحاكي السعي الذكي
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            أداء الكويزات الفصلية بالتوقيت الفوري مع الرصد الآلي في السجل الأكاديمي وحساب الدرجة المستهدفة
          </p>
        </div>

        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSubMode('quizzes');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subMode === 'quizzes'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الاختبارات الإلكترونية ({(quizzes || []).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveQuiz(null);
              setSubMode('simulator');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subMode === 'simulator'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            مُحاكي السعي والتقدير
          </button>
        </div>
      </div>

      {/* MODE 1: ONLINE TIMED QUIZZES */}
      {subMode === 'quizzes' && (
        <>
          {/* Active Timed Quiz Runner */}
          {activeQuiz ? (
            <div className="bg-slate-900/90 border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs text-blue-400 font-bold mb-1">
                    <span>{activeQuiz.subjectName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeQuiz.professorName}</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-white">
                    {activeQuiz.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div
                    className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 font-mono tabular-nums text-sm font-black ${
                      remainingSeconds <= 60
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        : 'bg-slate-950 border-slate-800 text-cyan-400'
                    }`}
                  >
                    <Clock size={16} />
                    <span>{formatTimer(remainingSeconds)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    إلغاء والعودة
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {activeQuiz.questions.map((q, qIdx) => {
                  const chosen = selectedAnswers[qIdx];
                  return (
                    <div
                      key={q.id || qIdx}
                      className="pb-6 border-b border-slate-800/80 last:border-b-0 last:pb-0 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h5 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                          <span className="text-blue-400 font-mono tabular-nums ml-2">
                            0{qIdx + 1}.
                          </span>
                          {q.questionText}
                        </h5>
                        <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                          {q.points} درجات
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(qIdx, optIdx)}
                              className={`p-3.5 rounded-2xl border text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              <span className="leading-snug">{opt}</span>
                              <span
                                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono ${
                                  isSelected
                                    ? 'bg-blue-500 text-white'
                                    : 'border border-slate-700 text-slate-500'
                                }`}
                              >
                                {isSelected ? <Check size={12} /> : optIdx + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Footer */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  تمت الإجابة على{' '}
                  <span className="font-mono tabular-nums font-bold text-white">
                    {selectedAnswers.filter((a) => a !== -1).length}
                  </span>{' '}
                  من أصل{' '}
                  <span className="font-mono tabular-nums font-bold text-white">
                    {activeQuiz.questions.length}
                  </span>{' '}
                  أسئلة
                </div>

                <button
                  type="button"
                  onClick={() => handleFinishQuiz(false)}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 size={17} />
                  <span>تسليم الإجابات والتصحيح الفوري</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Instant Result Review Banner if student just submitted */}
              {latestResult && (
                <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-1">
                        <CheckCircle2 size={15} />
                        <span>تم التصحيح التلقائي ورصد الدرجة بنجاح</span>
                      </div>
                      <h4 className="text-lg font-black text-white">
                        نتيجة: {latestResult.quiz.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">
                          الدرجة المستحقة
                        </span>
                        <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                          {latestResult.submission.earnedScore} /{' '}
                          {latestResult.submission.maxScore}
                        </span>
                      </div>
                      <div className="text-right border-r border-slate-800 pr-5">
                        <span className="text-xs text-slate-400 block">
                          الإجابات الصحيحة
                        </span>
                        <span className="text-lg font-black text-white font-mono tabular-nums">
                          {latestResult.submission.correctCount} /{' '}
                          {latestResult.submission.totalQuestions}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Answer Key Review */}
                  <div className="space-y-3">
                    {latestResult.quiz.questions.map((q, idx) => {
                      const studentChoice =
                        latestResult.submission.answers[idx];
                      const isCorrect = studentChoice === q.correctOptionIndex;
                      return (
                        <div
                          key={q.id || idx}
                          className="py-3 border-b border-slate-800/70 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <p className="font-bold text-white">
                              {idx + 1}. {q.questionText}
                            </p>
                            <p className="text-slate-400">
                              إجابتك:{' '}
                              <span
                                className={
                                  isCorrect
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-rose-400 font-bold'
                                }
                              >
                                {q.options[studentChoice] || 'لم تتم الإجابة'}
                              </span>
                              {!isCorrect && (
                                <>
                                  {' '}
                                  · الإجابة الصحيحة:{' '}
                                  <span className="text-emerald-400 font-bold">
                                    {q.options[q.correctOptionIndex]}
                                  </span>
                                </>
                              )}
                            </p>
                            {q.explanation && (
                              <p className="text-slate-500">{q.explanation}</p>
                            )}
                          </div>
                          <span
                            className={`font-mono tabular-nums font-bold shrink-0 ${
                              isCorrect ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isCorrect ? `+${q.points} درجات` : '0 درجة'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available & Completed Quizzes Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {(quizzes || []).map((q) => {
                  const existingSub = mySubmissions.find(
                    (s) => s.quizId === q.docId
                  );

                  return (
                    <div
                      key={q.docId || q.title}
                      className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                          <span className="font-bold text-cyan-400">
                            {q.subjectName}
                          </span>
                          <span className="font-mono tabular-nums">
                            {q.durationMinutes} دقائق · {q.maxScore} درجة
                          </span>
                        </div>

                        <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                          {q.title}
                        </h4>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {q.description ||
                            'اختبار فصلي قصير يُصحح تلقائياً ويُضاف إلى حقل الكويزات في سجل السعي.'}
                        </p>

                        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>أستاذ المادة: {q.professorName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {q.questions.length} أسئلة
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              existingSub
                                ? 'text-emerald-400 font-bold'
                                : q.isActive
                                ? 'text-blue-400 font-bold'
                                : 'text-rose-400 font-bold'
                            }
                          >
                            {existingSub
                              ? `تم التسليم (${existingSub.earnedScore} / ${existingSub.maxScore})`
                              : q.isActive
                              ? 'متاح للاختبار الآن'
                              : 'مغلق حالياً'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                        {existingSub ? (
                          <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-slate-300">
                              الدرجة المرصودة في السعي:{' '}
                              <span className="font-mono tabular-nums font-black text-emerald-400">
                                {existingSub.normalizedQuizScore20} / 20
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => startQuizSession(q)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              إعادة المحاولة التدريبية
                            </button>
                          </div>
                        ) : q.isActive ? (
                          <button
                            type="button"
                            onClick={() => startQuizSession(q)}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg whitespace-nowrap"
                          >
                            <Play size={14} />
                            <span>بدء الاختبار القصير الآن</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-bold">
                            انتهت فترة التقديم لهذا الاختبار
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODE 2: INTERACTIVE GRADE & TARGET SCORE SIMULATOR */}
      {subMode === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Control Deck (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <Sliders size={18} className="text-blue-400" />
                    <span>مختبر محاكاة مفردات السعي الفصلي</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    حرّك المؤشرات لاستكشاف تأثير كل مفردة على مجموعك النهائي وتقديرك الجامعي
                  </p>
                </div>

                <select
                  aria-label="اختر المادة للمحاكاة"
                  value={simSubjectId}
                  onChange={(e) => setSimSubjectId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                >
                  {(subjects || []).map((s) => (
                    <option key={s.docId} value={s.docId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interactive Labeled Sliders */}
              <div className="space-y-4">
                {[
                  {
                    key: 'report' as const,
                    label: 'التقرير والمشاريع البحثية',
                    max: 10,
                  },
                  {
                    key: 'attendanceScore' as const,
                    label: 'المواظبة والالتزام بالحضور',
                    max: 10,
                  },
                  {
                    key: 'lab' as const,
                    label: 'المختبر والتطبيق العملي',
                    max: 20,
                  },
                  {
                    key: 'midterm' as const,
                    label: 'الامتحان الفصلي (Midterm)',
                    max: 30,
                  },
                  {
                    key: 'quiz' as const,
                    label: 'الاختبارات القصيرة (Quizzes)',
                    max: 20,
                  },
                ].map((item) => {
                  const val = simResult.clamped[item.key];
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor={`sim-${item.key}`}
                          className="font-bold text-slate-200"
                        >
                          {item.label}
                        </label>
                        <span className="font-mono tabular-nums font-bold text-cyan-400">
                          {val} / {item.max} درجات
                        </span>
                      </div>
                      <input
                        id={`sim-${item.key}`}
                        type="range"
                        min={0}
                        max={item.max}
                        step={1}
                        value={val}
                        onChange={(e) =>
                          setSimValues((prev) => ({
                            ...prev,
                            [item.key]: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preset Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (currentSubjectGrade) {
                    setSimValues({
                      report: currentSubjectGrade.report,
                      attendanceScore: currentSubjectGrade.attendanceScore,
                      lab: currentSubjectGrade.lab,
                      midterm: currentSubjectGrade.midterm,
                      quiz: currentSubjectGrade.quiz,
                    });
                  }
                }}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw size={13} />
                <span>استعادة درجتي الفعلية</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSimValues((prev) => ({ ...prev, quiz: 20 }))
                }
                className="px-3.5 py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                محاكاة الدرجة الكاملة بالكويز (20/20)
              </button>

              <button
                type="button"
                onClick={() =>
                  setSimValues({
                    report: 10,
                    attendanceScore: 10,
                    lab: 19,
                    midterm: 28,
                    quiz: 19,
                  })
                }
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                سيناريو استهداف الامتياز (86+)
              </button>
            </div>
          </div>

          {/* Interactive Stage / Projected Outcome (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-bold block mb-1">
                  النتيجة التقديرية المحسوبة للمقرر
                </span>
                <div className="flex items-baseline justify-between gap-4">
                  <div className="text-4xl sm:text-5xl font-black text-white font-mono tabular-nums">
                    {simResult.total}
                    <span className="text-lg text-slate-500 font-normal">
                      {' '}
                      / 100
                    </span>
                  </div>
                  <span
                    className={`text-base font-black ${
                      simResult.total >= 80
                        ? 'text-emerald-400'
                        : simResult.total >= 50
                        ? 'text-cyan-400'
                        : 'text-rose-400'
                    }`}
                  >
                    تقدير: {simResult.gradeTitle}
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-150 ${
                      simResult.total >= 85
                        ? 'bg-emerald-500'
                        : simResult.total >= 50
                        ? 'bg-blue-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, simResult.total)}%` }}
                  />
                </div>
              </div>

              {/* Component Distribution Summary */}
              <div className="grid grid-cols-5 gap-2 text-center py-2 border-b border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">تقرير</span>
                  <span className="font-mono tabular-nums font-bold text-white">
                    {simResult.clamped.report}/10
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">حضور</span>
                  <span className="font-mono tabular-nums font-bold text-white">
                    {simResult.clamped.attendanceScore}/10
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">مختبر</span>
                  <span className="font-mono tabular-nums font-bold text-white">
                    {simResult.clamped.lab}/20
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">فصلي</span>
                  <span className="font-mono tabular-nums font-bold text-white">
                    {simResult.clamped.midterm}/30
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">كويز</span>
                  <span className="font-mono tabular-nums font-bold text-cyan-400">
                    {simResult.clamped.quiz}/20
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>درجتك الفعلية الحالية في السجل:</span>
                <span className="font-mono tabular-nums font-bold text-white">
                  {currentSubjectGrade ? `${currentSubjectGrade.total} / 100` : 'غير مرصودة'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>الفرق عن الدرجة الفعلية:</span>
                <span
                  className={`font-mono tabular-nums font-bold ${
                    simResult.total - (currentSubjectGrade?.total || 0) >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {simResult.total - (currentSubjectGrade?.total || 0) >= 0
                    ? `+${simResult.total - (currentSubjectGrade?.total || 0)}`
                    : simResult.total - (currentSubjectGrade?.total || 0)}{' '}
                  درجة
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>أهلية لوحة الشرف وشهادة التقدير (≥ 85):</span>
                <span
                  className={`font-bold ${
                    simResult.isHonors ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {simResult.isHonors
                    ? 'مؤهل لشهادة التقدير'
                    : `يحتاج ${simResult.honorsPointsNeeded} درجات إضافية`}
                </span>
              </div>

              {simResult.nextTierTitle && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>للوصول إلى تقدير ({simResult.nextTierTitle}):</span>
                  <span className="font-mono tabular-nums font-bold text-cyan-400">
                    +{simResult.pointsToNextTier} درجات
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
