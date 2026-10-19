import { BarcodeSession, Professor, Student, StudentClearance, SystemData } from '../types.ts';
import { generateQRCodeDataUrl } from './qr.ts';
import { buildBarcodeQrPayload, generateProfessorBarcodeId } from './barcode.ts';
import { createStudentClearanceRecord } from './clearance.ts';

const STORAGE_KEY = 'royal_university_edu_system_v300';

export async function getInitialSeedData(): Promise<SystemData> {
  const qr1 = await generateQRCodeDataUrl('STU-102941');
  const qr2 = await generateQRCodeDataUrl('STU-205183');
  const qr3 = await generateQRCodeDataUrl('STU-309482');
  const qr4 = await generateQRCodeDataUrl('STU-408192');
  const qr5 = await generateQRCodeDataUrl('STU-501234');

  const profQr1 = await generateQRCodeDataUrl('PRF-101842');
  const profQr2 = await generateQRCodeDataUrl('PRF-204915');
  const profQr3 = await generateQRCodeDataUrl('PRF-308164');
  const profQr4 = await generateQRCodeDataUrl('PRF-409120');

  return {
    professors: [
      {
        docId: 'prof-1',
        profCode: 'PRF-101842',
        name: 'أ.د. علي الساعدي',
        username: 'ali',
        password: '123',
        department: 'هندسة تقنيات البرمجيات',
        roleType: 'ملاك دائم',
        qrCode: profQr1,
        isFrozen: false
      },
      {
        docId: 'prof-2',
        profCode: 'PRF-204915',
        name: 'د. مريم الكعبي',
        username: 'maryam',
        password: '123',
        department: 'علوم الحاسوب والذكاء الاصطناعي',
        roleType: 'ملاك دائم',
        qrCode: profQr2,
        isFrozen: false
      },
      {
        docId: 'prof-3',
        profCode: 'PRF-308164',
        name: 'د. أحمد البصري',
        username: 'ahmed',
        password: '123',
        department: 'الأمن السيبراني والتحري الرقمي',
        roleType: 'ملاك دائم',
        qrCode: profQr3,
        isFrozen: false
      },
      {
        docId: 'prof-4',
        profCode: 'PRF-409120',
        name: 'أ.د. سرمد الدليمي',
        username: 'sarmad',
        password: '123',
        department: 'النظم الموزعة والحوسبة السحابية',
        roleType: 'أستاذ ضيف',
        qrCode: profQr4,
        isFrozen: false
      }
    ],
    students: [
      {
        docId: 'stu-1',
        id: 'STU-102941',
        name: 'حيدر كرار العبيدي',
        level: 'المرحلة الثالثة',
        department: 'هندسة تقنيات البرمجيات',
        phone: '07701234567',
        qrCode: qr1
      },
      {
        docId: 'stu-2',
        id: 'STU-205183',
        name: 'فاطمة زهراء الربيعي',
        level: 'المرحلة الثالثة',
        department: 'علوم الحاسوب والذكاء الاصطناعي',
        phone: '07809876543',
        qrCode: qr2
      },
      {
        docId: 'stu-3',
        id: 'STU-309482',
        name: 'زينب عباس الجبوري',
        level: 'المرحلة الثانية',
        department: 'الأمن السيبراني والتحري الرقمي',
        phone: '07712398745',
        qrCode: qr3
      },
      {
        docId: 'stu-4',
        id: 'STU-408192',
        name: 'يوسف حسين السعد',
        level: 'المرحلة الرابعة',
        department: 'هندسة تقنيات البرمجيات',
        phone: '07505678912',
        qrCode: qr4
      },
      {
        docId: 'stu-5',
        id: 'STU-501234',
        name: 'كرار عمار التميمي',
        level: 'المرحلة الثالثة',
        department: 'علوم الحاسوب والذكاء الاصطناعي',
        phone: '07733445566',
        qrCode: qr5
      }
    ],
    subjects: [
      {
        docId: 'sub-1',
        name: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        professorId: 'prof-1'
      },
      {
        docId: 'sub-2',
        name: 'الذكاء الاصطناعي وشبكات التعلم العميق',
        professorId: 'prof-2'
      },
      {
        docId: 'sub-3',
        name: 'أمن البيانات والتشفير التطبيقي',
        professorId: 'prof-3'
      }
    ],
    attendance: [
      { docId: 'att-1', studentId: 'STU-102941', subjectId: 'sub-1', date: '2026-10-15', status: 'حاضر' },
      { docId: 'att-2', studentId: 'STU-205183', subjectId: 'sub-1', date: '2026-10-15', status: 'حاضر' },
      { docId: 'att-3', studentId: 'STU-309482', subjectId: 'sub-1', date: '2026-10-15', status: 'غائب' },
      { docId: 'att-4', studentId: 'STU-408192', subjectId: 'sub-1', date: '2026-10-15', status: 'حاضر' },
      { docId: 'att-5', studentId: 'STU-501234', subjectId: 'sub-1', date: '2026-10-15', status: 'حاضر' },

      { docId: 'att-6', studentId: 'STU-102941', subjectId: 'sub-1', date: '2026-10-18', status: 'حاضر' },
      { docId: 'att-7', studentId: 'STU-205183', subjectId: 'sub-1', date: '2026-10-18', status: 'حاضر' },
      { docId: 'att-8', studentId: 'STU-309482', subjectId: 'sub-1', date: '2026-10-18', status: 'غائب' },
      { docId: 'att-9', studentId: 'STU-408192', subjectId: 'sub-1', date: '2026-10-18', status: 'غائب' },
      { docId: 'att-10', studentId: 'STU-501234', subjectId: 'sub-1', date: '2026-10-18', status: 'حاضر' }
    ],
    grades: getDefaultGrades(),
    lectures: [
      {
        docId: 'lec-1',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        title: 'المحاضرة 01: معمارية البرمجيات الحديثة Microservices & Clean Architecture',
        fileUrl: 'https://drive.google.com',
        notes: 'تشمل أمثلة عملية حول النظم الموزعة ونماذج تصميم النظم.',
        date: '2026-10-10'
      },
      {
        docId: 'lec-2',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        title: 'المحاضرة 02: اختبار النظم وضمان الجودة CI/CD Automation',
        fileUrl: 'https://drive.google.com',
        notes: 'مطلوب مراجعة السلايدات ومناقشتها في المختبر العملي القادم.',
        date: '2026-10-14'
      },
      {
        docId: 'lec-3',
        subjectId: 'sub-2',
        subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
        title: 'المحاضرة 01: شبكات الأعصاب التلافيفية CNN ونماذج الرؤية الحاسوبية',
        fileUrl: 'https://drive.google.com',
        notes: 'تحتوي على تدريبات عملية باستخدام مكتبات بايثون الحديثة.',
        date: '2026-10-12'
      }
    ],
    broadcasts: [
      {
        docId: 'bc-1',
        message: 'أمر إداري: نرحب بكافة الأساتذة والطلبة في العام الجامعي الجديد، ونؤكد على ضرورة الالتزام بجداول المحاضرات ورصد الحضور اليومي عبر المنظومة الذكية.',
        target: 'all',
        date: '2026-10-15 09:00 ص'
      }
    ],
    schedule: [
      {
        docId: 'slot-1',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        professorName: 'أ.د. علي الساعدي',
        dayOfWeek: 'الأحد',
        startTime: '08:30',
        endTime: '10:30',
        room: 'قاعة الخوارزمي الكبرى (Hall A)',
        type: 'نظري',
        notes: 'مقدمة في المعمارية السحابية و Microservices'
      },
      {
        docId: 'slot-2',
        subjectId: 'sub-2',
        subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
        professorName: 'د. مريم الكعبي',
        dayOfWeek: 'الأحد',
        startTime: '11:00',
        endTime: '13:00',
        room: 'مختبر الحوسبة والذكاء الاصطناعي (Lab 3)',
        type: 'عملي',
        notes: 'تدريب عملي على مكتبات PyTorch و TensorFlow'
      },
      {
        docId: 'slot-3',
        subjectId: 'sub-3',
        subjectName: 'أمن البيانات والتشفير التطبيقي',
        professorName: 'د. أحمد البصري',
        dayOfWeek: 'الإثنين',
        startTime: '09:00',
        endTime: '11:00',
        room: 'قاعة ابن الهيثم (Hall B)',
        type: 'نظري',
        notes: 'خوارزميات التشفير غير المتناظر RSA و ECC'
      },
      {
        docId: 'slot-4',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        professorName: 'أ.د. علي الساعدي',
        dayOfWeek: 'الإثنين',
        startTime: '11:30',
        endTime: '13:30',
        room: 'مختبر البرمجيات والشبكات (Lab 1)',
        type: 'عملي',
        notes: 'تطبيق أتمتة CI/CD باستخدام Docker و Kubernetes'
      },
      {
        docId: 'slot-5',
        subjectId: 'sub-2',
        subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
        professorName: 'د. مريم الكعبي',
        dayOfWeek: 'الثلاثاء',
        startTime: '09:00',
        endTime: '11:00',
        room: 'قاعة الخوارزمي الكبرى (Hall A)',
        type: 'نظري',
        notes: 'الشبكات التلافيفية CNN ونماذج الرؤية'
      },
      {
        docId: 'slot-6',
        subjectId: 'sub-3',
        subjectName: 'أمن البيانات والتشفير التطبيقي',
        professorName: 'د. أحمد البصري',
        dayOfWeek: 'الثلاثاء',
        startTime: '11:30',
        endTime: '13:30',
        room: 'مختبر الأمن السيبراني والتحري (Cyber Lab)',
        type: 'عملي',
        notes: 'فحص الثغرات الأمنية والشهادات الرقمية'
      },
      {
        docId: 'slot-7',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        professorName: 'أ.د. علي الساعدي',
        dayOfWeek: 'الأربعاء',
        startTime: '10:00',
        endTime: '12:00',
        room: 'قاعة ابن الهيثم (Hall B)',
        type: 'امتحان',
        notes: 'الامتحان الشهري الفصلي الأول'
      },
      {
        docId: 'slot-8',
        subjectId: 'sub-2',
        subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
        professorName: 'د. مريم الكعبي',
        dayOfWeek: 'الخميس',
        startTime: '09:00',
        endTime: '11:00',
        room: 'مختبر الحوسبة والذكاء الاصطناعي (Lab 3)',
        type: 'عملي',
        notes: 'مناقشة مشاريع الذكاء الاصطناعي الفصلية'
      }
    ],
    requests: [
      {
        docId: 'req-1',
        studentId: 'STU-309482',
        studentName: 'زينب عباس الجبوري',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        type: 'excuse',
        status: 'قيد المراجعة',
        createdAt: '2026-10-18',
        absenceDate: '2026-10-15',
        attachmentUrl: 'https://drive.google.com/medical-report-309482',
        reason: 'إجازة مرضية رسمية صادرة من المركز الصحي الجامعي بسبب وعكة صحية طارئة يوم المحاضرة.'
      },
      {
        docId: 'req-2',
        studentId: 'STU-309482',
        studentName: 'زينب عباس الجبوري',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        type: 'appeal',
        status: 'قيد المراجعة',
        createdAt: '2026-10-19',
        gradeComponent: 'midterm',
        currentScore: 18,
        requestedScore: 24,
        reason: 'أرجو التكرم بإعادة تدقيق جمع درجات السؤال الثاني (الفرع ب) في دفتر الامتحان الفصلي.'
      },
      {
        docId: 'req-3',
        studentId: 'STU-408192',
        studentName: 'يوسف حسين السعد',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        type: 'excuse',
        status: 'قيد المراجعة',
        createdAt: '2026-10-19',
        absenceDate: '2026-10-18',
        attachmentUrl: 'https://drive.google.com/delegation-letter-408192',
        reason: 'مشاركة رسمية في وفد الكلية لمسابقة البرمجة الجامعية الوطنية بموجب كتاب عمادة الكلية.'
      },
      {
        docId: 'req-4',
        studentId: 'STU-102941',
        studentName: 'حيدر كرار العبيدي',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        type: 'appeal',
        status: 'مقبول',
        createdAt: '2026-10-16',
        gradeComponent: 'quiz',
        currentScore: 15,
        requestedScore: 18,
        reason: 'تم تسليم ورقة الكويز الإضافي في المختبر ولم تُضف للدرجة الأولية.',
        professorNote: 'تمت مراجعة ورقة الكويز الإضافي وتعديل الدرجة إلى 18.',
        resolvedAt: '2026-10-17'
      }
    ],
    quizzes: getDefaultQuizzes(),
    quizSubmissions: getDefaultQuizSubmissions(),
    barcodeSessions: getDefaultBarcodeSessions(),
    clearances: getDefaultClearances(),
    settings: {
      telegramToken: '',
      telegramChatId: ''
    }
  };
}

