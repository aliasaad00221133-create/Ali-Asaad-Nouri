import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  LogIn,
  LogOut,
  DownloadCloud,
  UploadCloud,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { SystemData } from '../types.ts';

interface CloudSyncPanelProps {
  firebaseUser: FirebaseUser | null;
  cloudConnected: boolean;
  lastSyncedAt: string | null;
  syncVersion: number;
  isSyncing: boolean;
  data: SystemData;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onPushToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  firebaseUser,
  cloudConnected,
  lastSyncedAt,
  syncVersion,
  isSyncing,
  data,
  onGoogleSignIn,
  onGoogleSignOut,
  onPushToCloud,
  onPullFromCloud,
}) => {
  const [authBusy, setAuthBusy] = useState(false);

  const handleSignInClick = async () => {
    setAuthBusy(true);
    try {
      await onGoogleSignIn();
    } finally {
      setAuthBusy(false);
    }
  };

  const totalRecordsCount =
    (data.students?.length || 0) +
    (data.professors?.length || 0) +
    (data.subjects?.length || 0) +
    (data.attendance?.length || 0) +
    (data.grades?.length || 0) +
    (data.barcodeSessions?.length || 0) +
    (data.clearances?.length || 0) +
    (data.quizzes?.length || 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-1">
            <Cloud size={16} />
            <span>المزامنة السحابية اللحظية · Firebase Firestore Cloud</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            مركز قاعدة البيانات السحابية والمزامنة الفورية
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            حفظ واسترجاع فوري لكافة سجلات الطلبة، باركود الأساتذة، الحضور، الدرجات، وبراءات الذمة عبر Google Cloud Firestore
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!firebaseUser ? (
            <button
              type="button"
              disabled={authBusy}
              onClick={handleSignInClick}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn size={15} />
              <span>ربط حساب Google للمزامنة السحابية</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSyncing}
                onClick={onPushToCloud}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <UploadCloud size={15} />
                <span>{isSyncing ? 'جاري المزامنة...' : 'حفظ ومزامنة فورية للسحابة'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={onPullFromCloud}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <DownloadCloud size={15} />
                <span>استرجاع أحدث نسخة سحابية</span>
              </button>

              <button
                type="button"
                onClick={onGoogleSignOut}
                className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut size={14} />
                <span>فصل الحساب</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cloud Telemetry & Collection Counts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">حالة اتصال Firestore</span>
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={16}
              className={cloudConnected ? 'text-emerald-400' : 'text-amber-400'}
            />
            <span className="text-sm font-black text-white">
              {cloudConnected ? 'متصل بقاعدة البيانات السحابية' : 'وضع التخزين المحلي المؤقت'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">الحساب السحابي الموثق</span>
          <span className="text-sm font-bold text-white truncate block font-mono">
            {firebaseUser?.email || 'غير مرتبط بعد (يعمل محلياً + جاهز للربط)'}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">إجمالي السجلات المهيكلة</span>
          <span className="text-lg font-black text-cyan-400 font-mono tabular-nums">
            {totalRecordsCount} سجل
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">إصدار المزامنة السحابية</span>
          <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
            v{syncVersion} · {lastSyncedAt || 'محفوظ محلياً'}
          </span>
        </div>
      </div>

      {/* Detailed Collections Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database size={18} className="text-blue-400" />
            <span>الجداول والمجموعات المشمولة بالمزامنة السحابية وقواعد الأمان</span>
          </h3>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Zero-Trust Firestore Security Rules مفعّلة</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'سجلات الطلبة والهويات', count: data.students?.length || 0 },
            { label: 'الأساتذة والمحاضرون الضيوف', count: data.professors?.length || 0 },
            { label: 'براءات الذمة الرقمية', count: data.clearances?.length || 0 },
            { label: 'جلسات الباركود الفورية', count: data.barcodeSessions?.length || 0 },
            { label: 'سجلات الحضور والغياب', count: data.attendance?.length || 0 },
            { label: 'درجات السعي والامتحانات', count: data.grades?.length || 0 },
            { label: 'الاختبارات الإلكترونية', count: data.quizzes?.length || 0 },
            { label: 'الطلبات والاعتراضات', count: data.requests?.length || 0 },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between"
            >
              <span className="text-xs font-bold text-slate-300">{item.label}</span>
              <span className="text-sm font-black text-white font-mono tabular-nums">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
