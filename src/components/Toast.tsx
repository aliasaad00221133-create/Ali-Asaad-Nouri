import React, { useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass =
    type === 'error'
      ? 'bg-rose-600 border-rose-400 text-white shadow-rose-950/60'
      : 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-950/60';

  return (
    <div
      className={`fixed bottom-16 left-8 ${bgClass} px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-[150] border transition-all duration-300`}
      dir="rtl"
    >
      {type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
      <span className="font-bold text-xs tracking-wide">{message}</span>
    </div>
  );
};
