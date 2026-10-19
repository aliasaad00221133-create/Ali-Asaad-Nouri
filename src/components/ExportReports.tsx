import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { AttendanceRecord, GradeRecord, Student, Subject } from '../types.ts';
import { getArabicGradeTitle } from '../utils/grading.ts';

interface ExportReportsProps {
  subject: Subject;
  students: Student[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  addLog: (action: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ExportReports: React.FC<ExportReportsProps> = ({
  subject,
  students,
  attendance,
  grades,
  addLog,
  showToast,
}) => {
  const [exporting, setExporting] = useState(false);

  const exportExcel = (type: 'attendance' | 'grades') => {
    setExporting(true);
    try {
      if (type === 'attendance') {
        const subRecords = (attendance || []).filter((r) => r.subjectId === subject.docId);
        const dates = [...new Set(subRecords.map((r) => r.date))].sort();

        const data = (students || []).map((s) => {
          const row: Record<string, string | number> = {
            'الرقم الجامعي': s.id,
            'اسم الطالب': s.name,
            'رقم الهاتف': s.phone || '-',
            'المرحلة': s.level,
            'القسم': s.department,
          };

          let presentCount = 0;
          dates.forEach((d) => {
            const rc = subRecords.find((x) => x.studentId === s.id && x.date === d);
            row[d] = rc ? rc.status : '-';
            if (rc?.status === 'حاضر') presentCount++;
          });

          row['إجمالي الحضور'] = presentCount;
          row['إجمالي المحاضرات'] = dates.length;
          row['نسبة الالتزام'] =
            dates.length > 0 ? `${Math.round((presentCount / dates.length) * 100)}%` : '0%';

          return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'سجل الحضور');
        XLSX.writeFile(wb, `سجل_حضور_${subject.name}.xlsx`);

        addLog(`تصدير مصفوفة حضور Excel لمادة ${subject.name}`);
        showToast('تم تصدير كشف الحضور والغياب بنجاح!');
      } else {
        const subGrades = (grades || []).filter((g) => g.subjectId === subject.docId);

        const data = (students || []).map((s) => {
          const rc = subGrades.find((g) => g.studentId === s.id) || ({} as Partial<GradeRecord>);
          const total = rc.total || 0;

          return {
            'الرقم الجامعي': s.id,
            'اسم الطالب': s.name,
            'الهاتف': s.phone || '-',
            'تقرير (10)': rc.report || 0,
            'حضور (10)': rc.attendanceScore || 0,
            'مختبر (20)': rc.lab || 0,
            'فصلي Mid (30)': rc.midterm || 0,
            'كويز (30)': rc.quiz || 0,
            'المجموع الكلي (100)': total,
            'التقدير': getArabicGradeTitle(total),
          };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'كشف الدرجات');
        XLSX.writeFile(wb, `كشف_درجات_${subject.name}.xlsx`);

        addLog(`تصدير كشف درجات Excel لمادة ${subject.name}`);
        showToast('تم تصدير كشف الدرجات التفصيلي بنجاح!');
      }
    } catch {
      showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
    }
    setExporting(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
          <Download size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">تصدير الكشوفات والسجلات الرسمية (Excel)</h3>
          <p className="text-slate-400 text-xs">
            تحميل التقارير المعتمدة بصيغة جداول بيانات متوافقة مع كافة الأنظمة الجامعية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => exportExcel('attendance')}
          disabled={exporting}
          className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all flex flex-col items-center gap-3 text-emerald-400 font-bold cursor-pointer disabled:opacity-50"
        >
          <FileSpreadsheet size={32} />
          <span className="text-sm">تحميل كشف مصفوفة الحضور والغياب (Excel)</span>
          <span className="text-[11px] text-slate-400 font-normal">
            يتضمن تواريخ كافة المحاضرات ونسب المواظبة لكل طالب
          </span>
        </button>

        <button
          type="button"
          onClick={() => exportExcel('grades')}
          disabled={exporting}
          className="p-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all flex flex-col items-center gap-3 text-cyan-400 font-bold cursor-pointer disabled:opacity-50"
        >
          <FileText size={32} />
          <span className="text-sm">تحميل كشف الدرجات والسعي التفصيلي (Excel)</span>
          <span className="text-[11px] text-slate-400 font-normal">
            يشمل توزيع التقارير، الحضور، المختبر، الفصلي والكويزات والتقدير
          </span>
        </button>
      </div>
    </div>
  );
};
