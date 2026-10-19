import React, { useState } from 'react';
import { Settings, Send, Save, CheckCircle, Info } from 'lucide-react';
import { SystemSettings } from '../types.ts';
import { sendTelegramNotification } from '../utils/telegram.ts';

interface AdminSettingsProps {
  settings: SystemSettings;
  onSave: (s: SystemSettings) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onSave,
  showToast,
}) => {
  const [token, setToken] = useState(settings?.telegramToken || '');
  const [chatId, setChatId] = useState(settings?.telegramChatId || '');
  const [testing, setTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      telegramToken: token.trim(),
      telegramChatId: chatId.trim(),
    });
    showToast('تم حفظ إعدادات تيليجرام بنجاح!');
  };

  const handleTestBot = async () => {
    if (!token.trim() || !chatId.trim()) {
      showToast('يرجى إدخال التوكن والشات آيدي أولاً', 'error');
      return;
    }

    setTesting(true);
    const testMsg = `🤖 <b>اختبار الاتصال السحابي!</b>\nمنظومة الجامعة الذكية متصلة الآن ببوت تيليجرام بنجاح.\nالوقت: ${new Date().toLocaleTimeString('ar-IQ')}`;
    const res = await sendTelegramNotification(
      { telegramToken: token.trim(), telegramChatId: chatId.trim() },
      testMsg
    );

    if (res.success) {
      showToast('تم إرسال رسالة الاختبار بنجاح إلى تيليجرام!', 'success');
    } else {
      showToast(`فشل الاختبار: ${res.error}`, 'error');
    }
    setTesting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white">
          <Settings size={20} className="text-blue-500" /> إعدادات ربط بوت تيليجرام التلقائي
        </h3>
        <p className="text-slate-400 text-xs mb-6">
          اربط بوت تيليجرام لتلقي تقارير الحضور اليومي، إشعارات رصد الدرجات، ونشر التعميمات المركزية فوراً.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              توكن البوت (Bot Token) من @BotFather
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
              dir="ltr"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              معرف القناة أو المحادثة (Telegram Chat ID)
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-100123456789 أو معرف حسابك الشخصي"
              dir="ltr"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-blue-200">
            <Info size={16} className="shrink-0 mt-0.5 text-blue-400" />
            <span>
              نصيحة: يمكنك الحصول على Chat ID بسهولة بإضافة البوت إلى قناتك أو مجموعتك ثم إرسال رسالة تجريبية، أو عبر بوت @userinfobot.
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="button"
              onClick={handleTestBot}
              disabled={testing}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Send size={15} />
              <span>{testing ? 'جاري الفحص...' : 'اختبار اتصال البوت الآن'}</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors"
            >
              <Save size={15} />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
