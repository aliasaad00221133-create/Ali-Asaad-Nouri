import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Maximize2,
  Plus,
  Printer,
  QrCode,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  BarcodeSession,
  Professor,
  Student,
  Subject,
} from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import {
  createBarcodeSessionObject,
  generateProfessorBarcodeId,
} from '../utils/barcode.ts';

interface ProfessorBarcodeHubProps {
  professor: Professor;
  subjects: Subject[];
  students: Student[];
  sessions: BarcodeSession[];
  onCreateSession: (session: BarcodeSession, newSubject?: Omit<Subject, 'docId'>) => void;
  onToggleSessionActive: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRegisterStudentInSession: (
    sessionOrCode: string,
    student: Student,
    method: 'qr' | 'code' | 'direct'
  ) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ProfessorBarcodeHub: React.FC<ProfessorBarcodeHubProps> = ({
  professor,
  subjects,
  students,
  sessions,
  onCreateSession,
  onToggleSessionActive,
  onDeleteSession,
  onRegisterStudentInSession,
  showToast,
}) => {
  const profSubjects = (subjects || []).filter(
    (s) => s.professorId === professor.docId || s.professorId === professor.username
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    profSubjects[0]?.docId || 'new'
  );
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [room, setRoom] = useState('قاعة الخوارزمي الكبرى (Hall A)');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  const [profQrUrl, setProfQrUrl] = useState<string>(professor.qrCode || '');
  const [sessionQrMap, setSessionQrMap] = useState<Record<string, string>>({});
  const [fullscreenSession, setFullscreenSession] = useState<BarcodeSession | null>(null);
  const [quickStudentId, setQuickStudentId] = useState<string>(students[0]?.id || '');

  const profCode = professor.profCode || generateProfessorBarcodeId(professor.username);

  useEffect(() => {
    if (profSubjects.length > 0 && selectedSubjectId === 'new') {
      setSelectedSubjectId(profSubjects[0].docId || 'new');
    }
  }, [profSubjects.length]);

  useEffect(() => {
    let mounted = true;
    generateQRCodeDataUrl(profCode).then((url) => {
      if (mounted && url) setProfQrUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [profCode]);

  const mySessions = (sessions || []).filter(
    (s) =>
      s.professorId === professor.docId ||
      s.professorId === professor.username ||
      s.profCode === profCode
  );

  useEffect(() => {
    let mounted = true;
    const buildQrs = async () => {
      const nextMap: Record<string, string> = {};
      for (const s of mySessions) {
        if (s.qrDataUrl) {
          nextMap[s.docId] = s.qrDataUrl;
        } else {
          const url = await generateQRCodeDataUrl(s.qrPayload);
          nextMap[s.docId] = url;
        }
      }
      if (mounted) setSessionQrMap(nextMap);
    };
    buildQrs();
    return () => {
      mounted = false;
    };
  }, [sessions, professor.docId]);

  const handleGenerateBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      showToast('يرجى إدخال عنوان المحاضرة أو الندوة العلمية', 'error');
      return;
    }

    let targetSubject: Subject;
    let newSubjectToCreate: Omit<Subject, 'docId'> | undefined;

    if (selectedSubjectId === 'new' || profSubjects.length === 0) {
      const subName = customSubjectName.trim() || `مقرر ${professor.name}`;
      const generatedSubId = `sub-${Date.now()}`;
      targetSubject = {
        docId: generatedSubId,
        name: subName,
        professorId: professor.docId || professor.username,
      };
      newSubjectToCreate = {
        name: subName,
        professorId: professor.docId || professor.username,
      };
    } else {
      const found = profSubjects.find((s) => s.docId === selectedSubjectId) || profSubjects[0];
      targetSubject = found;
    }

    const newSession = createBarcodeSessionObject({
      professor: { ...professor, profCode },
      subject: targetSubject,
      lectureTitle: lectureTitle.trim(),
      room: room.trim() || 'قاعة المحاضرات المركزية',
      durationMinutes,
    });

    const qrUrl = await generateQRCodeDataUrl(newSession.qrPayload);
    newSession.qrDataUrl = qrUrl;

    onCreateSession(newSession, newSubjectToCreate);
    setLectureTitle('');
    setCustomSubjectName('');
  };

  const copyText = (text: string, label: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast(`تم نسخ ${label}: ${text}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Split: Permanent Professor Barcode Card + Create New Lecture Barcode Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left/Right 4 cols: Professor Official Barcode Identity */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <QrCode size={16} />
                <span>الباركود الرسمي للأستاذ</span>
              </div>
              <span className="text-xs font-bold text-slate-300">
                {professor.roleType || 'ملاك دائم'} · {professor.department || 'الكلية التقنية'}
              </span>
            </div>

            <div className="flex flex-col items-center text-center bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-4">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 mb-3">
                {profQrUrl ? (
                  <img
                    src={profQrUrl}
                    alt={`باركود الأستاذ ${professor.name}`}
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs font-bold">
                    جاري التوليد...
                  </div>
                )}
              </div>
              <h3 className="text-base font-black text-white mb-1">{professor.name}</h3>
              <p className="text-xs text-slate-400 mb-2">
                الرمز الموحد لتسجيل الطلبة عند الأستاذ:
              </p>
              <div
                className="font-mono tabular-nums text-sm font-black text-cyan-400 tracking-wider bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-xl"
                dir="ltr"
              >
                {profCode}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copyText(profCode, 'باركود الأستاذ')}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Copy size={14} />
              <span>نسخ رمز الأستاذ</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Printer size={14} />
              <span>طباعة الهوية</span>
            </button>
          </div>
        </div>

        {/* 8 cols: Generator Form for New Lecture Barcode Session */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="mb-5">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-500" />
                <span>إنشاء باركود محاضرة أو ندوة لتسجيل حضور الطلاب عند الأستاذ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                أنشئ باركود تفاعلي خاص بمحاضرتك (سواء كنت أستاذ ملاك أو أستاذ ضيف) ليتمكن الطلبة من مسحه أو إدخال رمزه لتسجيل حضورهم الفوري عندك
              </p>
            </div>

            <form onSubmit={handleGenerateBarcode} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    المقرر الدراسي أو الندوة العلمية
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                  >
                    {profSubjects.map((s) => (
                      <option key={s.docId} value={s.docId}>
                        {s.name}
                      </option>
                    ))}
                    <option value="new">+ إضافة مقرر أو ندوة جديدة لهذا الأستاذ</option>
                  </select>
                </div>

                {(selectedSubjectId === 'new' || profSubjects.length === 0) ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      اسم المقرر الجديد أو موضوع الأستاذ الضيف
                    </label>
                    <input
                      type="text"
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      placeholder="مثال: أمن الشبكات السحابية المتقدمة"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      القاعة الدراسية أو المختبر
                    </label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="قاعة الخوارزمي الكبرى (Hall A)"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عنوان المحاضرة / الجلسة الحالية
                  </label>
                  <input
                    type="text"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                    placeholder="مثال: المحاضرة الرابعة — تصميم الأنظمة الموزعة وحماية البيانات"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    مدة صلاحية الباركود (دقيقة)
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono tabular-nums focus:border-blue-500 outline-none"
                  >
                    <option value={30}>30 دقيقة</option>
                    <option value={45}>45 دقيقة</option>
                    <option value={60}>60 دقيقة</option>
                    <option value={90}>90 دقيقة</option>
                    <option value={120}>120 دقيقة</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                <p className="text-xs text-slate-400">
                  سيتم توليد باركود QR فوري + رمز جلسة رقمي (BAR-XXXXXX) يظهر مباشرة في بوابة جميع الطلبة
                </p>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus size={16} />
                  <span>توليد باركود المحاضرة للطلاب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Active & Recent Professor Barcode Sessions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <QrCode size={18} className="text-emerald-400" />
              <span>جلسات باركود الأستاذ الفعالة وسجل حضور الطلاب ({mySessions.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              يمكن للطلاب مسح الباركود بالكاميرا أو إدخال رمز الجلسة (BAR-XXXXXX) أو رمز الأستاذ ({profCode}) للتسجيل الفوري
            </p>
          </div>

          {/* Quick Test Student Check-In for Professor Verification */}
          {mySessions.some((s) => s.isActive) && students.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold pr-2 whitespace-nowrap">
                محاكاة مسح طالب:
              </span>
              <select
                value={quickStudentId}
                onChange={(e) => setQuickStudentId(e.target.value)}
                aria-label="اختيار طالب لتجربة تسجيل الباركود"
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const activeSess = mySessions.find((s) => s.isActive);
                  const stu = students.find((st) => st.id === quickStudentId);
                  if (activeSess && stu) {
                    onRegisterStudentInSession(activeSess.sessionCode, stu, 'qr');
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                تسجيل بالباركود
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {mySessions.map((sess) => {
            const qrImg = sessionQrMap[sess.docId] || sess.qrDataUrl;
            return (
              <div
                key={sess.docId}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col xl:flex-row gap-6 justify-between"
              >
                {/* QR & Session Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 flex-1">
                  <div className="p-3 bg-white rounded-2xl shadow border border-slate-200 shrink-0">
                    {qrImg ? (
                      <img
                        src={qrImg}
                        alt={`باركود جلسة ${sess.sessionCode}`}
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-slate-400 text-xs font-bold">
                        باركود QR
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-center sm:text-right flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-bold">
                      <span className="text-blue-400">{sess.subjectName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sess.room}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{sess.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className={sess.isActive ? 'text-emerald-400' : 'text-rose-400'}>
                        {sess.isActive ? 'مفتوح لتسجيل الطلبة' : 'مغلق'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white">{sess.lectureTitle}</h4>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                      <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                        <span className="text-xs text-slate-400">رمز باركود الجلسة:</span>
                        <span
                          className="font-mono tabular-nums font-black text-sm text-emerald-400"
                          dir="ltr"
                        >
                          {sess.sessionCode}
                        </span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                        <span className="text-xs text-slate-400">باركود الأستاذ:</span>
                        <span
                          className="font-mono tabular-nums font-black text-sm text-cyan-400"
                          dir="ltr"
                        >
                          {sess.profCode}
                        </span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                        <Users size={14} className="text-blue-400" />
                        <span className="text-xs text-slate-300 font-bold">
                          الطلبة المسجلون:{' '}
                          <span className="font-mono tabular-nums text-white font-black">
                            {sess.registeredStudents.length}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setFullscreenSession(sess)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        <Maximize2 size={13} />
                        <span>عرض شاشة القاعة الكاملة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const header = [
                            'الرقم الجامعي',
                            'اسم الطالب',
                            'المرحلة',
                            'المقرر الدراسي',
                            'عنوان المحاضرة',
                            'الأستاذ المحاضر',
                            'رمز الجلسة',
                            'وقت التسجيل',
                          ];
                          const rows = sess.registeredStudents.map((st) => [
                            st.studentId,
                            st.studentName,
                            st.level || 'المرحلة الأولى',
                            sess.subjectName,
                            sess.lectureTitle,
                            sess.professorName,
                            sess.sessionCode,
                            st.scannedAt,
                          ]);
                          const csv =
                            '\uFEFF' +
                            [header, ...rows].map((r) => r.join(',')).join('\n');
                          const blob = new Blob([csv], {
                            type: 'text/csv;charset=utf-8;',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `كشف-حضور-رسمي-${sess.sessionCode}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          showToast(
                            `تم تصدير كشف الحضور الرسمي (${sess.registeredStudents.length} طالب) بصيغة Excel/CSV`,
                            'success'
                          );
                        }}
                        className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download size={13} />
                        <span>تصدير الكشف الرسمي (Excel)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(sess.sessionCode, 'رمز باركود المحاضرة')}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        <Copy size={13} />
                        <span>نسخ الرمز ({sess.sessionCode})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSessionActive(sess.docId)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors border whitespace-nowrap shrink-0 ${
                          sess.isActive
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {sess.isActive ? 'إغلاق التسجيل' : 'إعادة فتح التسجيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(sess.docId)}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>

                {/* Registered Students Live List */}
                <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-r border-slate-800 pt-4 xl:pt-0 xl:pr-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-emerald-400" />
                        <span>الطلبة المسجلون عبر هذا الباركود</span>
                      </span>
                      <span className="font-mono tabular-nums text-xs text-emerald-400 font-bold">
                        {sess.registeredStudents.length} طالب
                      </span>
                    </div>

                    {sess.registeredStudents.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {sess.registeredStudents.map((st, i) => (
                          <div
                            key={`${st.studentId}-${i}`}
                            className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-xl border border-slate-800/80 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{st.studentName}</p>
                              <p className="font-mono tabular-nums text-[11px] text-slate-400">
                                {st.studentId}
                              </p>
                            </div>
                            <div className="text-left shrink-0">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} /> حاضر
                              </span>
                              <span className="font-mono tabular-nums text-[10px] text-slate-500 block">
                                {st.scannedAt}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
                        بانتظار قيام الطلبة بمسح الباركود أو إدخال الرمز {sess.sessionCode}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {mySessions.length === 0 && (
            <div className="py-12 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800">
              <p className="text-sm font-bold text-slate-300 mb-1">
                لا توجد جلسات باركود منشأة لهذا الأستاذ حالياً
              </p>
              <p className="text-xs text-slate-500">
                استخدم النموذج أعلاه لتوليد باركود محاضرة جديد ليتمكن الطلبة من التسجيل عندك
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Projector Modal for Classroom Barcode Display */}
      {fullscreenSession && (
        <div
          className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="text-right">
                <p className="text-xs font-bold text-blue-400">{fullscreenSession.subjectName}</p>
                <h3 className="text-lg font-black text-white">{fullscreenSession.lectureTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenSession(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer"
                aria-label="إغلاق شاشة العرض"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 bg-white rounded-3xl shadow-2xl inline-block border-4 border-blue-500/30">
              {sessionQrMap[fullscreenSession.docId] ? (
                <img
                  src={sessionQrMap[fullscreenSession.docId]}
                  alt="Classroom Projection QR"
                  className="w-64 h-64 object-contain mx-auto"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-500 font-bold">
                  جاري التحميل...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block mb-1">رمز باركود الجلسة السريع</span>
                <span
                  className="font-mono tabular-nums text-lg font-black text-emerald-400 tracking-wider"
                  dir="ltr"
                >
                  {fullscreenSession.sessionCode}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block mb-1">باركود الأستاذ الموحد</span>
                <span
                  className="font-mono tabular-nums text-lg font-black text-cyan-400 tracking-wider"
                  dir="ltr"
                >
                  {fullscreenSession.profCode}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-bold">
              الأستاذ المحاضر: {fullscreenSession.professorName} · {fullscreenSession.room} · المسجلون الآن:{' '}
              <span className="font-mono tabular-nums text-emerald-400 font-black">
                {fullscreenSession.registeredStudents.length}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> طباعة لوحة الباركود
              </button>
              <button
                type="button"
                onClick={() => setFullscreenSession(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق الشاشة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
