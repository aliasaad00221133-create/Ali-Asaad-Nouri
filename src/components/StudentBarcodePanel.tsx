import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  QrCode,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AttendanceRecord,
  BarcodeSession,
  CurrentUser,
  Professor,
  Subject,
} from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import { generateProfessorBarcodeId } from '../utils/barcode.ts';
import { QRScannerModal } from './Modals.tsx';

interface StudentBarcodePanelProps {
  student: CurrentUser;
  professors: Professor[];
  subjects: Subject[];
  barcodeSessions: BarcodeSession[];
  attendance: AttendanceRecord[];
  onCheckInByCode: (
    rawCode: string,
    method: 'qr' | 'code' | 'direct'
  ) => {
    success: boolean;
    message: string;
    professorName?: string;
    subjectName?: string;
    sessionCode?: string;
    profCode?: string;
    checkInTime?: string;
  };
}

export const StudentBarcodePanel: React.FC<StudentBarcodePanelProps> = ({
  student,
  professors,
  subjects,
  barcodeSessions,
  attendance,
  onCheckInByCode,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ملاك دائم' | 'أستاذ ضيف'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [lastReceipt, setLastReceipt] = useState<{
    professorName: string;
    subjectName: string;
    sessionCode: string;
    profCode: string;
    checkInTime: string;
  } | null>(null);

  const activeSessions = (barcodeSessions || []).filter((s) => s.isActive);

  useEffect(() => {
    let mounted = true;
    const loadQrs = async () => {
      const next: Record<string, string> = {};
      for (const s of activeSessions) {
        if (s.qrDataUrl) {
          next[s.docId] = s.qrDataUrl;
        } else {
          next[s.docId] = await generateQRCodeDataUrl(s.qrPayload);
        }
      }
      if (mounted) setQrImages(next);
    };
    loadQrs();
    return () => {
      mounted = false;
    };
  }, [barcodeSessions]);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    const res = onCheckInByCode(codeInput.trim(), 'code');
    if (res.success && res.professorName && res.subjectName) {
      setLastReceipt({
        professorName: res.professorName,
        subjectName: res.subjectName,
        sessionCode: res.sessionCode || codeInput.trim().toUpperCase(),
        profCode: res.profCode || '-',
        checkInTime: res.checkInTime || new Date().toLocaleTimeString('ar-IQ'),
      });
      setCodeInput('');
    }
  };

  const handleDirectSessionCheckIn = (session: BarcodeSession) => {
    const res = onCheckInByCode(session.sessionCode, 'direct');
    if (res.success) {
      setLastReceipt({
        professorName: session.professorName,
        subjectName: session.subjectName,
        sessionCode: session.sessionCode,
        profCode: session.profCode,
        checkInTime: res.checkInTime || new Date().toLocaleTimeString('ar-IQ'),
      });
    }
  };

  const filteredSessions = activeSessions.filter((s) => {
    const role = s.professorRole || 'ملاك دائم';
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.professorName.toLowerCase().includes(q) ||
      s.subjectName.toLowerCase().includes(q) ||
      s.lectureTitle.toLowerCase().includes(q) ||
      s.sessionCode.toLowerCase().includes(q) ||
      s.profCode.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Split: Manual/Camera Barcode Scanner + Instant Verification Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1.5">
              <QrCode size={16} />
              <span>منظومة التسجيل الفوري بالباركود عند الأستاذ</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mb-1">
              سجّل حضورك عبر باركود الأستاذ أو رمز الجلسة
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              أدخل رمز باركود الأستاذ الدائم (PRF-XXXXXX) أو رمز جلسة المحاضرة (BAR-XXXXXX) أو امسح الباركود المعروض أمامك في القاعة
            </p>

            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                رمز باركود الأستاذ أو رمز جلسة المحاضرة:
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="مثال: BAR-101920 أو PRF-409120"
                  dir="ltr"
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono tabular-nums text-sm focus:border-blue-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <UserCheck size={16} />
                  <span>تسجيل حضوري عند الأستاذ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <Camera size={16} />
                  <span>مسح بالكاميرا</span>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>الطالب: {student.name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">الرقم الجامعي: {student.id}</span>
            <span aria-hidden="true">·</span>
            <span>يرتبط التسجيل تلقائياً بسجل الحضور والسعي لدى أستاذ المادة</span>
          </div>
        </div>

        {/* Right/Left 5 cols: Verification Receipt Box */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          {lastReceipt ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>إيصال تسجيل حضور موثق بالباركود</span>
                </span>
                <span className="font-mono tabular-nums text-xs text-slate-400">
                  {lastReceipt.checkInTime}
                </span>
              </div>

              <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">اسم الطالب:</span>
                  <span className="font-bold text-white">{student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الأستاذ المسجل لديه:</span>
                  <span className="font-bold text-cyan-400">{lastReceipt.professorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المقرر الدراسي:</span>
                  <span className="font-bold text-white">{lastReceipt.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رمز الباركود المعتمد:</span>
                  <span className="font-mono tabular-nums font-black text-emerald-400" dir="ltr">
                    {lastReceipt.sessionCode} ({lastReceipt.profCode})
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                تم تثبيت حضورك في سجل الأستاذ اليومي وتحديث نسبة المواظبة الخاصة بك بنجاح.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 space-y-2">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <ShieldCheck size={24} />
              </div>
              <h4 className="text-sm font-black text-white">حالة التحقق الفوري للباركود</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                اختر أي جلسة باركود أستاذ من القائمة أدناه أو أدخل رمز الأستاذ لتظهر وثيقة تأكيد حضورك الفورية هنا
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active Professor Barcode Sessions Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <QrCode size={18} className="text-emerald-400" />
              <span>
                باركودات الأساتذة والأساتذة الضيوف المفتوحة للتسجيل الآن ({filteredSessions.length})
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اضغط على زر التسجيل في بطاقة الأستاذ أو امسح الباركود الخاص به لتثبيت حضورك الفوري عنده
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              {[
                { id: 'all', label: 'جميع الأساتذة' },
                { id: 'ملاك دائم', label: 'أساتذة الملاك' },
                { id: 'أستاذ ضيف', label: 'الأساتذة الضيوف' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRoleFilter(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    roleFilter === t.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الأستاذ أو الرمز..."
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((sess) => {
            const myEntry = sess.registeredStudents.find((st) => st.studentId === student.id);
            const qrImg = qrImages[sess.docId] || sess.qrDataUrl;

            return (
              <div
                key={sess.docId}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-cyan-400">{sess.professorName}</span>
                    <span
                      className={`font-bold ${
                        sess.professorRole === 'أستاذ ضيف'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {sess.professorRole || 'ملاك دائم'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-900 border border-slate-800/80 p-3 rounded-2xl">
                    <div className="p-2 bg-white rounded-xl shrink-0">
                      {qrImg ? (
                        <img
                          src={qrImg}
                          alt={`QR ${sess.professorName}`}
                          className="w-20 h-20 object-contain"
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center text-slate-400 text-[10px]">
                          QR
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="text-[11px] text-slate-400">رمز الجلسة / الأستاذ:</div>
                      <div
                        className="font-mono tabular-nums font-black text-sm text-emerald-400"
                        dir="ltr"
                      >
                        {sess.sessionCode}
                      </div>
                      <div
                        className="font-mono tabular-nums font-bold text-xs text-cyan-400"
                        dir="ltr"
                      >
                        {sess.profCode}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-blue-400 mb-0.5">{sess.subjectName}</div>
                    <h4 className="text-sm font-black text-white leading-snug">
                      {sess.lectureTitle}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1.5">
                      <span>{sess.room}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{sess.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Users size={12} />
                        <span className="font-mono tabular-nums">
                          {sess.registeredStudents.length}
                        </span>{' '}
                        طالب مسجل
                      </span>
                    </div>
                  </div>
                </div>

                {myEntry ? (
                  <div className="w-full py-2.5 px-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      <span>تم تسجيل حضورك عند الأستاذ</span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px]">{myEntry.scannedAt}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDirectSessionCheckIn(sess)}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <QrCode size={15} />
                    <span>مسح وتسجيل حضوري عند الأستاذ</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory of All Professors & Direct Barcode Registration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-black text-white">
            دليل باركود الأساتذة والأساتذة الضيوف المعتمدين ({(professors || []).length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            يمكنك التسجيل مباشرة باستخدام الباركود الدائم لأي أستاذ مسجل في الكلية
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3.5 whitespace-nowrap">اسم الأستاذ</th>
                <th className="p-3.5 whitespace-nowrap">الصفة الأكاديمية والقسم</th>
                <th className="p-3.5 whitespace-nowrap">المقرر المسند</th>
                <th className="p-3.5 whitespace-nowrap">باركود الأستاذ الدائم</th>
                <th className="p-3.5 text-center whitespace-nowrap">حالة حضورك اليوم</th>
                <th className="p-3.5 text-center whitespace-nowrap">التسجيل بالباركود</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(professors || []).map((prof) => {
                const profCode = prof.profCode || generateProfessorBarcodeId(prof.username);
                const profSub = subjects.find(
                  (s) => s.professorId === prof.docId || s.professorId === prof.username
                );
                const isPresentToday = profSub
                  ? attendance.some(
                      (r) =>
                        r.studentId === student.id &&
                        r.subjectId === profSub.docId &&
                        r.date === today &&
                        r.status === 'حاضر'
                    )
                  : false;

                return (
                  <tr
                    key={prof.docId || prof.username}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 font-bold text-white whitespace-nowrap">{prof.name}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={
                          prof.roleType === 'أستاذ ضيف'
                            ? 'text-amber-400 font-bold'
                            : 'text-cyan-400 font-bold'
                        }
                      >
                        {prof.roleType || 'ملاك دائم'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-slate-400">{prof.department || 'الكلية التقنية'}</span>
                    </td>
                    <td className="p-3.5 text-slate-200 font-bold">
                      {profSub?.name || 'ندوات ومحاضرات عامة'}
                    </td>
                    <td
                      className="p-3.5 font-mono tabular-nums font-black text-cyan-400 whitespace-nowrap"
                      dir="ltr"
                    >
                      {profCode}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {isPresentToday ? (
                        <span className="text-emerald-400 font-bold">مسجل حاضر اليوم ✓</span>
                      ) : (
                        <span className="text-slate-400">غير مسجل بعد</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          const res = onCheckInByCode(profCode, 'direct');
                          if (res.success && res.professorName && res.subjectName) {
                            setLastReceipt({
                              professorName: res.professorName,
                              subjectName: res.subjectName,
                              sessionCode: res.sessionCode || profCode,
                              profCode,
                              checkInTime:
                                res.checkInTime || new Date().toLocaleTimeString('ar-IQ'),
                            });
                          }
                        }}
                        className="px-3.5 py-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        تسجيل بباركود الأستاذ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCameraModal && (
        <QRScannerModal
          title="امسح باركود الأستاذ أو المحاضرة"
          placeholder="BAR-101920 أو PRF-409120"
          onScan={(scanned) => {
            const res = onCheckInByCode(scanned, 'qr');
            if (res.success && res.professorName && res.subjectName) {
              setLastReceipt({
                professorName: res.professorName,
                subjectName: res.subjectName,
                sessionCode: res.sessionCode || scanned,
                profCode: res.profCode || '-',
                checkInTime: res.checkInTime || new Date().toLocaleTimeString('ar-IQ'),
              });
              setShowCameraModal(false);
            }
          }}
          onClose={() => setShowCameraModal(false)}
        />
      )}
    </div>
  );
};
