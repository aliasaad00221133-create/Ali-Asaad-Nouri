import React, { useState } from 'react';
import {
  GraduationCap,
  User,
  ShieldCheck,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { CurrentUser, SystemData } from '../types.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface LoginScreenProps {
  onLogin: (user: CurrentUser) => void;
  systemData: SystemData;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, systemData, showToast }) => {
  const [loginType, setLoginType] = useState<'staff' | 'student'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.trim() === 'admin' && password === 'admin') {
      onLogin({
        role: 'admin',
        docId: 'admin',
        id: 'admin',
        name: 'إدارة النظام المركزية العليا',
      });
      return;
    }

    const prof = (systemData.professors || []).find(
      (p) => p.username === username.trim() && p.password === password
    );

    if (prof) {
      if (prof.isFrozen) {
        setError('تم تجميد هذا الحساب من قِبل الإدارة العليا. يرجى مراجعة إدارة الكلية.');
        return;
      }
      onLogin({
        role: 'professor',
        docId: prof.docId,
        id: prof.docId || 'prof',
        name: prof.name,
        username: prof.username,
      });
      return;
    }

    setError('بيانات الدخول غير صحيحة. يرجى التحقق من اسم المستخدم وكلمة المرور.');
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const query = studentId.trim().toLowerCase();
    const stud = (systemData.students || []).find(
      (s) => s.id.toLowerCase() === query || s.phone?.toLowerCase() === query
    );

    if (stud) {
      onLogin({
        role: 'student',
        docId: stud.docId,
        id: stud.id,
        name: stud.name,
        department: stud.department,
        level: stud.level,
        phone: stud.phone,
      });
    } else {
      setError('الرقم الجامعي أو رقم الهاتف غير مسجل بالنظام.');
    }
  };

  const fillAdmin = () => {
    setLoginType('staff');
    setUsername('admin');
    setPassword('admin');
    setError('');
  };

  const fillProf = () => {
    setLoginType('staff');
    setUsername('ali');
    setPassword('123');
    setError('');
  };

  const fillStudent = () => {
    setLoginType('student');
    setStudentId('STU-102941');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-8 pb-32 relative z-10" dir="rtl">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center mb-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl border border-blue-400/30">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            الجامعة الذكية التفاعلية
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-bold">
            المنظومة الملكية لإدارة التعليم والامتحانات والحضور الذكي
          </p>
        </div>

        {/* Official PWA & Unified All-Professors App Download Banner */}
        <PWAInstallButton systemData={systemData} showToast={showToast} variant="login" />

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Toggle Tab */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginType('staff');
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                loginType === 'staff'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الإدارة / الأساتذة
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('student');
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                loginType === 'student'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              بوابة الطالب الذاتية
            </button>
          </div>

          {loginType === 'staff' ? (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              {/* Quick Professor Select for Instant Professor Access */}
              {(systemData.professors || []).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-cyan-400 mb-1.5">
                    اختيار سريع لاسم الأستاذ (تعبئة تلقائية):
                  </label>
                  <select
                    aria-label="اختيار سريع لاسم الأستاذ"
                    value=""
                    onChange={(e) => {
                      const p = (systemData.professors || []).find(
                        (item) => item.username === e.target.value
                      );
                      if (p) {
                        setUsername(p.username);
                        setPassword(p.password || '123');
                        setError('');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-cyan-500 outline-none"
                  >
                    <option value="">-- اختر اسمك من قائمة تدريسيي الكلية --</option>
                    {(systemData.professors || []).map((p) => (
                      <option key={p.docId || p.username} value={p.username}>
                        {p.name} ({p.roleType || 'ملاك دائم'}) — {p.profCode || p.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin أو اسم الأستاذ"
                    dir="ltr"
                    required
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ShieldCheck size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    dir="ltr"
                    required
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg transition-all cursor-pointer mt-2"
              >
                تسجيل الدخول
              </button>
            </form>
          ) : (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  الرقم الجامعي أو رقم الهاتف
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <QrCode size={16} />
                  </div>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="STU-102941 أو 07701234567"
                    dir="ltr"
                    required
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg transition-all cursor-pointer mt-2"
              >
                دخول بوابة الطالب
              </button>
            </form>
          )}

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 border-t border-slate-800 pt-4 space-y-2">
            <p className="text-[11px] text-slate-400 text-center font-bold">
              بيانات تجريبية سريعة للتنقل بين الأدوار:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={fillAdmin}
                className="px-2 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                دخول كمدير
              </button>
              <button
                type="button"
                onClick={fillProf}
                className="px-2 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                دخول كأستاذ
              </button>
              <button
                type="button"
                onClick={fillStudent}
                className="px-2 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                دخول كطالب
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