function getDefaultQuizzes() {
  return [
    {
      docId: 'quiz-1',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
      professorName: 'أ.د. علي الساعدي',
      title: 'الاختبار القصير الأول: معمارية الخدمات المصغرة و CI/CD',
      description: 'اختبار تقييمي قصير يغطي مفاهيم Microservices وتنسيق الحاويات وأتمتة التكامل المستمر.',
      durationMinutes: 10,
      maxScore: 20,
      isActive: true,
      autoSyncToGrades: true,
      createdAt: '2026-10-18',
      questions: [
        {
          id: 'q1',
          questionText: 'ما الميزة المعمارية الأهم لنمط الخدمات المصغرة (Microservices) مقارنة بالأنظمة المتراصة (Monolithic)؟',
          options: [
            'استقلالية النشر والتوسع لكل خدمة برمجية دون تعطيل بقية النظام',
            'حصر جميع العمليات في قاعدة بيانات جدولية واحدة',
            'إلغاء الحاجة لبروتوكولات الاتصال الشبكي بين المكونات',
            'منع استخدام الحاويات السحابية في بيئة الإنتاج'
          ] as [string, string, string, string],
          correctOptionIndex: 0,
          points: 5,
          explanation: 'تتيح الخدمات المصغرة نشر وتوسيع كل خدمة بشكل مستقل مما يرفع الاعتمادية والمرونة.'
        },
        {
          id: 'q2',
          questionText: 'أي من المنصات التالية تُعد المعيار القياسي لتنسيق وإدارة الحاويات (Container Orchestration)؟',
          options: [
            'GitLab Wiki',
            'Kubernetes (K8s)',
            'SQLite Embedded',
            'Apache Maven'
          ] as [string, string, string, string],
          correctOptionIndex: 1,
          points: 5,
          explanation: 'نظام Kubernetes هو المعيار الصناعي لإدارة الحاويات وجدولة الأحمال والتوسع التلقائي.'
        },
        {
          id: 'q3',
          questionText: 'ما الهدف الرئيسي من خط أنابيب التكامل المستمر (Continuous Integration - CI)؟',
          options: [
            'دمج الشيفرة البرمجية وتشغيل الاختبارات المؤتمتة مبكراً لاكتشاف الأخطاء فوراً',
            'تأجيل فحص الكود إلى نهاية الفصل الدراسي فقط',
            'كتابة الشيفرة البرمجية بدون استخدام نظام إدارة النسخ Git',
            'إيقاف الخوادم السحابية أثناء ساعات الدوام الرسمي'
          ] as [string, string, string, string],
          correctOptionIndex: 0,
          points: 5,
          explanation: 'التكامل المستمر يضمن بناء واختبار كل تحديث برمجي آلياً فور رفعه للمستودع.'
        },
        {
          id: 'q4',
          questionText: 'في معمارية البرمجيات النظيفة (Clean Architecture)، أي طبقة تقع في المركز ولا تعتمد على المكتبات الخارجية؟',
          options: [
            'طبقة واجهة المستخدم الرسومية (UI Layer)',
            'طبقة الكيانات وقواعد العمل الأساسية (Domain Entities)',
            'طبقة محركات قواعد البيانات الخارجية',
            'طبقة بوابات الدفع الإلكتروني'
          ] as [string, string, string, string],
          correctOptionIndex: 1,
          points: 5,
          explanation: 'طبقة الكيانات (Entities) تمثل جوهر منطق النظام وتبقى مستقلة عن أي إطار عمل خارجي.'
        }
      ]
    },
    {
      docId: 'quiz-2',
      subjectId: 'sub-2',
      subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
      professorName: 'د. مريم الكعبي',
      title: 'الاختبار القصير الأول: الشبكات العصبية التلافيفية (CNN)',
      description: 'يختبر هذا الكويز فهم طبقات الالتفاف (Convolution) والتجميع (Pooling) ودوال التفعيل.',
      durationMinutes: 12,
      maxScore: 20,
      isActive: true,
      autoSyncToGrades: true,
      createdAt: '2026-10-19',
      questions: [
        {
          id: 'q2-1',
          questionText: 'ما الوظيفة الأساسية لطبقة التجميع (Max Pooling) في الشبكات العصبية التلافيفية؟',
          options: [
            'تقليص الأبعاد المكانية لخريطة الخصائص وتقليل المعاملات الحسابية',
            'زيادة حجم الصورة الأصلية إلى أربعة أضعاف',
            'تحويل النصوص البرمجية إلى جداول علائقية',
            'حذف دالة الخسارة (Loss Function) من التدريب'
          ] as [string, string, string, string],
          correctOptionIndex: 0,
          points: 10,
          explanation: 'طبقة Max Pooling تحتفظ بأبرز السمات المكانية مع تقليل الأبعاد الحسابية وتجنب فرط التخصيص.'
        },
        {
          id: 'q2-2',
          questionText: 'أي دالة تفعيل (Activation Function) تُستخدم على نطاق واسع في الطبقات المخفية لمعالجة تلاشي المشتقات؟',
          options: [
            'دالة ReLU (Rectified Linear Unit)',
            'دالة الخط المستقيم الثابت',
            'دالة الترتيب الأبجدي',
            'دالة الضغط الثنائي للصور'
          ] as [string, string, string, string],
          correctOptionIndex: 0,
          points: 10,
          explanation: 'دالة ReLU تمرر القيم الموجبة كما هي وتصفّر القيم السالبة مما يسرّع تقارب الشبكة العميقة.'
        }
      ]
    }
  ];
}

