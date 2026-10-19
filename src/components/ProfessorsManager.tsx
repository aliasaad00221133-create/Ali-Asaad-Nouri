import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Search,
  Lock,
  Unlock,
  Trash2,
  QrCode,
  Copy,
  Printer,
  X,
  CheckCircle2,
  Share2,
  Download,
  MessageSquare,
} from 'lucide-react';
import {
  BarcodeSession,
  Professor,
  ProfessorRoleType,
  Student,
  Subject,
} from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import {
  createBarcodeSessionObject,
  generateProfessorBarcodeId,
} from '../utils/barcode.ts';
import {
  buildProfessorInviteLink,
  buildProfessorInvitationMessage,
  generateStandaloneProfessorHtmlApp,
  buildAllProfessorsTelegramAnnouncement,
  generateUnifiedAllProfessorsOfficialHtmlApp,
  resolvePublicSharedOrigin,
} from '../utils/professorShare.ts';

interface ProfessorsManagerProps {
  professors: Professor[];
  subjects?: Subject[];
  barcodeSessions?: BarcodeSession[];
  students?: Student[];
  onAdd: (
    p: Omit<Professor, 'docId'>,
    initialSubjectName?: string,
    initialLectureTitle?: string
  ) => void;
  onCreateBarcodeSession?: (session: BarcodeSession, newSubject?: Omit<Subject, 'docId'>) => void;
  onToggleFreeze: (p: Professor) => void;
  onDelete: (docId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const ProfessorsManager: React.FC<ProfessorsManagerProps> = ({
  professors,
  subjects = [],
  barcodeSessions = [],
  students = [],
  onAdd,
  onCreateBarcodeSession,
  onToggleFreeze,
  onDelete,
  showToast,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleType, setRoleType] = useState<ProfessorRoleType>('أستاذ ضيف');
  const [department, setDepartment] = useState('هندسة تقنيات البرمجيات');
  const [initialSubject, setInitialSubject] = useState('');
  const [initialLecture, setInitialLecture] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ملاك دائم' | 'أستاذ ضيف'>('all');

  // Selected Professor for Barcode Modal
  const [selectedProfForQr, setSelectedProfForQr] = useState<Professor | null>(null);
  const [selectedProfForShare, setSelectedProfForShare] = useState<Professor | null>(null);
  const [shareProfUsername, setShareProfUsername] = useState<string>(
    professors[0]?.username || 'ali'
  );
  const [modalQrUrl, setModalQrUrl] = useState<string>('');
  const [newQuickLectureTitle, setNewQuickLectureTitle] = useState('');

  const activeShareProf =
    professors.find((p) => p.username === shareProfUsername) || professors[0] || null;

  useEffect(() => {
    if (!selectedProfForQr) {
      setModalQrUrl('');
      return;
    }
    let mounted = true;
    const code =
      selectedProfForQr.profCode || generateProfessorBarcodeId(selectedProfForQr.username);
    generateQRCodeDataUrl(code).then((url) => {
      if (mounted) setModalQrUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [selectedProfForQr]);

  const getOriginForSharing = () => {
    if (typeof window === 'undefined') return resolvePublicSharedOrigin();
    const loc = window.location.origin;
    if (loc.includes('localhost')) {
      return resolvePublicSharedOrigin();
    }
    return resolvePublicSharedOrigin(loc);
  };

  const handleCopyInviteLink = (prof: Professor) => {
    const link = buildProfessorInviteLink(getOriginForSharing(), prof, subjects, barcodeSessions);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
    if (showToast) {
      showToast(`تم نسخ رابط الدخول المباشر للأستاذ ${prof.name}`, 'success');
    }
  };

  const handleCopyInviteMessage = (prof: Professor) => {
    const link = buildProfessorInviteLink(getOriginForSharing(), prof, subjects, barcodeSessions);
    const msg = buildProfessorInvitationMessage(prof, link, subjects);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    if (showToast) {
      showToast(`تم نسخ بطاقة الدعوة الكاملة للأستاذ ${prof.name} لإرسالها عبر واتساب أو تيليجرام`, 'success');
    }
  };

  const handleDownloadStandaloneApp = async (prof: Professor) => {
    const code = prof.profCode || generateProfessorBarcodeId(prof.username);
    const qrUrl = await generateQRCodeDataUrl(code);
    const htmlContent = generateStandaloneProfessorHtmlApp(
      { ...prof, profCode: code },
      subjects,
      barcodeSessions,
      students,
      qrUrl
    );
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `بوابة-الأستاذ-${prof.username}.html`;
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) {
      showToast(
        `تم تنزيل ملف بوابة الأستاذ (${prof.name}) المستقل! يمكنك إرساله عبر واتساب أو تيليجرام ليعمل فوراً بدون رابط`,
        'success'
      );
    }
  };

  const handleDownloadUnifiedAllProfessorsApp = async () => {
    const qrMap: Record<string, string> = {};
    for (const p of professors) {
      const code = p.profCode || generateProfessorBarcodeId(p.username);
      qrMap[code] = await generateQRCodeDataUrl(code);
    }
    const html = generateUnifiedAllProfessorsOfficialHtmlApp(
      professors,
      subjects,
      barcodeSessions,
      students,
      qrMap
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'المنظومة-الرسمية-لجميع-الأساتذة-وتسجيل-الطلاب.html';
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) {
      showToast(
        'تم تنزيل (المنظومة الرسمية الموحدة لجميع الأساتذة)! ارفع هذا الملف في قناة أو قروب الأساتذة ليحمله كل أستاذ ويعمل به رسمياً',
        'success'
      );
    }
  };

  const handleCopyAllProfessorsAnnouncement = () => {
    const text = buildAllProfessorsTelegramAnnouncement(
      getOriginForSharing(),
      professors,
      subjects
    );
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (showToast) {
      showToast('تم نسخ التعميم الرسمي الموجه لجميع الأساتذة مع بيانات الدخول والباركود', 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) return;

    const generatedProfCode = generateProfessorBarcodeId(
      `${username.trim()}-${Date.now()}`
    );
    const qrDataUrl = await generateQRCodeDataUrl(generatedProfCode);

    onAdd(
      {
        profCode: generatedProfCode,
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        department: department.trim() || 'هندسة تقنيات البرمجيات',
        roleType,
        qrCode: qrDataUrl,
        isFrozen: false,
      },
      initialSubject.trim() || undefined,
      initialLecture.trim() || undefined
    );

    setName('');
    setUsername('');
    setPassword('');
    setInitialSubject('');
    setInitialLecture('');
  };

  const handleQuickCreateSessionForProf = async (prof: Professor) => {
    if (!onCreateBarcodeSession) return;
    const profCode = prof.profCode || generateProfessorBarcodeId(prof.username);
    const profSub = subjects.find(
      (s) => s.professorId === prof.docId || s.professorId === prof.username
    );
    const targetSub: Subject = profSub || {
      docId: `sub-${Date.now()}`,
      name: `مقرر ${prof.name}`,
      professorId: prof.docId || prof.username,
    };
    const newSubToCreate = profSub
      ? undefined
      : {
          name: targetSub.name,
          professorId: prof.docId || prof.username,
        };

    const title =
      newQuickLectureTitle.trim() ||
      `محاضرة الأستاذ ${prof.name} — التسجيل بالباركود`;

    const sess = createBarcodeSessionObject({
      professor: { ...prof, profCode },
      subject: targetSub,
      lectureTitle: title,
      room: 'قاعة الخوارزمي الكبرى (Hall A)',
      durationMinutes: 60,
    });
    sess.qrDataUrl = await generateQRCodeDataUrl(sess.qrPayload);

    onCreateBarcodeSession(sess, newSubToCreate);
    setNewQuickLectureTitle('');
  };

  const filtered = (professors || []).filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.profCode?.toLowerCase().includes(search.toLowerCase()) ||
      p.department?.toLowerCase().includes(search.toLowerCase());
    const pRole = p.roleType || 'ملاك دائم';
    const matchesRole = roleFilter === 'all' || pRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const copyCode = (code: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    if (showToast) {
      showToast(`تم نسخ باركود الأستاذ: ${code}`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Direct Professor App Delivery & Link Fix Center */}
      {activeShareProf && (
        <div className="bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-5">
          {/* Official All-Professors Mass Distribution Callout */}
          <div className="bg-slate-950 border border-blue-500/40 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-black text-blue-400">
                توزيع رسمي موحد لجميع أساتذة الكلية دفعة واحدة (لرفعه في قناة أو قروب الأساتذة):
              </div>
              <h4 className="text-sm sm:text-base font-black text-white">
                المنظومة الرسمية الموحدة لجميع الأساتذة وتسجيل الطلاب بالباركود (ملف واحد + تطبيق PWA)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                حمّل ملف <code>المنظومة-الرسمية-لجميع-الأساتذة-وتسجيل-الطلاب.html</code> وارفعه في <strong>مجموعة الواتساب أو قناة التليجرام الخاصة بالتدريسيين</strong> ليحمله كل أستاذ على هاتفه أو حاسوبه ويختار اسمه أو يسجل مادته ويولّد باركود المحاضرة ويصدّر كشف الحضور المصدق رسمياً!
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadUnifiedAllProfessorsApp}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download size={15} />
                <span>تنزيل المنظومة الموحدة لكل الأساتذة (.HTML)</span>
              </button>
              <button
                type="button"
                onClick={handleCopyAllProfessorsAnnouncement}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Copy size={14} />
                <span>نسخ التعميم الرسمي لقروب الأساتذة</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Share2 size={18} className="text-cyan-400" />
                <span>بوابة إرسال التطبيق للأستاذ (حل نهائي لمشكلة الرابط لا يعمل)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                اختر الأستاذ أدناه لإرسال بوابته الكاملة بطريقتين: إما كـ <strong>ملف تطبيق مستقل (.HTML) يعمل فوراً عبر واتساب وتيليجرام بدون رابط</strong>، أو عبر <strong>الرابط السحابي المشفر المباشر</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                اختر الأستاذ:
              </label>
              <select
                value={activeShareProf.username}
                onChange={(e) => setShareProfUsername(e.target.value)}
                aria-label="اختر الأستاذ لمشاركة التطبيق"
                className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold outline-none focus:border-cyan-400"
              >
                {professors.map((p) => (
                  <option key={p.docId || p.username} value={p.username}>
                    {p.name} ({p.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Option 1: Guaranteed Standalone File (Works 100% without server/link permissions) */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 min-w-0">
              <div className="space-y-1.5">
                <div className="text-xs font-black text-emerald-400">
                  الحل الأول (مضمون 100% — يعمل بدون رابط ولا يحتاج صلاحيات سحابية)
                </div>
                <h4 className="text-sm font-black text-white">
                  تنزيل ملف بوابة الأستاذ المستقلة ({activeShareProf.name})
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يُحمّل ملف تطبيق تفاعلي واحد (<code>بوابة-الأستاذ-{activeShareProf.username}.html</code>) يحتوي على باركود الأستاذ <code>{activeShareProf.profCode}</code> ومولّد جلسات الباركود وكشف حضور الطلبة. أرسل هذا الملف للأستاذ في <strong>واتساب أو تيليجرام</strong> وسيفتح معه فوراً على الهاتف أو الحاسوب!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadStandaloneApp(activeShareProf)}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download size={15} />
                  <span>تنزيل تطبيق الأستاذ المستقل (.HTML)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyInviteMessage(activeShareProf)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare size={14} />
                  <span>نسخ رسالة واتساب / تيليجرام</span>
                </button>
              </div>
            </div>

            {/* Option 2: Direct Cloud Shared Link (ais-pre) + Instructions */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 min-w-0">
              <div className="space-y-1.5">
                <div className="text-xs font-black text-cyan-400">
                  الحل الثاني (الرابط السحابي المباشر لبوابة الأستاذ — يُسجل دخوله تلقائياً)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>لماذا يظهر "الرابط لا يعمل" عند إرسال رابط المتصفح العادي؟</strong> لأن رابط <code>ais-dev</code> خاص بحساب المطور فقط. لكي يعمل الرابط العام (<code>ais-pre</code>) لدى الأستاذ، اضغط على زر <strong>Share (مشاركة)</strong> أو <strong>Deploy (نشر)</strong> في أعلى يمين نافذة Google AI Studio وفعّل خيار <strong>Public</strong>، ثم انسخ الرابط المشفر أدناه:
                </p>
                <div
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 truncate"
                  dir="ltr"
                >
                  {buildProfessorInviteLink(
                    getOriginForSharing(),
                    activeShareProf,
                    subjects,
                    barcodeSessions
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(activeShareProf)}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Copy size={14} />
                  <span>نسخ رابط الدخول المباشر للأستاذ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProfForShare(activeShareProf)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <QrCode size={14} />
                  <span>بطاقة الدعوة الكاملة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Professor / Visiting Lecturer + Auto Barcode Generation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="mb-5">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <User size={18} className="text-emerald-400" />
            <span>إضافة أستاذ جامعي أو أستاذ ضيف وتوليد باركود التسجيل تلقائياً</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            عند إضافة أي أستاذ جديد (ملاك دائم أو أستاذ ضيف)، يُنشئ النظام تلقائياً باركود خاص بالأستاذ (PRF-XXXXXX) وجلسة باركود محاضرة (BAR-XXXXXX) لكي يسجل الطلاب حضورهم عنده فوراً
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الاسم واللقب الأكاديمي
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أ.د. وسام الكيلاني"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الصفة الأكاديمية للأستاذ
              </label>
              <select
                value={roleType}
                onChange={(e) => setRoleType(e.target.value as ProfessorRoleType)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
              >
                <option value="أستاذ ضيف">أستاذ ضيف / محاضر زائر</option>
                <option value="ملاك دائم">أستاذ ملاك دائم</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم المستخدم للدخول
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="wissam"
                dir="ltr"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123"
                dir="ltr"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                القسم العلمي / التخصص الدقيق
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="هندسة تقنيات البرمجيات"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                المقرر المسند أو ندوة الأستاذ الضيف (لتوليد الباركود)
              </label>
              <input
                type="text"
                value={initialSubject}
                onChange={(e) => setInitialSubject(e.target.value)}
                placeholder="مثال: مبادئ الحوسبة الكمومية والأمن السيبراني"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                عنوان جلسة الباركود الأولى للطلاب (اختياري)
              </label>
              <input
                type="text"
                value={initialLecture}
                onChange={(e) => setInitialLecture(e.target.value)}
                placeholder="مثال: المحاضرة الافتتاحية وتسجيل الطلبة"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400">
              يتم إصدار رمز باركود الأستاذ (PRF-XXXXXX) وتفعيل جلسة تسجيل الطلبة فور الحفظ
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus size={16} />
              <span>إضافة الأستاذ وإنشاء باركود الطلاب</span>
            </button>
          </div>
        </form>
      </div>

      {/* Professors Directory & Barcode Management */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4">
          <div>
            <h3 className="text-base font-black text-white whitespace-nowrap">
              سجل الأساتذة والأساتذة الضيوف وباركود التسجيل ({(professors || []).length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              استعراض باركود كل أستاذ، إنشاء جلسات باركود للطلبة، وإدارة صلاحيات الدخول
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Role Filter Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'ملاك دائم', label: 'ملاك دائم' },
                { id: 'أستاذ ضيف', label: 'أستاذ ضيف' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    roleFilter === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 sm:w-64 relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="بحث بالاسم أو رمز الباركود PRF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3.5 whitespace-nowrap">الاسم الأكاديمي والصفة</th>
                <th className="p-3.5 whitespace-nowrap">باركود الأستاذ (QR)</th>
                <th className="p-3.5 whitespace-nowrap">المقررات وجلسات الباركود</th>
                <th className="p-3.5 whitespace-nowrap">بيانات الدخول</th>
                <th className="p-3.5 text-center whitespace-nowrap">الحالة</th>
                <th className="p-3.5 text-center whitespace-nowrap">الإجراءات والباركود</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((p) => {
                const profCode = p.profCode || generateProfessorBarcodeId(p.username);
                const profSubjects = subjects.filter(
                  (s) => s.professorId === p.docId || s.professorId === p.username
                );
                const profSessions = barcodeSessions.filter(
                  (bs) =>
                    bs.professorId === p.docId ||
                    bs.professorId === p.username ||
                    bs.profCode === profCode
                );
                const totalCheckedIn = profSessions.reduce(
                  (acc, s) => acc + s.registeredStudents.length,
                  0
                );

                return (
                  <tr
                    key={p.docId || p.username}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="font-bold text-white text-xs sm:text-sm">{p.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <span
                          className={
                            p.roleType === 'أستاذ ضيف'
                              ? 'text-amber-400 font-bold'
                              : 'text-cyan-400 font-bold'
                          }
                        >
                          {p.roleType || 'ملاك دائم'}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{p.department || 'هندسة تقنيات البرمجيات'}</span>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono tabular-nums font-black text-cyan-400 text-xs"
                          dir="ltr"
                        >
                          {profCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(profCode)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          title="نسخ باركود الأستاذ"
                          aria-label={`نسخ باركود الأستاذ ${p.name}`}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-200 font-bold">
                        {profSubjects.length > 0
                          ? profSubjects.map((s) => s.name).join(' ، ')
                          : 'محاضر عام / ندوات علمية'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                        {profSessions.length} جلسة باركود · {totalCheckedIn} طالب مسجل بالباركود
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-400 font-mono tabular-nums whitespace-nowrap" dir="ltr">
                      <span>{p.username}</span>
                      <span aria-hidden="true"> / </span>
                      <span className="text-slate-500">{p.password}</span>
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      {p.isFrozen ? (
                        <span className="text-rose-400 font-bold text-xs">مجمّد</span>
                      ) : (
                        <span className="text-emerald-400 font-bold text-xs">مفعّل</span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedProfForShare({ ...p, profCode })}
                          className="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        >
                          <Share2 size={13} />
                          <span>إرسال للأستاذ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedProfForQr({ ...p, profCode })}
                          className="px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        >
                          <QrCode size={13} />
                          <span>باركود الأستاذ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleFreeze(p)}
                          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                            p.isFrozen
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {p.isFrozen ? (
                            <>
                              <Unlock size={13} /> تفعيل
                            </>
                          ) : (
                            <>
                              <Lock size={13} /> تجميد
                            </>
                          )}
                        </button>

                        {p.docId && (
                          <button
                            type="button"
                            onClick={() => onDelete(p.docId!)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl cursor-pointer transition-colors"
                            title="حذف الأستاذ"
                            aria-label={`حذف الأستاذ ${p.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-500">
                    لا يوجد أساتذة مطابقين لنتائج البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professor Share & Invitation Modal */}
      {selectedProfForShare && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Share2 size={18} className="text-emerald-400" />
                  <span>بطاقة إرسال التطبيق وبيانات الدخول للأستاذ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedProfForShare.name} · {selectedProfForShare.roleType || 'ملاك دائم'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProfForShare(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 cursor-pointer"
                aria-label="إغلاق نافذة المشاركة"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-black text-emerald-400">
                1. الملف المستقل الجاهز للواتساب والتليجرام (يعمل 100% بدون أي رابط أو إنترنت)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                إذا كان الرابط السحابي لا يفتح لدى الأستاذ بسبب صلاحيات الحساب، قم بتنزيل هذا الملف التفاعلي وأرسله له كملف عبر واتساب أو تيليجرام ليفتحه مباشرة على هاتفه أو حاسوبه:
              </p>
              <button
                type="button"
                onClick={() => handleDownloadStandaloneApp(selectedProfForShare)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors"
              >
                <Download size={16} />
                <span>
                  تنزيل ملف بوابة الأستاذ ({selectedProfForShare.name}) المستقل (.HTML)
                </span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-black text-cyan-400">
                2. رسالة الدعوة الكاملة الجاهزة للنسخ والإرسال (الرابط + اسم المستخدم + كلمة المرور + الباركود)
              </div>
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {buildProfessorInvitationMessage(
                  selectedProfForShare,
                  buildProfessorInviteLink(
                    getOriginForSharing(),
                    selectedProfForShare,
                    subjects,
                    barcodeSessions
                  ),
                  subjects
                )}
              </pre>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyInviteMessage(selectedProfForShare)}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>نسخ الرسالة الكاملة للواتساب / تيليجرام</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(selectedProfForShare)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>نسخ الرابط فقط</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProfForShare(null)}
                className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professor Barcode & Session Generator Modal */}
      {selectedProfForQr && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <QrCode size={18} className="text-cyan-400" />
                  <span>بطاقة باركود الأستاذ وتسجيل الطلبة</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedProfForQr.name} · {selectedProfForQr.roleType || 'ملاك دائم'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProfForQr(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="p-3 bg-white rounded-2xl shadow border border-slate-200 shrink-0">
                {modalQrUrl ? (
                  <img
                    src={modalQrUrl}
                    alt={`QR ${selectedProfForQr.name}`}
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                    جاري التوليد...
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-right flex-1">
                <div className="text-xs text-slate-400">
                  {selectedProfForQr.department || 'هندسة تقنيات البرمجيات'}
                </div>
                <div className="text-base font-black text-white">{selectedProfForQr.name}</div>
                <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">
                    باركود الأستاذ الدائم لتسجيل الطلاب:
                  </span>
                  <span
                    className="font-mono tabular-nums text-base font-black text-cyan-400"
                    dir="ltr"
                  >
                    {selectedProfForQr.profCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  يستطيع أي طالب إدخال الرمز أعلاه أو مسح الباركود في بوابة الطالب لتسجيل حضوره مباشرة عند هذا الأستاذ
                </p>
              </div>
            </div>

            {/* Active Barcode Sessions for this Professor */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">
                جلسات باركود المحاضرات الفعالة لهذا الأستاذ:
              </div>
              {barcodeSessions
                .filter(
                  (s) =>
                    s.professorId === selectedProfForQr.docId ||
                    s.professorId === selectedProfForQr.username ||
                    s.profCode === selectedProfForQr.profCode
                )
                .slice(0, 3)
                .map((sess) => (
                  <div
                    key={sess.docId}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{sess.lectureTitle}</p>
                      <p className="text-[11px] text-slate-400">
                        {sess.subjectName} · المسجلون: {sess.registeredStudents.length}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <span
                        className="font-mono tabular-nums font-black text-emerald-400 block"
                        dir="ltr"
                      >
                        {sess.sessionCode}
                      </span>
                      <span className="text-[10px] text-slate-500">رمز الجلسة</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Quick Generate New Lecture Barcode Session for this Professor */}
            {onCreateBarcodeSession && (
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <label className="block text-xs font-bold text-slate-300">
                  توليد جلسة باركود محاضرة جديدة لهذا الأستاذ:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuickLectureTitle}
                    onChange={(e) => setNewQuickLectureTitle(e.target.value)}
                    placeholder="عنوان المحاضرة أو الندوة..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickCreateSessionForProf(selectedProfForQr)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    + إنشاء باركود
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyCode(selectedProfForQr.profCode || '')}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy size={14} /> نسخ باركود الأستاذ
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> طباعة
              </button>
              <button
                type="button"
                onClick={() => setSelectedProfForQr(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
