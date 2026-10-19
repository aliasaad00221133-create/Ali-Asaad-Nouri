import React, { useState } from 'react';
import { BookOpen, Plus, ExternalLink, Trash2, FileText, Link as LinkIcon } from 'lucide-react';
import { Lecture, Subject } from '../types.ts';

interface ProfessorLecturesProps {
  subject: Subject;
  lectures: Lecture[];
  onAdd: (l: Omit<Lecture, 'docId'>) => void;
  onDelete: (docId: string) => void;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
  addLog: (action: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ProfessorLectures: React.FC<ProfessorLecturesProps> = ({
  subject,
  lectures,
  onAdd,
  onDelete,
  onNotification,
  addLog,
  showToast,
}) => {
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  const subLectures = (lectures || []).filter((l) => l.subjectId === subject.docId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileUrl.trim()) return;

    onAdd({
      subjectId: subject.docId || 'sub',
      subjectName: subject.name,
      title: title.trim(),
      fileUrl: fileUrl.trim(),
      notes: notes.trim(),
      date: new Date().toISOString().split('T')[0],
    });

    await onNotification(
      `<b>📚 محاضرة جديدة مرفوعة!</b>\n<b>المادة:</b> ${subject.name}\n<b>العنوان:</b> ${title.trim()}\nيرجى من الطلبة الدخول إلى بوابة الطالب لتحميل المحاضرة.`
    );

    addLog(`رفع محاضرة جديدة (${title.trim()}) لمادة ${subject.name}`);
    showToast('تم نشر المحاضرة بنجاح!');
    setTitle('');
    setFileUrl('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Upload Lecture Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
          <BookOpen size={18} className="text-blue-400" /> نشر محاضرة أو ملزمة دراسية جديدة للطلبة
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان المحاضرة</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المحاضرة 03: الخوارزميات المتقدمة PDF"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              رابط التحميل (Drive / Telegram / Cloud)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <LinkIcon size={14} />
              </div>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                dir="ltr"
                required
                className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات توجيهية للطلبة</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مطلوب حل التمارين في نهاية الملزمة"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
            >
              <Plus size={16} /> نشر المحاضرة في بوابة الطلبة
            </button>
          </div>
        </form>
      </div>

      {/* Lectures List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-4 text-white">
          المحاضرات والملازم المرفوعة لهذه المادة ({subLectures.length})
        </h3>

        <div className="space-y-3">
          {subLectures.map((l) => (
            <div
              key={l.docId || l.title}
              className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" />
                  {l.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {l.notes ? `${l.notes} | ` : ''}
                  <span className="font-mono text-slate-500">{l.date}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={l.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={13} /> فتح الرابط
                </a>
                {l.docId && (
                  <button
                    type="button"
                    onClick={() => onDelete(l.docId!)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl cursor-pointer transition-colors"
                    title="حذف المحاضرة"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {subLectures.length === 0 && (
            <p className="text-center py-6 text-slate-500 text-xs">
              لم يتم رفع أي محاضرات أو ملازم لهذه المادة حتى الآن.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