function getDefaultQuizSubmissions() {
  return [
    {
      docId: 'subm-1',
      quizId: 'quiz-1',
      quizTitle: 'الاختبار القصير الأول: معمارية الخدمات المصغرة و CI/CD',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
      studentId: 'STU-205183',
      studentName: 'فاطمة زهراء الربيعي',
      answers: [0, 1, 0, 1],
      earnedScore: 20,
      maxScore: 20,
      normalizedQuizScore20: 20,
      correctCount: 4,
      totalQuestions: 4,
      submittedAt: '2026-10-18 14:20',
      timeSpentSeconds: 215,
      syncedToGrades: true
    },
    {
      docId: 'subm-2',
      quizId: 'quiz-1',
      quizTitle: 'الاختبار القصير الأول: معمارية الخدمات المصغرة و CI/CD',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
      studentId: 'STU-408192',
      studentName: 'يوسف حسين السعد',
      answers: [0, 1, 0, 2],
      earnedScore: 15,
      maxScore: 20,
      normalizedQuizScore20: 15,
      correctCount: 3,
      totalQuestions: 4,
      submittedAt: '2026-10-18 15:05',
      timeSpentSeconds: 310,
      syncedToGrades: true
    },
    {
      docId: 'subm-3',
      quizId: 'quiz-1',
      quizTitle: 'الاختبار القصير الأول: معمارية الخدمات المصغرة و CI/CD',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
      studentId: 'STU-501234',
      studentName: 'كرار عمار التميمي',
      answers: [0, 1, 0, 1],
      earnedScore: 20,
      maxScore: 20,
      normalizedQuizScore20: 20,
      correctCount: 4,
      totalQuestions: 4,
      submittedAt: '2026-10-18 16:10',
      timeSpentSeconds: 190,
      syncedToGrades: true
    }
  ];
}

