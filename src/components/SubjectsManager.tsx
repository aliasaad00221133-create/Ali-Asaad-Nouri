import React, { useState } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Professor, Subject } from '../types.ts';

interface SubjectsManagerProps {
  subjects: Subject[];
  professors: Professor[];
  onAdd: (s: Omit<Subject, 'docId'>) => void;
  onDelete: (docId: string) => void;
}

export const SubjectsManager: React.FC<SubjectsManagerProps> = ({
  subjects,
  professors,
  onAdd,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [professorId, setProfessorId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !professorId) return;

    onAdd({
      name: name.trim(),
      professorId,
    });

    setName('');
    setProfessorId('');
  };

  return (
    <div className="space-y-6">
      {/* Assign New Subject */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
          <BookOpen size={18} className="text-cyan-500" /> إسناد مادة ومقرر دراسي لأستاذ معتمد
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المادة الدراسية</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: نظم المعلومات الجغرافية GIS"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">الأستاذ المكلف بالمادة</label>
            <select
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-cyan-500 outline-none"
            >
              <option value="">-- اختر الأستاذ المسؤول --</option>
              {(professors || []).map((p) => (
                <option key={p.docId || p.username} value={p.docId || p.username}>
                  {p.name} ({p.username})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
            >
              <Plus size={16} /> إسناد المادة رسمياً
            </button>
          </div>
        </form>
      </div>

      {/* Subjects List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-4 text-white">
          المقررات الدراسية المسندة ({(subjects || []).length})
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <th className="p-3.5">اسم المقرر</th>
                <th className="p-3.5">الأستاذ المكلف</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(subjects || []).map((s) => {
                const prof = (professors || []).find(
                  (p) => p.docId === s.professorId || p.username === s.professorId
                );
                return (
                  <tr key={s.docId || s.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <BookOpen size={15} className="text-cyan-400" />
                      {s.name}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {prof ? (
                        <span>{prof.name}</span>
                      ) : (
                        <span className="text-rose-400">أستاذ غير مسجل</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {s.docId && (
                        <button
                          type="button"
                          onClick={() => onDelete(s.docId!)}
                          className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold flex items-center gap-1 mx-auto cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} /> إلغاء
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(subjects || []).length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center p-6 text-slate-500">
                    لا توجد مواد مسندة حالياً
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
