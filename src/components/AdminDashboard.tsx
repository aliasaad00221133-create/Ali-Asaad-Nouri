import React from 'react';
import { Users, User, BookOpen, Scale, Terminal, ShieldAlert, Share2 } from 'lucide-react';
import { AuditLog, SystemData } from '../types.ts';
import { RoomUtilizationChart } from './RoomUtilizationChart.tsx';
import { computeEarlyWarningRadar } from '../utils/transcript.ts';

interface AdminDashboardProps {
  data: SystemData;
  logs: AuditLog[];
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  data,
  logs,
  onNavigateTab,
}) => {
  const studentsCount = (data.students || []).length;
  const professorsCount = (data.professors || []).length;
  const subjectsCount = (data.subjects || []).length;
  const pendingRequestsCount = (data.requests || []).filter(
    (r) => r.status === 'قيد المراجعة'
  ).length;
  const earlyWarningsCount = computeEarlyWarningRadar(
    data.students || [],
    data.subjects || [],
    data.grades || [],
    data.attendance || []
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">لوحة المؤشرات والتحليلات الأكاديمية</h2>
          <p className="text-xs text-slate-400">إدارة مركزية شاملة لكافة القاعات والمقررات وشؤون الطلبة</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('professors')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 size={15} />
            <span>إرسال التطبيق للأستاذ (حل مشكلة الرابط)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('radar')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldAlert size={15} />
            <span>رادار الإنذار المبكر ولوحة الشرف ({earlyWarningsCount})</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('students')}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:border-blue-500/40 transition-all flex items-center justify-between text-right"
        >
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">الطلاب المسجلين</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">{studentsCount}</h3>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Users size={24} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('professors')}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-between text-right"
        >
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">هيئة التدريس</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">{professorsCount}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <User size={24} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('subjects')}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:border-cyan-500/40 transition-all flex items-center justify-between text-right"
        >
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">المواد والمقررات</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">{subjectsCount}</h3>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <BookOpen size={24} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('requests')}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:border-amber-500/40 transition-all flex items-center justify-between text-right"
        >
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">إجازات واعتراضات قيد المراجعة</p>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">{pendingRequestsCount}</h3>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Scale size={24} />
          </div>
        </button>
      </div>

      {/* Recharts Daily Room Hours Utilization Visualization */}
      <RoomUtilizationChart schedule={data.schedule || []} />

      {/* Audit Log Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-white">
          <Terminal size={18} className="text-cyan-400" /> سجل النشاطات والتدقيق المباشر (Audit Log)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          توثيق زمني فوري لكافة العمليات الإدارية، إسناد المواد، ورصد الحضور والدرجات.
        </p>

        <div
          className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 max-h-56 overflow-y-auto"
          dir="ltr"
        >
          {(logs || []).map((l, i) => (
            <div key={i} className="flex justify-between border-b border-slate-800/60 pb-1.5 gap-2">
              <span className="text-cyan-400 font-bold shrink-0 tabular-nums">[{l.time}]</span>
              <span className="flex-1 text-slate-200 text-right">{l.action}</span>
            </div>
          ))}
          {(logs || []).length === 0 && (
            <p className="text-slate-500 text-center py-4">لا توجد سجلات بعد...</p>
          )}
        </div>
      </div>
    </div>
  );
};