export function loadStoredData(): SystemData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.schedule || parsed.schedule.length === 0) {
        parsed.schedule = [
          {
            docId: 'slot-1',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            professorName: 'أ.د. علي الساعدي',
            dayOfWeek: 'الأحد',
            startTime: '08:30',
            endTime: '10:30',
            room: 'قاعة الخوارزمي الكبرى (Hall A)',
            type: 'نظري',
            notes: 'مقدمة في المعمارية السحابية و Microservices'
          },
          {
            docId: 'slot-2',
            subjectId: 'sub-2',
            subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
            professorName: 'د. مريم الكعبي',
            dayOfWeek: 'الأحد',
            startTime: '11:00',
            endTime: '13:00',
            room: 'مختبر الحوسبة والذكاء الاصطناعي (Lab 3)',
            type: 'عملي',
            notes: 'تدريب عملي على مكتبات PyTorch و TensorFlow'
          },
          {
            docId: 'slot-3',
            subjectId: 'sub-3',
            subjectName: 'أمن البيانات والتشفير التطبيقي',
            professorName: 'د. أحمد البصري',
            dayOfWeek: 'الإثنين',
            startTime: '09:00',
            endTime: '11:00',
            room: 'قاعة ابن الهيثم (Hall B)',
            type: 'نظري',
            notes: 'خوارزميات التشفير غير المتناظر RSA و ECC'
          },
          {
            docId: 'slot-4',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            professorName: 'أ.د. علي الساعدي',
            dayOfWeek: 'الإثنين',
            startTime: '11:30',
            endTime: '13:30',
            room: 'مختبر البرمجيات والشبكات (Lab 1)',
            type: 'عملي',
            notes: 'تطبيق أتمتة CI/CD باستخدام Docker و Kubernetes'
          },
          {
            docId: 'slot-5',
            subjectId: 'sub-2',
            subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
            professorName: 'د. مريم الكعبي',
            dayOfWeek: 'الثلاثاء',
            startTime: '09:00',
            endTime: '11:00',
            room: 'قاعة الخوارزمي الكبرى (Hall A)',
            type: 'نظري',
            notes: 'الشبكات التلافيفية CNN ونماذج الرؤية'
          },
          {
            docId: 'slot-6',
            subjectId: 'sub-3',
            subjectName: 'أمن البيانات والتشفير التطبيقي',
            professorName: 'د. أحمد البصري',
            dayOfWeek: 'الثلاثاء',
            startTime: '11:30',
            endTime: '13:30',
            room: 'مختبر الأمن السيبراني والتحري (Cyber Lab)',
            type: 'عملي',
            notes: 'فحص الثغرات الأمنية والشهادات الرقمية'
          },
          {
            docId: 'slot-7',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            professorName: 'أ.د. علي الساعدي',
            dayOfWeek: 'الأربعاء',
            startTime: '10:00',
            endTime: '12:00',
            room: 'قاعة ابن الهيثم (Hall B)',
            type: 'امتحان',
            notes: 'الامتحان الشهري الفصلي الأول'
          },
          {
            docId: 'slot-8',
            subjectId: 'sub-2',
            subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
            professorName: 'د. مريم الكعبي',
            dayOfWeek: 'الخميس',
            startTime: '09:00',
            endTime: '11:00',
            room: 'مختبر الحوسبة والذكاء الاصطناعي (Lab 3)',
            type: 'عملي',
            notes: 'مناقشة مشاريع الذكاء الاصطناعي الفصلية'
          }
        ];
      }
      if (!parsed.requests || parsed.requests.length === 0) {
        parsed.requests = [
          {
            docId: 'req-1',
            studentId: 'STU-309482',
            studentName: 'زينب عباس الجبوري',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            type: 'excuse',
            status: 'قيد المراجعة',
            createdAt: '2026-10-18',
            absenceDate: '2026-10-15',
            attachmentUrl: 'https://drive.google.com/medical-report-309482',
            reason: 'إجازة مرضية رسمية صادرة من المركز الصحي الجامعي بسبب وعكة صحية طارئة يوم المحاضرة.'
          },
          {
            docId: 'req-2',
            studentId: 'STU-309482',
            studentName: 'زينب عباس الجبوري',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            type: 'appeal',
            status: 'قيد المراجعة',
            createdAt: '2026-10-19',
            gradeComponent: 'midterm',
            currentScore: 18,
            requestedScore: 24,
            reason: 'أرجو التكرم بإعادة تدقيق جمع درجات السؤال الثاني (الفرع ب) في دفتر الامتحان الفصلي.'
          },
          {
            docId: 'req-3',
            studentId: 'STU-408192',
            studentName: 'يوسف حسين السعد',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            type: 'excuse',
            status: 'قيد المراجعة',
            createdAt: '2026-10-19',
            absenceDate: '2026-10-18',
            attachmentUrl: 'https://drive.google.com/delegation-letter-408192',
            reason: 'مشاركة رسمية في وفد الكلية لمسابقة البرمجة الجامعية الوطنية بموجب كتاب عمادة الكلية.'
          },
          {
            docId: 'req-4',
            studentId: 'STU-102941',
            studentName: 'حيدر كرار العبيدي',
            subjectId: 'sub-1',
            subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
            type: 'appeal',
            status: 'مقبول',
            createdAt: '2026-10-16',
            gradeComponent: 'quiz',
            currentScore: 15,
            requestedScore: 18,
            reason: 'تم تسليم ورقة الكويز الإضافي في المختبر ولم تُضف للدرجة الأولية.',
            professorNote: 'تمت مراجعة ورقة الكويز الإضافي وتعديل الدرجة إلى 18.',
            resolvedAt: '2026-10-17'
          }
        ];
      }
      if (!parsed.quizzes || parsed.quizzes.length === 0) {
        parsed.quizzes = getDefaultQuizzes();
      }
      if (!parsed.quizSubmissions) {
        parsed.quizSubmissions = getDefaultQuizSubmissions();
      }
      if (!parsed.barcodeSessions || parsed.barcodeSessions.length === 0) {
        parsed.barcodeSessions = getDefaultBarcodeSessions();
      }
      if (!parsed.clearances || parsed.clearances.length === 0) {
        parsed.clearances = getDefaultClearances(parsed.students);
      }
      if (parsed.professors && Array.isArray(parsed.professors)) {
        const defaultProfs: Professor[] = [
          {
            docId: 'prof-1',
            profCode: 'PRF-101842',
            name: 'أ.د. علي الساعدي',
            username: 'ali',
            password: '123',
            department: 'هندسة تقنيات البرمجيات',
            roleType: 'ملاك دائم',
            isFrozen: false,
          },
          {
            docId: 'prof-2',
            profCode: 'PRF-204915',
            name: 'د. مريم الكعبي',
            username: 'maryam',
            password: '123',
            department: 'علوم الحاسوب والذكاء الاصطناعي',
            roleType: 'ملاك دائم',
            isFrozen: false,
          },
          {
            docId: 'prof-3',
            profCode: 'PRF-308164',
            name: 'د. أحمد البصري',
            username: 'ahmed',
            password: '123',
            department: 'الأمن السيبراني والتحري الرقمي',
            roleType: 'ملاك دائم',
            isFrozen: false,
          },
          {
            docId: 'prof-4',
            profCode: 'PRF-409120',
            name: 'أ.د. سرمد الدليمي',
            username: 'sarmad',
            password: '123',
            department: 'النظم الموزعة والحوسبة السحابية',
            roleType: 'أستاذ ضيف',
            isFrozen: false,
          },
        ];
        parsed.professors = parsed.professors.map((p: Professor) => {
          const match = defaultProfs.find((dp) => dp.username === p.username);
          return {
            ...p,
            profCode: p.profCode || match?.profCode || generateProfessorBarcodeId(p.username),
            department: p.department || match?.department || 'هندسة تقنيات البرمجيات',
            roleType: p.roleType || match?.roleType || 'ملاك دائم',
          };
        });
        for (const dp of defaultProfs) {
          if (!parsed.professors.some((p: Professor) => p.username === dp.username)) {
            parsed.professors.push(dp);
          }
        }
      }
      const defaultGrades = getDefaultGrades();
      if (!parsed.grades) {
        parsed.grades = defaultGrades;
      } else {
        for (const dg of defaultGrades) {
          const exists = parsed.grades.some(
            (g: { studentId: string; subjectId: string }) =>
              g.studentId === dg.studentId && g.subjectId === dg.subjectId
          );
          if (!exists) {
            parsed.grades.push(dg);
          }
        }
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load local storage:', err);
  }
  return null;
}

