import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Award, Printer, User, QrCode } from 'lucide-react';
import { Student, Subject } from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';

interface QRScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  onScan,
  onClose,
  title = 'مسح الباركود الذكي أو الإدخال اليدوي',
  placeholder = 'STU-XXXXXX أو رقم الهاتف'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const startCam = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setErrorMsg('الكاميرا غير متوفرة في هذا المتصفح. يمكنك إدخال الرقم يدوياً.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (isMounted) {
          setErrorMsg('تعذر تشغيل الكاميرا (يرجى السماح بالصلاحية أو استخدام الإدخال اليدوي).');
        }
      }
    };
    startCam();
    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Camera size={18} className="text-blue-500" /> {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg ? (
          <div className="w-full p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-center text-xs font-bold mb-4">
            {errorMsg}
          </div>
        ) : (
          <div className="relative w-full h-52 bg-black rounded-2xl overflow-hidden mb-4 border border-slate-800">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 border-2 border-blue-500/40 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-dashed border-white/60 rounded-xl" />
            </div>
          </div>
        )}

        <form onSubmit={handleManual} className="w-full">
          <label className="block text-xs font-bold text-slate-400 mb-1">
            أدخل الرقم الجامعي أو رقم الهاتف:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={placeholder}
              dir="ltr"
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg"
            >
              تسجيل
            </button>
          </div>
        </form>

        <div className="w-full mt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

interface LectureQRModalProps {
  subject: Subject;
  onClose: () => void;
}

export const LectureQRModal: React.FC<LectureQRModalProps> = ({ subject, onClose }) => {
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      const lectureData = JSON.stringify({
        subjectId: subject.docId,
        subjectName: subject.name,
        time: Date.now(),
      });
      const url = await generateQRCodeDataUrl(lectureData);
      if (isMounted) setQrImage(url);
    };
    generate();
    return () => {
      isMounted = false;
    };
  }, [subject]);

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full">
        <div className="text-center">
          <h3 className="font-black text-lg text-white mb-1">باركود المحاضرة التفاعلي</h3>
          <p className="text-xs text-blue-400 font-bold">{subject.name}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200">
          {qrImage ? (
            <img src={qrImage} alt="Lecture QR" className="w-60 h-60" />
          ) : (
            <div className="w-60 h-60 flex items-center justify-center text-slate-500 font-bold text-xs">
              جاري توليد الباركود...
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 text-center font-bold">
          يمسح الطلاب هذا الباركود بهواتفهم من بوابة الطالب لتسجيل الحضور الفوري.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
        >
          إغلاق النافذة
        </button>
      </div>
    </div>
  );
};

interface CertificateModalProps {
  student: Student;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ student, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-xl w-full text-center relative overflow-hidden">
        <div className="w-20 h-20 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center border-2 border-amber-500/40 shadow-xl mb-1">
          <Award size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-amber-400 mb-1">شهادة تقدير وتفوق أكاديمي</h2>
          <p className="text-xs text-slate-400">تمنحها عمادة الجامعة الذكية التفاعلية للطلبة المتميزين</p>
        </div>
        <div className="py-6 border-y border-slate-800 w-full space-y-3">
          <p className="text-sm text-slate-300">تشهد عمادة الكلية بأن الطالب(ة):</p>
          <h3 className="text-3xl font-black text-white">{student.name}</h3>
          <p className="text-xs text-blue-400 font-bold">
            الرقم الجامعي: {student.id} | القسم: {student.department} | {student.level}
          </p>
          <p className="text-xs text-slate-400">
            قد أتم بنجاح كافة المتطلبات الأكاديمية والعملية والمواظبة على الحضور بامتياز.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg print-allow"
          >
            <Printer size={18} /> طباعة الشهادة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

interface StudentCardModalProps {
  student: Student;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({ student, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-xs w-full">
        <div className="w-full bg-gradient-to-b from-blue-700 via-indigo-900 to-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
          <div className="p-4 text-center text-white border-b border-white/10">
            <h2 className="font-black text-base">الجامعة الذكية التفاعلية</h2>
            <p className="text-[10px] text-blue-200">هوية طالب جامعي رقمية موثقة</p>
          </div>
          <div className="bg-white p-5 flex flex-col items-center text-slate-900">
            <div className="w-16 h-16 bg-slate-100 rounded-full mb-2 flex items-center justify-center text-slate-500 border border-slate-200">
              <User size={32} />
            </div>
            <h3 className="font-black text-sm text-center mb-0.5">{student.name}</h3>
            <p className="text-blue-600 font-bold text-xs mb-0.5">{student.department}</p>
            <p className="text-slate-500 text-[11px] mb-3">{student.level}</p>
            <div className="p-2 bg-white rounded-xl shadow border border-slate-100">
              {student.qrCode ? (
                <img src={student.qrCode} alt="QR" className="w-28 h-28" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-slate-400">
                  <QrCode size={40} />
                </div>
              )}
            </div>
            <p className="font-mono mt-3 font-black text-slate-800 text-sm tracking-wider" dir="ltr">
              {student.id}
            </p>
            <p className="font-mono text-xs text-slate-500 mt-0.5" dir="ltr">
              {student.phone || '-'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer print-allow"
          >
            <Printer size={16} /> طباعة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
