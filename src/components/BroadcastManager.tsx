import React, { useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import { Broadcast } from '../types.ts';

interface BroadcastManagerProps {
  broadcasts: Broadcast[];
  onAdd: (b: Omit<Broadcast, 'docId'>) => void;
  onDelete: (docId: string) => void;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
}

export const BroadcastManager: React.FC<BroadcastManagerProps> = ({
  broadcasts,
  onAdd,
  onDelete,
  onNotification,
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    const dateStr =
      new Date().toLocaleDateString('ar-IQ') +
      ' ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    onAdd({
      message: message.trim(),
      target: 'all',
      date: dateStr,
    });

    await onNotification(`<b>📢 تعميم إداري مركزي هام</b>\n\n${message.trim()}`);
    setMessage('');
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
          <Megaphone size={20} className="text-amber-400" /> إرسال تعميم أو أمر إداري مركزي
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          يظهر هذا التوجيه فوراً في شريط التنبيهات في حسابات كافة الأساتذة والطلبة ويتم إرساله لبوت تيليجرام.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب نص التعميم الإداري هنا (مثال: موعد تسليم درجات السعي، مواعيد العطلات الرسمية، تعليمات الامتحانات)..."
              rows={3}
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Send size={15} />
              <span>{sending ? 'جاري النشر...' : 'نشر التعميم الفوري'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-4 text-white">
          سجل التعميمات والأوامر الإدارية ({(broadcasts || []).length})
        </h3>
        <div className="space-y-3">
          {(broadcasts || []).map((b) => (
            <div
              key={b.docId || b.date}
              className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">{b.message}</p>
                <span className="text-[11px] text-slate-500 font-mono block">{b.date}</span>
              </div>
              {b.docId && (
                <button
                  type="button"
                  onClick={() => onDelete(b.docId!)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> حذف
                </button>
              )}
            </div>
          ))}
          {(broadcasts || []).length === 0 && (
            <p className="text-center text-slate-500 py-6 text-xs">لا توجد تعميمات نشطة حالياً.</p>
          )}
        </div>
      </div>
    </div>
  );
};