function getDefaultBarcodeSessions(): BarcodeSession[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      docId: 'bs-seed-1',
      sessionCode: 'BAR-101920',
      profCode: 'PRF-101842',
      professorId: 'prof-1',
      professorName: 'أ.د. علي الساعدي',
      professorRole: 'ملاك دائم',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
      lectureTitle: 'المحاضرة 03: معمارية الحاويات وتوازن الأحمال السحابية',
      room: 'قاعة الخوارزمي الكبرى (Hall A)',
      date: today,
      createdAt: '08:30 ص',
      durationMinutes: 60,
      isActive: true,
      qrPayload: buildBarcodeQrPayload({
        sessionCode: 'BAR-101920',
        profCode: 'PRF-101842',
        professorId: 'prof-1',
        professorName: 'أ.د. علي الساعدي',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        lectureTitle: 'المحاضرة 03: معمارية الحاويات وتوازن الأحمال السحابية',
        room: 'قاعة الخوارزمي الكبرى (Hall A)',
        date: today,
      }),
      registeredStudents: [
        {
          studentId: 'STU-205183',
          studentName: 'فاطمة زهراء الربيعي',
          department: 'علوم الحاسوب والذكاء الاصطناعي',
          scannedAt: '08:34 ص',
          method: 'qr',
        },
        {
          studentId: 'STU-501234',
          studentName: 'كرار عمار التميمي',
          department: 'علوم الحاسوب والذكاء الاصطناعي',
          scannedAt: '08:36 ص',
          method: 'qr',
        },
      ],
    },
    {
      docId: 'bs-seed-2',
      sessionCode: 'BAR-409550',
      profCode: 'PRF-409120',
      professorId: 'prof-4',
      professorName: 'أ.د. سرمد الدليمي',
      professorRole: 'أستاذ ضيف',
      subjectId: 'sub-1',
      subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
      lectureTitle: 'ندوة الأستاذ الضيف: هندسة الأنظمة الموزعة فائقة الاعتمادية',
      room: 'قاعة المؤتمرات الذكية (VIP Hall)',
      date: today,
      createdAt: '10:00 ص',
      durationMinutes: 90,
      isActive: true,
      qrPayload: buildBarcodeQrPayload({
        sessionCode: 'BAR-409550',
        profCode: 'PRF-409120',
        professorId: 'prof-4',
        professorName: 'أ.د. سرمد الدليمي',
        subjectId: 'sub-1',
        subjectName: 'هندسة البرمجيات المتقدمة والنظم السحابية',
        lectureTitle: 'ندوة الأستاذ الضيف: هندسة الأنظمة الموزعة فائقة الاعتمادية',
        room: 'قاعة المؤتمرات الذكية (VIP Hall)',
        date: today,
      }),
      registeredStudents: [
        {
          studentId: 'STU-205183',
          studentName: 'فاطمة زهراء الربيعي',
          department: 'علوم الحاسوب والذكاء الاصطناعي',
          scannedAt: '10:03 ص',
          method: 'code',
        },
      ],
    },
    {
      docId: 'bs-seed-3',
      sessionCode: 'BAR-204881',
      profCode: 'PRF-204915',
      professorId: 'prof-2',
      professorName: 'د. مريم الكعبي',
      professorRole: 'ملاك دائم',
      subjectId: 'sub-2',
      subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
      lectureTitle: 'المختبر العملي: تدريب نماذج الرؤية الحاسوبية YOLOv8',
      room: 'مختبر الحوسبة والذكاء الاصطناعي (Lab 3)',
      date: today,
      createdAt: '11:00 ص',
      durationMinutes: 60,
      isActive: true,
      qrPayload: buildBarcodeQrPayload({
        sessionCode: 'BAR-204881',
        profCode: 'PRF-204915',
        professorId: 'prof-2',
        professorName: 'د. مريم الكعبي',
        subjectId: 'sub-2',
        subjectName: 'الذكاء الاصطناعي وشبكات التعلم العميق',
        lectureTitle: 'المختبر العملي: تدريب نماذج الرؤية الحاسوبية YOLOv8',
        room: 'مختبر الحوسبة والذكاء الاصطناعي (Lab 3)',
        date: today,
      }),
      registeredStudents: [],
    },
  ];
}

