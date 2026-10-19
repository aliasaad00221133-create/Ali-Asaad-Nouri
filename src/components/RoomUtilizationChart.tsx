import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BarChart3, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DayOfWeek, ScheduleSlot } from '../types.ts';
import {
  DAYS_OF_WEEK,
  getDailyRoomUtilization,
  RoomUtilizationItem,
} from '../utils/schedule.ts';

interface RoomUtilizationChartProps {
  schedule: ScheduleSlot[];
  selectedDay?: DayOfWeek;
  onSelectDay?: (day: DayOfWeek) => void;
  dailyMaxHours?: number;
}

export const RoomUtilizationChart: React.FC<RoomUtilizationChartProps> = ({
  schedule,
  selectedDay,
  onSelectDay,
  dailyMaxHours = 8,
}) => {
  // Default to 'الكل' when on main dashboard (no selectedDay prop), or sync with selectedDay in CalendarTimeline
  const [internalDay, setInternalDay] = useState<DayOfWeek | 'الكل'>(selectedDay || 'الكل');

  const activeFilter: DayOfWeek | 'الكل' =
    selectedDay && internalDay !== 'الكل' ? selectedDay : internalDay;

  const handleDayClick = (day: DayOfWeek | 'الكل') => {
    setInternalDay(day);
    if (day !== 'الكل' && onSelectDay) {
      onSelectDay(day);
    }
  };

  const utilizationData: RoomUtilizationItem[] = getDailyRoomUtilization(
    schedule,
    activeFilter,
    dailyMaxHours
  );

  const totalScheduledHours = utilizationData.reduce((acc, item) => acc + item.totalHours, 0);
  const totalRoomsCount = utilizationData.length;
  const highLoadRooms = utilizationData.filter((r) => r.status === 'ضغط مرتفع').length;
  const avgUtilization =
    totalRoomsCount > 0
      ? Math.round(
          utilizationData.reduce((acc, item) => acc + item.utilizationRate, 0) / totalRoomsCount
        )
      : 0;

  const maxReferenceHours =
    activeFilter === 'الكل' ? dailyMaxHours * DAYS_OF_WEEK.length : dailyMaxHours;

  return (
    <div
      className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
      data-testid="room-utilization-chart"
    >
      {/* Header & Single-Line Day Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
            <BarChart3 size={15} />
            <span>تحليلات إشغال القاعات والمختبرات الدراسية</span>
            <span aria-hidden="true">·</span>
            <span>تجنب التضارب وتحسين الاستغلال</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            توزيع الساعات الدراسية لكل قاعة (
            {activeFilter === 'الكل' ? 'التوزيع اليومي والأسبوعي الشامل' : `يوم ${activeFilter}`})
          </h3>
          <p className="text-xs text-slate-300">
            يوضح الرسم البياني مجموع الساعات المجدولة (نظري، عملي، امتحان) والرصيد المتاح لكل قاعة دراسية لتجنب التضارب.
          </p>
        </div>

        {/* Interactive Single-Line Day Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto max-w-full shrink-0">
          <button
            type="button"
            onClick={() => handleDayClick('الكل')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'الكل'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            كامل الأسبوع
          </button>
          {DAYS_OF_WEEK.map((day) => {
            const isCurrent = activeFilter === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/75 border border-slate-800/90 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">القاعات والمختبرات الفعالة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono tabular-nums">
              {totalRoomsCount}
            </span>
            <span className="text-xs text-slate-400">قاعة دراسية</span>
          </div>
        </div>

        <div className="bg-slate-950/75 border border-slate-800/90 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">مجموع الساعات المجدولة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-400 font-mono tabular-nums">
              {totalScheduledHours}
            </span>
            <span className="text-xs text-slate-400">ساعة دراسية</span>
          </div>
        </div>

        <div className="bg-slate-950/75 border border-slate-800/90 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">متوسط نسبة استغلال القاعات</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {avgUtilization}%
            </span>
            <span className="text-xs text-slate-400">من السعة المتاحة</span>
          </div>
        </div>

        <div className="bg-slate-950/75 border border-slate-800/90 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">قاعات ذات ضغط مرتفع</span>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-black font-mono tabular-nums ${
                highLoadRooms > 0 ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {highLoadRooms}
            </span>
            <span className="text-xs text-slate-400">
              {highLoadRooms > 0 ? 'تحتاج موازنة' : 'توزيع متوازن'}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts BarChart Container */}
      {utilizationData.length > 0 ? (
        <div className="bg-slate-950/75 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
          <div className="h-72 sm:h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={utilizationData}
                margin={{ top: 20, right: 24, left: 8, bottom: 16 }}
                barSize={38}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortRoom"
                  stroke="#94a3b8"
                  tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 700 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  domain={[
                    0,
                    Math.max(
                      activeFilter === 'الكل' ? 8 : 6,
                      ...utilizationData.map((d) => d.totalHours + 2)
                    ),
                  ]}
                  unit=" س"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(30, 41, 59, 0.45)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '14px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    textAlign: 'right',
                    direction: 'rtl',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
                  }}
                  formatter={(value: any, name: any) => [`${value} ساعة`, name]}
                  labelFormatter={(label: any, payload: any) => {
                    const item = payload?.[0]?.payload as RoomUtilizationItem | undefined;
                    return item
                      ? `${item.room} — المجدول: ${item.totalHours} س (${item.lecturesCount} محاضرات)`
                      : label;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 700 }}
                />
                {activeFilter !== 'الكل' && (
                  <ReferenceLine
                    y={dailyMaxHours}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `الحد اليومي الأقصى (${dailyMaxHours} س)`,
                      position: 'top',
                      fill: '#fbbf24',
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar
                  dataKey="theoryHours"
                  name="ساعات نظري"
                  stackId="hours"
                  fill="#3b82f6"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="labHours"
                  name="ساعات عملي (مختبر)"
                  stackId="hours"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="examHours"
                  name="ساعات امتحان"
                  stackId="hours"
                  fill="#f43f5e"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl">
          <Building2 size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-slate-300 text-sm font-bold">
            لا توجد بيانات قاعات مسجلة لعرض الرسم البياني حالياً.
          </p>
        </div>
      )}

      {/* Room Utilization Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-2.5 px-3 font-bold">القاعة / المختبر الدراسي</th>
              <th className="py-2.5 px-3 font-bold">عدد المحاضرات</th>
              <th className="py-2.5 px-3 font-bold">الساعات المجدولة</th>
              <th className="py-2.5 px-3 font-bold">الساعات المتاحة</th>
              <th className="py-2.5 px-3 font-bold">نسبة الإشغال</th>
              <th className="py-2.5 px-3 font-bold">حالة الاستغلال</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {utilizationData.map((item) => (
              <tr key={item.room} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                  <Building2 size={14} className="text-blue-400 shrink-0" />
                  <span>{item.room}</span>
                </td>
                <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                  {item.lecturesCount}
                </td>
                <td className="py-3 px-3 font-mono tabular-nums text-blue-400 font-bold">
                  {item.totalHours} س
                </td>
                <td className="py-3 px-3 font-mono tabular-nums text-emerald-400">
                  {item.availableHours} س
                </td>
                <td className="py-3 px-3 font-mono tabular-nums">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.status === 'ضغط مرتفع'
                            ? 'bg-amber-500'
                            : item.status === 'استغلال مثالي'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(6, item.utilizationRate)}%` }}
                      />
                    </div>
                    <span className="text-slate-300">{item.utilizationRate}%</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      item.status === 'ضغط مرتفع'
                        ? 'text-amber-400'
                        : item.status === 'استغلال مثالي'
                        ? 'text-blue-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {item.status === 'ضغط مرتفع' ? (
                      <AlertTriangle size={13} />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    <span>{item.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
