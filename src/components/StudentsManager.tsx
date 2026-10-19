import React, { useState } from 'react';
import { Users, Plus, Search, QrCode, Edit3, Trash2, Phone, X } from 'lucide-react';
import { Student } from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import { StudentCardModal } from './Modals.tsx';

interface StudentsManagerProps {
  students: Student[];
  onAdd: (s: Omit<Student, 'docId'>) => void;
  onUpdate: (s: Student) => void;
  onDelete: (docId: string) => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({
  students,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);

  const [viewCardStudent, setViewCardStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !level.trim() || !department.trim() || !phone.trim()) return;

    setGenerating(true);
    const stuId = 'STU-' + Math.floor(100000 + Math.random() * 900000);
    const qrUrl = await generateQRCodeDataUrl(stuId);

    onAdd({
      id: stuId,
      name: name.trim(),
      level: level.trim(),
      department: department.trim(),
      phone: phone.trim(),
      qrCode: qrUrl,
    });

    setName('');
    setLevel('');
    setDepartment('');
    setPhone('');
    setGenerating(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    onUpdate(editStudent);
    setEditStudent(null);
  };

  const filtered = (students || []).filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.id?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Registration Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
          <Users size={18} className="text-blue-500" /> تسجيل طالب جديد وتوليد بطاقة الباركود الذكية
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الرباعي للطالب</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: علي حسن كاظم"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">المرحلة الدراسية</label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="المرحلة الثالثة"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">القسم الأكاديمي</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="هندسة البرمجيات"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الهاتف للتواصل</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Phone size={14} />
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0770XXXXXXX"
                dir="ltr"
                required
                className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={generating}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
              <span>{generating ? 'جاري توليد الباركود...' : 'تسجيل الطالب وتوليد الهوية'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Students Directory */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              قائمة الطلاب المركزية ({(students || []).length})
            </h3>
            <p className="text-xs text-slate-400">سجل الطلاب، استعراض الهويات الرقمية وطباعتها</p>
          </div>
          <div className="w-full sm:w-72 relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم الجامعي أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <th className="p-3.5">الرقم الجامعي</th>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">القسم والمرحلة</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((s) => (
                <tr key={s.docId || s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-blue-400 font-mono font-bold" dir="ltr">
                    {s.id}
                  </td>
                  <td className="p-3.5 font-bold text-white">{s.name}</td>
                  <td className="p-3.5 text-slate-300">
                    <div>{s.department}</div>
                    <div className="text-[11px] text-slate-500">{s.level}</div>
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono" dir="ltr">
                    {s.phone || '-'}
                  </td>
                  <td className="p-3.5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewCardStudent(s)}
                      className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <QrCode size={13} /> الهوية
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStudent(s)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 size={13} /> تعديل
                    </button>
                    {s.docId && (
                      <button
                        type="button"
                        onClick={() => onDelete(s.docId!)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl cursor-pointer transition-colors"
                        title="حذف الطالب"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-slate-500">
                    لا يوجد طلاب مطابقين للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 size={18} className="text-amber-400" /> تعديل بيانات الطالب
              </h3>
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الطالب الرباعي</label>
                <input
                  type="text"
                  value={editStudent.name}
                  onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المرحلة الدراسية</label>
                <input
                  type="text"
                  value={editStudent.level}
                  onChange={(e) => setEditStudent({ ...editStudent, level: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">القسم الأكاديمي</label>
                <input
                  type="text"
                  value={editStudent.department}
                  onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editStudent.phone || ''}
                  onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                  required
                  dir="ltr"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID Card Modal */}
      {viewCardStudent && (
        <StudentCardModal student={viewCardStudent} onClose={() => setViewCardStudent(null)} />
      )}
    </div>
  );
};