export function saveStoredData(data: SystemData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }
}

function getDefaultGrades() {
  return [
    // Subject 1: هندسة البرمجيات المتقدمة والنظم السحابية
    {
      docId: 'grd-1',
      studentId: 'STU-102941',
      subjectId: 'sub-1',
      report: 10,
      attendanceScore: 10,
      lab: 20,
      midterm: 28,
      quiz: 18,
      total: 86,
    },
    {
      docId: 'grd-2',
      studentId: 'STU-205183',
      subjectId: 'sub-1',
      report: 10,
      attendanceScore: 10,
      lab: 19,
      midterm: 29,
      quiz: 20,
      total: 88,
    },
    {
      docId: 'grd-3',
      studentId: 'STU-309482',
      subjectId: 'sub-1',
      report: 7,
      attendanceScore: 5,
      lab: 14,
      midterm: 18,
      quiz: 12,
      total: 56,
    },
    {
      docId: 'grd-4',
      studentId: 'STU-408192',
      subjectId: 'sub-1',
      report: 9,
      attendanceScore: 8,
      lab: 18,
      midterm: 25,
      quiz: 16,
      total: 76,
    },
    {
      docId: 'grd-5',
      studentId: 'STU-501234',
      subjectId: 'sub-1',
      report: 10,
      attendanceScore: 10,
      lab: 20,
      midterm: 30,
      quiz: 20,
      total: 90,
    },
    // Subject 2: الذكاء الاصطناعي وشبكات التعلم العميق
    {
      docId: 'grd-6',
      studentId: 'STU-102941',
      subjectId: 'sub-2',
      report: 10,
      attendanceScore: 10,
      lab: 19,
      midterm: 28,
      quiz: 24,
      total: 91,
    },
    {
      docId: 'grd-7',
      studentId: 'STU-205183',
      subjectId: 'sub-2',
      report: 10,
      attendanceScore: 10,
      lab: 20,
      midterm: 28,
      quiz: 24,
      total: 92,
    },
    {
      docId: 'grd-8',
      studentId: 'STU-309482',
      subjectId: 'sub-2',
      report: 8,
      attendanceScore: 7,
      lab: 15,
      midterm: 19,
      quiz: 14,
      total: 63,
    },
    {
      docId: 'grd-9',
      studentId: 'STU-408192',
      subjectId: 'sub-2',
      report: 8,
      attendanceScore: 9,
      lab: 17,
      midterm: 23,
      quiz: 18,
      total: 75,
    },
    {
      docId: 'grd-10',
      studentId: 'STU-501234',
      subjectId: 'sub-2',
      report: 10,
      attendanceScore: 10,
      lab: 20,
      midterm: 29,
      quiz: 26,
      total: 95,
    },
    // Subject 3: أمن البيانات والتشفير التطبيقي
    {
      docId: 'grd-11',
      studentId: 'STU-102941',
      subjectId: 'sub-3',
      report: 9,
      attendanceScore: 10,
      lab: 19,
      midterm: 27,
      quiz: 24,
      total: 89,
    },
    {
      docId: 'grd-12',
      studentId: 'STU-205183',
      subjectId: 'sub-3',
      report: 9,
      attendanceScore: 10,
      lab: 19,
      midterm: 28,
      quiz: 22,
      total: 88,
    },
    {
      docId: 'grd-13',
      studentId: 'STU-309482',
      subjectId: 'sub-3',
      report: 6,
      attendanceScore: 6,
      lab: 12,
      midterm: 15,
      quiz: 10,
      total: 49,
    },
    {
      docId: 'grd-14',
      studentId: 'STU-408192',
      subjectId: 'sub-3',
      report: 8,
      attendanceScore: 8,
      lab: 16,
      midterm: 21,
      quiz: 18,
      total: 71,
    },
    {
      docId: 'grd-15',
      studentId: 'STU-501234',
      subjectId: 'sub-3',
      report: 10,
      attendanceScore: 10,
      lab: 19,
      midterm: 29,
      quiz: 24,
      total: 92,
    },
  ];
}

