import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Save, TrendingUp } from 'lucide-react';
import { GradeRecord, Student, Subject } from '../types.ts';
import { computeTotalScore, getArabicGradeTitle } from '../utils/grading.ts';

interface ProfessorGradesProps {
  subject: Subject;
  students: Student[];
  grades: GradeRecord[];
  onSave: (grades: GradeRecord[]) => Promise<void>;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog: (action: string) => void;
}

interface ScoreInput {
  report: string;
  attendanceScore: string;
  lab: string;
  midterm: string;
  quiz: string;
}

export const ProfessorGrades: React.FC<ProfessorGradesProps> = ({
  subject,
  students,
  grades,
  onSave,
  onNotification,
  showToast,
  addLog,
}) => {
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentGrades = (grades || []).filter((g) => g.subjectId === subject.docId);
    const m: Record<string, ScoreInput> = {};
    currentGrades.forEach((g) => {
      m[g.studentId] = {
        report: g.report !== undefined ? String(g.report) : '',
        attendanceScore: g.attendanceScore !== undefined ? String(g.attendanceScore) : '',
        lab: g.lab !== undefined ? String(g.lab) : '',
        midterm: g.midterm !== undefined ? String(g.midterm) : '',
        quiz: g.quiz !== undefined ? String(g.quiz) : '',
      };
    });
    setScores(m);
  }, [subject.docId, grades]);

  const handleFieldChange = (studentId: string, field: keyof ScoreInput, val: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { report: '', attendanceScore: '', lab: '', midterm: '', quiz: '' }),
        [field]: val,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const list: GradeRecord[] = (students || []).map((s) => {
      const sc = scores[s.id] || { report: '', attendanceScore: '', lab: '', midterm: '', quiz: '' };
      const rep = Number(sc.report) || 0;
      const att = Number(sc.attendanceScore) || 0;
      const lab = Number(sc.lab) || 0;
      const mid = Number(sc.midterm) || 0;
      const qz = Number(sc.quiz) || 0;
      const total = computeTotalScore({ report: rep, attendanceScore: att, lab, midterm: mid, quiz: qz });

      return {
        studentId: s.id,
        subjectId: subject.docId || 'sub',
        report: rep,
        attendanceScore: att,
        lab,
        midterm: mid,
        quiz: qz,
        total,
      };
    });

    await onSave(list);
    await onNotification(
      `<b>📈 إشعار رصد درجات رسمي</b>\n<b>المادة:</b> ${subject.name}\nتم تحديث ورصد درجات السعي الشاملة (تقارير، حضور، مختبر، فصلي، كويزات).`
    );

    addLog(`رصد درجات السعي التفصيلية لمادة ${subject.name}`);
    showToast('تم حفظ ورصد التقييمات الشاملة بنجاح!');
    setSaving(false);
  };

  const exportExcel = () => {
    try {
      const rows = (students || []).map((s) => {
        const sc = scores[s.id] || { report: '', attendanceScore: '', lab: '', midterm: '', quiz: '' };
        const rep = Number(sc.report) || 0;
        const att = Number(sc.attendanceScore) || 0;
        const lab = Number(sc.lab) || 0;
        const mid = Number(sc.midterm) || 0;
        const qz = Number(sc.quiz) || 0;
        const total = computeTotalScore({ report: rep, attendanceScore: att, lab, midterm: mid, quiz: qz });

        return {
          'الرقم الجامعي': s.id,
          'اسم الطالب': s.name,
          'رقم الهاتف': s.phone || '-',
          'المرحلة': s.level,
          'تقرير (10)': rep,
          'حضور (10)': att,
          'مختبر (20)': lab,
          'فصلي Mid (30)': mid,
          'كويزات (30)': qz,
          'المجموع الكلي (100)': total,
          'التقدير': getArabicGradeTitle(total),
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'درجات السعي');
      XLSX.writeFile(wb, `سجل_درجات_${subject.name}.xlsx`);

      addLog(`تصدير سجل درجات Excel لمادة ${subject.name}`);
      showToast('تم تصدير ملف الإكسل بنجاح!');
    } catch {
      showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-400" /> رصد الدرجات التفصيلية المعتمدة
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            تقارير (10) | حضور (10) | مختبر (20) | امتحان فصلي (30) | كويزات (30)
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={exportExcel}
            className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileSpreadsheet size={15} /> تصدير Excel شامل
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'جاري الحفظ...' : 'حفظ ورصد الدرجات'}
          </button>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <th className="p-3.5">اسم الطالب والرقم</th>
                <th className="p-3.5 text-center">تقرير (10)</th>
                <th className="p-3.5 text-center">حضور (10)</th>
                <th className="p-3.5 text-center">مختبر (20)</th>
                <th className="p-3.5 text-center">فصلي Mid (30)</th>
                <th className="p-3.5 text-center">كويز (30)</th>
                <th className="p-3.5 text-center text-cyan-400 font-black">المجموع (100)</th>
                <th className="p-3.5 text-center">التقدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(students || []).map((s) => {
                const sc = scores[s.id] || {
                  report: '',
                  attendanceScore: '',
                  lab: '',
                  midterm: '',
                  quiz: '',
                };
                const total = computeTotalScore({
                  report: sc.report,
                  attendanceScore: sc.attendanceScore,
                  lab: sc.lab,
                  midterm: sc.midterm,
                  quiz: sc.quiz,
                });
                const gradeTitle = getArabicGradeTitle(total);

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div>{s.name}</div>
                      <div className="text-[11px] font-mono text-slate-400" dir="ltr">
                        {s.id}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={sc.report}
                        onChange={(e) => handleFieldChange(s.id, 'report', e.target.value)}
                        placeholder="--"
                        className="w-14 text-center px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={sc.attendanceScore}
                        onChange={(e) => handleFieldChange(s.id, 'attendanceScore', e.target.value)}
                        placeholder="--"
                        className="w-14 text-center px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={sc.lab}
                        onChange={(e) => handleFieldChange(s.id, 'lab', e.target.value)}
                        placeholder="--"
                        className="w-14 text-center px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={sc.midterm}
                        onChange={(e) => handleFieldChange(s.id, 'midterm', e.target.value)}
                        placeholder="--"
                        className="w-14 text-center px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={sc.quiz}
                        onChange={(e) => handleFieldChange(s.id, 'quiz', e.target.value)}
                        placeholder="--"
                        className="w-14 text-center px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3.5 text-center font-black text-cyan-400 text-sm">
                      {total}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          total >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : total >= 50
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {gradeTitle}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(students || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center p-6 text-slate-500">
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
