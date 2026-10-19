import React, { useState } from 'react';
import { Download, Smartphone, Share2, Copy, CheckCircle2, X, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../utils/usePWAInstall.ts';
import type { SystemData } from '../types.ts';
import {
  buildAllProfessorsTelegramAnnouncement,
  generateUnifiedAllProfessorsOfficialHtmlApp,
  resolvePublicSharedOrigin,
} from '../utils/professorShare.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import { generateProfessorBarcodeId } from '../utils/barcode.ts';

interface PWAInstallButtonProps {
  systemData?: SystemData;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  variant?: 'header' | 'login';
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl">
      <WifiOff size={15} />
      <span>وضع العمل بدون إنترنت — يتم الحفظ محلياً</span>
    </div>
  );
};

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  systemData,
  showToast,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showHubModal, setShowHubModal] = useState(false);

  const getPublicOrigin = () => {
    if (typeof window === 'undefined') return resolvePublicSharedOrigin();
    const loc = window.location.origin;
    if (loc.includes('localhost')) return resolvePublicSharedOrigin();
    return resolvePublicSharedOrigin(loc);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && showToast) {
        showToast('تم تثبيت التطبيق الرسمي للجامعة على جهازك بنجاح!', 'success');
        return;
      }
    }
    setShowHubModal(true);
  };

  const handleDownloadUnifiedAllProfessorsApp = async () => {
    const profs = systemData?.professors || [];
    const subjects = systemData?.subjects || [];
    const sessions = systemData?.barcodeSessions || [];
    const students = systemData?.students || [];

    const qrMap: Record<string, string> = {};
    for (const p of profs) {
      const code = p.profCode || generateProfessorBarcodeId(p.username);
      qrMap[code] = await generateQRCodeDataUrl(code);
    }

    const html = generateUnifiedAllProfessorsOfficialHtmlApp(
      profs,
      subjects,
      sessions,
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
        'تم تنزيل (المنظومة الرسمية الموحدة لجميع الأساتذة)! ارفع هذا الملف في قناة أو قروب الأساتذة ليحمله كل أستاذ ويعمل به فوراً',
        'success'
      );
    }
  };

  const handleCopyOfficialAnnouncement = () => {
    const text = buildAllProfessorsTelegramAnnouncement(
      getPublicOrigin(),
      systemData?.professors || [],
      systemData?.subjects || []
    );
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (showToast) {
      showToast('تم نسخ التعميم الرسمي الموجه لجميع الأساتذة مع بيانات الدخول والباركود', 'success');
    }
  };

  return (
    <>
      {!isInstalled && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={
            variant === 'login'
              ? 'w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0'
              : 'px-2.5 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-md'
          }
        >
          <Download size={14} />
          {variant === 'login' ? (
            <span>تثبيت وتحميل المنظومة الرسمية للأساتذة (PWA + ملف موحد)</span>
          ) : (
            <>
              <span className="hidden sm:inline">تثبيت / رفع للأساتذة</span>
              <span className="sm:hidden">تثبيت</span>
            </>
          )}
        </button>
      )}

      {showHubModal && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Smartphone size={18} className="text-emerald-400" />
                  <span>مركز رفع وتحميل التطبيق الرسمي لجميع الأساتذة</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  لتوزيع المنظومة على كافة تدريسيي الكلية لتسجيل الطلاب بالباركود بشكل رسمي ومعتمد
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHubModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 cursor-pointer"
                aria-label="إغلاق نافذة تثبيت التطبيق"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step 1: Download Unified All-Professors File for Telegram / WhatsApp Group */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-black text-emerald-400">
                الخطوة الأولى (الأسرع والأضمن لكل الأساتذة عبر تيليجرام / واتساب):
              </div>
              <h4 className="text-sm font-black text-white">
                تنزيل «المنظومة الرسمية الموحدة لجميع الأساتذة» ورفعها في قروب التدريسيين
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                اضغط الزر أدناه لتنزيل ملف رسمي واحد (<code>المنظومة-الرسمية-لجميع-الأساتذة-وتسجيل-الطلاب.html</code>) ثم ارفعه في <strong>قناة التليجرام أو مجموعة الواتساب الرسمية لأساتذة الكلية</strong>. يحمّله كل أستاذ على هاتفه أو حاسوبه، ويختار اسمه أو يسجل اسمه ومادته فوراً ليظهر له الباركود الرسمي (QR) ويسجل حضور الطلاب ويطبع الكشف المصدق!
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadUnifiedAllProfessorsApp}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download size={15} />
                  <span>تنزيل المنظومة الرسمية الموحدة لجميع الأساتذة (.HTML)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyOfficialAnnouncement}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <Copy size={14} />
                  <span>نسخ التعميم الرسمي لقروب الأساتذة</span>
                </button>
              </div>
            </div>

            {/* Step 2: Install as Native-Like PWA App on Phone & Desktop */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-black text-cyan-400">
                الخطوة الثانية: تثبيت التطبيق كأيقونة رسمية على الهاتف والحاسوب (PWA)
              </div>
              {isInstallable ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">
                    متصفحك يدعم التثبيت المباشر! اضغط الزر أدناه لإضافة أيقونة «الجامعة الذكية» على شاشة جهازك:
                  </p>
                  <button
                    type="button"
                    onClick={install}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone size={15} />
                    <span>تثبيت التطبيق الآن على هذا الجهاز</span>
                  </button>
                </div>
              ) : isIOS ? (
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>لتثبيت التطبيق على iPhone / iPad (Safari):</strong> اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري، ثم اختر <strong>«إضافة إلى الشاشة الرئيسية (Add to Home Screen)»</strong> ليظهر كتطبيق رسمي مستقل.
                </p>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>لتثبيت التطبيق على هواتف الأندرويد والحاسوب (Chrome / Edge):</strong> من قائمة المتصفح العلوية (⋮) اختر <strong>«تثبيت التطبيق (Install App / Add to Home screen)»</strong>، أو افتح التطبيق في نافذة مستقلة واضغط أيقونة التثبيت في شريط العنوان.
                </p>
              )}
            </div>

            {/* Step 3: Cloud Run Permanent Publishing */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-amber-400">
                الخطوة الثالثة: النشر السحابي الرسمي الدائم على الإنترنت (Deploy)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                لجعل الرابط السحابي مفتوحاً لجميع الأساتذة والطلاب على مدار الساعة بدون قيود حساب، اضغط على زر <strong>Deploy (نشر على Google Cloud Run)</strong> أو <strong>Share → Public</strong> في الشريط العلوي لنافذة Google AI Studio (أعلى يمين الشاشة خارج التطبيق).
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowHubModal(false)}
                className="py-2 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