export function getDefaultClearances(customStudents?: Student[]): StudentClearance[] {
  const baseStudents: Student[] =
    customStudents && customStudents.length > 0
      ? customStudents
      : [
          {
            docId: 'stu-1',
            id: 'STU-102941',
            name: 'حيدر كرار العبيدي',
            level: 'المرحلة الثالثة',
            department: 'هندسة تقنيات البرمجيات',
            phone: '07701234567',
          },
          {
            docId: 'stu-2',
            id: 'STU-205183',
            name: 'فاطمة زهراء الربيعي',
            level: 'المرحلة الثالثة',
            department: 'علوم الحاسوب والذكاء الاصطناعي',
            phone: '07809876543',
          },
          {
            docId: 'stu-3',
            id: 'STU-309482',
            name: 'زينب عباس الجبوري',
            level: 'المرحلة الثانية',
            department: 'الأمن السيبراني والتحري الرقمي',
            phone: '07712398745',
          },
          {
            docId: 'stu-4',
            id: 'STU-408192',
            name: 'يوسف حسين السعد',
            level: 'المرحلة الرابعة',
            department: 'هندسة تقنيات البرمجيات',
            phone: '07505678912',
          },
          {
            docId: 'stu-5',
            id: 'STU-501234',
            name: 'كرار عمار التميمي',
            level: 'المرحلة الثالثة',
            department: 'علوم الحاسوب والذكاء الاصطناعي',
            phone: '07733445566',
          },
        ];

  return baseStudents.map((stu, idx) => {
    if (stu.id === 'STU-309482' || idx === 2) {
      return createStudentClearanceRecord(stu, {
        bloodGroup: 'A+',
        statuses: {
          finance: { status: 'مكتمل' },
          library: {
            status: 'قيد المراجعة',
            note: 'بانتظار تسليم كتاب (الشبكات العصبية العميقة - الجزء الثاني) للمكتبة المركزية',
          },
          labs: {
            status: 'معلق - ذمة',
            note: 'توجد عُهدة حقيبة أدوات فحص الشبكات السيبرانية في مختبر الأمن السيبراني',
          },
          examination: { status: 'مكتمل' },
          student_affairs: { status: 'قيد المراجعة' },
        },
      });
    }
    if (stu.id === 'STU-408192' || idx === 3) {
      return createStudentClearanceRecord(stu, {
        bloodGroup: 'B+',
        statuses: {
          finance: { status: 'مكتمل' },
          library: { status: 'مكتمل' },
          labs: { status: 'مكتمل' },
          examination: {
            status: 'قيد المراجعة',
            note: 'بانتظار تسليم النسخة النهائية من مشروع التخرج للجنة الامتحانية',
          },
          student_affairs: { status: 'مكتمل' },
        },
      });
    }
    return createStudentClearanceRecord(stu, {
      bloodGroup: idx % 2 === 0 ? 'O+' : 'AB+',
    });
  });
}


