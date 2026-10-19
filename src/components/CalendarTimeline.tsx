import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Send,
  Trash2,
  Edit3,
  AlertCircle,
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { CurrentUser, DayOfWeek, LectureType, ScheduleSlot, Subject } from '../types.ts';
import {
  DAYS_OF_WEEK,
  getSlotsForDay,
  checkRoomConflict,
  formatLectureTelegramReminder,
  timeToMinutes,
} from '../utils/schedule.ts';
import { RoomUtilizationChart } from './RoomUtilizationChart.tsx';

interface CalendarTimelineProps {
  currentUser: CurrentUser;
  schedule: ScheduleSlot[];
  subjects: Subject[];
  onAddSlot: (slot: Omit<ScheduleSlot, 'docId'>) => void;
  onUpdateSlot: (slot: ScheduleSlot) => void;
  onDeleteSlot: (docId: string) => void;
  onNotification: (message: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  addLog: (action: string) => void;
  filterSubjectId?: string; // Optional: when embedded inside professor's subject view
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  currentUser,
  schedule,
  subjects,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onNotification,
  showToast,
  addLog,
  filterSubjectId,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('الأحد');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);

  // Form State
  const [subjectId, setSubjectId] = useState(filterSubjectId || (subjects[0]?.docId || ''));
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('الأحد');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [room, setRoom] = useState('قاعة الخوارزمي الكبرى (Hall A)');
  const [type, setType] = useState<LectureType>('نظري');
  const [notes, setNotes] = useState('');
  const [conflictError, setConflictError] = useState('');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const canManage = currentUser.role === 'admin' || currentUser.role === 'professor';

  // Filter slots if restricted to specific subject
  const relevantSlots = filterSubjectId
    ? (schedule || []).filter((s) => s.subjectId === filterSubjectId)
    : schedule || [];

  const daySlots = getSlotsForDay(relevantSlots, selectedDay);

  const openAddModal = () => {
    setEditingSlot(null);
    setSubjectId(filterSubjectId || (subjects[0]?.docId || ''));
    setDayOfWeek(selectedDay);
    setStartTime('09:00');
    setEndTime('11:00');
    setRoom('قاعة الخوارزمي الكبرى (Hall A)');
    setType('نظري');
    setNotes('');
    setConflictError('');
    setIsModalOpen(true);
  };

