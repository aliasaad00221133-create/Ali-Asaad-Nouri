import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Activity,
  AlertTriangle,
  Camera,
  Check,
  FileSpreadsheet,
  QrCode,
  Save,
  Search,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, Student, Subject } from '../types.ts';
import { countAbsencesForStudent, isEarlyWarningTriggered, calculateAttendancePercentage, cycleAttendanceStatus } from '../utils/attendance.ts';
import { QRScannerModal, LectureQRModal } from './Modals.tsx';

interface ProfessorAttendanceProps {
  subject: Subject;
  students: Student[];
  records: AttendanceRecord[];
  onSave: (records: AttendanceRecord[]) => Promise<void>;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog: (action: string) => void;
}

export const ProfessorAttendance: React.FC<ProfessorAttendanceProps> = ({
  subject,
  students,
  records,
  onSave,
  onNotification,
  showToast,
  addLog,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [showLectureQR, setShowLectureQR] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const todays = (records || []).filter(
      (r) => r.subjectId === subject.docId && r.date === date
    );
    const m: Record<string, AttendanceStatus> = {};
    todays.forEach((r) => {
      m[r.studentId] = r.status;
    });
    setStatusMap(m);
  }, [date, subject.docId, records]);

  const handleLookupAndMark = (identifier: string) => {
    const q = identifier.trim().toLowerCase();
    const stu = (students || []).find(
      (s) =>
        s.id.toLowerCase() === q ||
        s.phone?.toLowerCase() === q ||
        s.name.toLowerCase().includes(q)
    );

    if (stu) {
      setStatusMap((prev) => ({ ...prev, [stu.id]: 'حاضر' }));
      showToast(`تم تسجيل حضور: ${stu.name}`, 'success');
      addLog(`تسجيل حضور يدوي/سريع للطالب: ${stu.name} في مادة ${subject.name}`);
      setQuickInput('');
      setShowScanner(false);
    } else {
      showToast('لم يتم العثور على طالب بهذا الرقم أو الهاتف أو الاسم', 'error');
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      handleLookupAndMark(quickInput);
    }
  };

  const toggleStatus = (studentId: string) => {
    setStatusMap((prev) => {
      const current = prev[studentId];
      const next = cycleAttendanceStatus(current);
      const updated = { ...prev };
      if (next) {
        updated[studentId] = next;
      } else {
        delete updated[studentId];
      }
      return updated;
    });
  };

  const markAllPresent = () => {
    const m: Record<string, AttendanceStatus> = {};
    (students || []).forEach((s) => {
      m[s.id] = 'حاضر';
    });
    setStatusMap(m);
    showToast('تم تعليم جميع الطلاب كـ (حاضر)');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        let count = 0;
        const newMap = { ...statusMap };

        data.forEach((row) => {
          row.forEach((cell) => {
            if (cell !== undefined && cell !== null) {
              const val = String(cell).trim().toLowerCase();
              const stu = (students || []).find(
                (s) =>
                  s.id.toLowerCase() === val ||
                  s.phone?.toLowerCase() === val ||
                  s.name.toLowerCase().includes(val)
              );
              if (stu) {
                newMap[stu.id] = 'حاضر';
                count++;
              }
            }
          });
        });

        setStatusMap(newMap);
        showToast(`تم استيراد ${count} طالب كـ (حاضر) من ملف الإكسل بنجاح!`, 'success');
        addLog(`استيراد سجل حضور من ملف Excel لمادة ${subject.name}`);
      };
      reader.readAsBinaryString(file);
    } catch {
      showToast('حدث خطأ أثناء قراءة ملف الإكسل', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const finalRecs: AttendanceRecord[] = (students || []).map((s) => ({
      studentId: s.id,
      subjectId: subject.docId || 'sub',
      date,
      status: statusMap[s.id] || 'غائب',
    }));

    await onSave(finalRecs);
    const present = Object.values(statusMap).filter((v) => v === 'حاضر').length;
    const abs = (students || []).length - present;

    const reportMsg = `<b>📊 تقرير حضور ومواظبة رسمي</b>\n<b>المادة:</b> ${subject.name}\n<b>التاريخ:</b> ${date}\n✅ حاضر: ${present} | ❌ غائب: ${abs}`;
    await onNotification(reportMsg);

    addLog(`حفظ وتصدير تقرير حضور مادة ${subject.name} ليوم ${date}`);
    showToast('تم حفظ سجل الحضور بنجاح!');
    setSaving(false);
  };

  const presentCount = Object.values(statusMap).filter((v) => v === 'حاضر').length;
  const attendanceRate = calculateAttendancePercentage(presentCount, (students || []).length);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4">
        {/* Date Selector */}
        <div className="w-full lg:w-48">
          <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ المحاضرة</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
          />
        </div>

        {/* Quick Search and Mark */}
        <form onSubmit={handleQuickSubmit} className="flex-1 max-w-md">
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            تسجيل سريع (رقم جامعي / هاتف / اسم):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="اكتب واضغط Enter للتسجيل الفوري..."
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow"
            >
              تسجيل
            </button>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors">
            <FileSpreadsheet size={15} className="text-emerald-400" />
            <span>استيراد Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowLectureQR(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-colors"
          >
            <QrCode size={15} /> باركود المحاضرة
          </button>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Camera size={15} /> كاميرا
          </button>

          <button
            type="button"
            onClick={markAllPresent}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check size={15} /> الكل حاضر
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-colors disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'جاري الحفظ...' : 'حفظ وإرسال'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showScanner && (
        <QRScannerModal onScan={handleLookupAndMark} onClose={() => setShowScanner(false)} />
      )}
      {showLectureQR && (
        <LectureQRModal subject={subject} onClose={() => setShowLectureQR(false)} />
      )}

      {/* Attendance Sheet */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-blue-500" />
            <h3 className="text-base font-bold text-white">تفقد الطلاب ونظام الإنذار المبكر</h3>
          </div>
          <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
            نسبة الحضور اليومية: <span className="text-cyan-400 font-black">{attendanceRate}%</span> ({presentCount} من {(students || []).length})
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <th className="p-3.5">الرقم الجامعي / الهاتف</th>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5 text-center">الإنذار المبكر الذكي</th>
                <th className="p-3.5 text-center">حالة اليوم</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(students || []).map((s) => {
                const st = statusMap[s.id];
                const totalAbsences = countAbsencesForStudent(records, s.id, subject.docId);
                const isWarning = isEarlyWarningTriggered(totalAbsences, 3);

                const badge =
                  st === 'حاضر'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : st === 'غائب'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isWarning ? 'bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="p-3.5 text-slate-400 font-mono font-bold" dir="ltr">
                      <div>{s.id}</div>
                      <div className="text-[10px] text-slate-500">{s.phone}</div>
                    </td>
                    <td className="p-3.5 font-bold text-white">{s.name}</td>
                    <td className="p-3.5 text-center">
                      {isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full text-[11px] font-bold">
                          <AlertTriangle size={13} /> إنذار غياب متكرر ({totalAbsences})
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[11px] font-bold">
                          مواظب ({totalAbsences} غياب)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                          st ? badge : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                      >
                        {st || 'لم يُسجل'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleStatus(s.id)}
                        className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        تبديل
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(students || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-slate-500">
                    لا يوجد طلاب مسجلين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