  const openEditModal = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setSubjectId(slot.subjectId);
    setDayOfWeek(slot.dayOfWeek);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setRoom(slot.room);
    setType(slot.type);
    setNotes(slot.notes || '');
    setConflictError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError('');

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setConflictError('وقت نهاية المحاضرة يجب أن يكون بعد وقت البدء.');
      return;
    }

    const selSub = subjects.find((s) => s.docId === subjectId);
    const subName = selSub ? selSub.name : 'مقرر دراسي';
    const profName = currentUser.role === 'professor' ? currentUser.name : 'أستاذ المادة المعتمد';

    const slotPayload: ScheduleSlot = {
      docId: editingSlot?.docId,
      subjectId,
      subjectName: subName,
      professorName: profName,
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim(),
      type,
      notes: notes.trim(),
    };

    // Check room conflict
    const conflictCheck = checkRoomConflict(schedule, slotPayload);
    if (conflictCheck.hasConflict) {
      const c = conflictCheck.conflictingSlot!;
      setConflictError(
        `تعارض في حجز القاعة! القاعة (${room}) محجوزة بالفعل لمادة (${c.subjectName}) من ${c.startTime} إلى ${c.endTime} في يوم ${c.dayOfWeek}.`
      );
      return;
    }

    if (editingSlot?.docId) {
      onUpdateSlot(slotPayload);
      showToast('تم تحديث موعد المحاضرة والقاعة بنجاح!');
      addLog(`تعديل موعد محاضرة ${subName} في يوم ${dayOfWeek}`);
    } else {
      onAddSlot(slotPayload);
      showToast('تمت إضافة المحاضرة للجدول بنجاح!');
      addLog(`إضافة موعد محاضرة جديدة: ${subName} (${dayOfWeek} ${startTime}-${endTime})`);
    }

    setIsModalOpen(false);
  };

  const handleSendTelegramReminder = async (slot: ScheduleSlot) => {
    setSendingReminderId(slot.docId || 'temp');
    const msg = formatLectureTelegramReminder(slot);
    const res = await onNotification(msg);

    if (res.success) {
      showToast('تم إرسال تذكير المحاضرة إلى تيليجرام بنجاح!', 'success');
      addLog(`إرسال تذكير تيليجرام بمحاضرة: ${slot.subjectName}`);
    } else {
      showToast(`تعذر إرسال التذكير: ${res.error}`, 'error');
    }
    setSendingReminderId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold mb-1.5">
            <Calendar size={14} />
            <span>التقويم التفاعلي والجدول اليومي بالساعات</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            جدول المحاضرات اليومي والقاعات الدراسية
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            متابعة دقيقة لمواعيد المحاضرات، إشغال القاعات والمختبرات، وتنبيهات فورية عبر تيليجرام
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors shrink-0 whitespace-nowrap"
          >
            <Plus size={16} /> إضافة محاضرة للجدول
          </button>
        )}
      </div>

      {/* Recharts Room Hours Distribution Chart */}
      <RoomUtilizationChart
        schedule={schedule || []}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* Days of Week Selector Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-wrap gap-1.5">
        {DAYS_OF_WEEK.map((day) => {
          const count = getSlotsForDay(relevantSlots, day).length;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-950 border border-slate-800'
              }`}
            >
              <span>{day}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Overview & Hourly Timeline */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              جدول يوم <span className="text-blue-400">{selectedDay}</span> ({daySlots.length} محاضرة)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            التوقيت الأكاديمي: 08:30 ص - 04:30 م
          </span>
        </div>

        {/* Timeline Slots */}
        <div className="space-y-4 pt-2">
          {daySlots.map((slot) => {
            const isLab = slot.type === 'عملي';
            const isExam = slot.type === 'امتحان';

            const cardBorder = isExam
              ? 'border-r-4 border-r-rose-500 border-rose-500/30 bg-rose-950/10'
              : isLab
              ? 'border-r-4 border-r-emerald-500 border-slate-800 bg-slate-950'
              : 'border-r-4 border-r-blue-500 border-slate-800 bg-slate-950';

            const typeBadge = isExam
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : isLab
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/30';

            return (
              <div
                key={slot.docId || `${slot.startTime}-${slot.subjectName}`}
                className={`p-5 rounded-2xl border ${cardBorder} shadow-lg transition-all hover:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeBadge}`}>
                      {slot.type}
                    </span>
                    <h4 className="text-base font-black text-white">{slot.subjectName}</h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold">
                      <Clock size={14} />
                      <span dir="ltr">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <MapPin size={14} />
                      <span>{slot.room}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <User size={14} />
                      <span>{slot.professorName}</span>
                    </div>
                  </div>

                  {slot.notes && (
                    <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 inline-block">
                      {slot.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendTelegramReminder(slot)}
                    disabled={sendingReminderId === slot.docId}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    title="إرسال تذكير بهذه المحاضرة وقاعتها للطلبة عبر تيليجرام"
                  >
                    <Send size={13} />
                    <span>{sendingReminderId === slot.docId ? 'جاري الإرسال...' : 'تذكير تيليجرام'}</span>
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(slot)}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl cursor-pointer transition-colors"
                        title="تعديل الموعد والقاعة"
                      >
                        <Edit3 size={15} />
                      </button>

                      {slot.docId && (
                        <button
                          type="button"
                          onClick={() => onDeleteSlot(slot.docId!)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl cursor-pointer transition-colors"
                          title="حذف من الجدول"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {daySlots.length === 0 && (
            <div className="py-16 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
              <Calendar size={36} className="mx-auto text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm font-bold">
                لا توجد محاضرات مجدولة في يوم {selectedDay}.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-3 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> إضافة أول محاضرة لهذا اليوم
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Lecture Slot Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={20} className="text-blue-500" />
                <span>{editingSlot ? 'تعديل موعد وقاعة المحاضرة' : 'إضافة محاضرة جديدة للجدول اليومي'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">المادة الدراسية</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.docId} value={s.docId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اليوم الأسبوعي</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع المحاضرة</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as LectureType)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                  >
                    <option value="نظري">نظري (قاعة دراسية)</option>
                    <option value="عملي">عملي (مختبر تقني)</option>
                    <option value="امتحان">امتحان فصلي / نهائي</option>
                  </select>
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">وقت البدء</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">وقت الانتهاء</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Room Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  القاعة أو المختبر (Room / Lab)
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="مثال: قاعة الخوارزمي الكبرى أو مختبر البرمجيات 2"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات للطلبة (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: إحضار الحواسيب المحمولة مجهزة ببيئة العمل"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-blue-500 outline-none"
                />
              </div>

              {/* Conflict Error Notice */}
              {conflictError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>{conflictError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg transition-colors"
                >
                  {editingSlot ? 'حفظ التعديلات' : 'تثبيت في الجدول'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
