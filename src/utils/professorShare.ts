import type { BarcodeSession, Professor, Student, Subject } from '../types.ts';

export const DEFAULT_SHARED_APP_ORIGIN =
  'https://ais-pre-x7jpvcrjffukwjtdhpz5yr-33194573907.europe-west2.run.app';

export interface ProfessorInvitePayload {
  docId: string;
  profCode: string;
  name: string;
  username: string;
  password?: string;
  department: string;
  roleType: 'ملاك دائم' | 'أستاذ ضيف';
  subjectName?: string;
  sessionCode?: string;
  lectureTitle?: string;
}

/**
 * Converts private AI Studio development URLs (ais-dev-*) to public shared preview URLs (ais-pre-*)
 * so links sent to professors do not fail with private session errors.
 */
export function resolvePublicSharedOrigin(rawOrigin?: string): string {
  if (!rawOrigin || !rawOrigin.trim()) {
    return DEFAULT_SHARED_APP_ORIGIN;
  }
  const trimmed = rawOrigin.trim().replace(/\/+$/, '');
  if (trimmed.includes('ais-dev-')) {
    return trimmed.replace('ais-dev-', 'ais-pre-');
  }
  return trimmed;
}

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(base64Url: string): string {
  const padded = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeProfessorInvitePayload(
  professor: Professor,
  subjects: Subject[] = [],
  sessions: BarcodeSession[] = []
): string {
  const profSub = subjects.find(
    (s) => s.professorId === professor.docId || s.professorId === professor.username
  );
  const profSess = sessions.find(
    (bs) =>
      bs.professorId === professor.docId ||
      bs.professorId === professor.username ||
      bs.profCode === professor.profCode
  );

  const payload: ProfessorInvitePayload = {
    docId: professor.docId || `prof-${professor.username}`,
    profCode: professor.profCode || `PRF-${professor.username.toUpperCase()}`,
    name: professor.name,
    username: professor.username,
    password: professor.password || '123',
    department: professor.department || 'هندسة تقنيات البرمجيات',
    roleType: professor.roleType || 'ملاك دائم',
    subjectName: profSub?.name || `مقرر ${professor.name}`,
    sessionCode: profSess?.sessionCode,
    lectureTitle: profSess?.lectureTitle,
  };

  return utf8ToBase64Url(JSON.stringify(payload));
}

export function decodeProfessorInvitePayload(encoded: string): ProfessorInvitePayload | null {
  if (!encoded || !encoded.trim()) return null;
  try {
    const json = base64UrlToUtf8(encoded.trim());
    const parsed = JSON.parse(json) as ProfessorInvitePayload;
    if (!parsed || typeof parsed.username !== 'string' || typeof parsed.name !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildProfessorInviteLink(
  rawOrigin: string,
  professor: Professor,
  subjects: Subject[] = [],
  sessions: BarcodeSession[] = []
): string {
  const publicOrigin = resolvePublicSharedOrigin(rawOrigin);
  const inviteToken = encodeProfessorInvitePayload(professor, subjects, sessions);
  const params = new URLSearchParams();
  params.set('role', 'professor');
  params.set('prof', professor.username);
  params.set('invite', inviteToken);
  return `${publicOrigin}/?${params.toString()}`;
}

export function buildProfessorInvitationMessage(
  professor: Professor,
  inviteUrl: string,
  subjects: Subject[] = []
): string {
  const profSub = subjects.find(
    (s) => s.professorId === professor.docId || s.professorId === professor.username
  );
  const subjectTitle = profSub ? profSub.name : `مقرر ${professor.name}`;
  const profCode = professor.profCode || `PRF-${professor.username.toUpperCase()}`;

  return [
    `تحية طيبة ${professor.name} المحترم،`,
    `تم إعداد حسابكم الأكاديمي في (الجامعة الذكية التفاعلية) مع نظام تسجيل حضور الطلبة بالباركود.`,
    ``,
    `1) رابط الدخول المباشر لبوابة الأستاذ:`,
    `${inviteUrl}`,
    ``,
    `2) بيانات الدخول اليدوي:`,
    `• اسم المستخدم: ${professor.username}`,
    `• كلمة المرور: ${professor.password || '123'}`,
    `• المقرر المسند: ${subjectTitle}`,
    `• رمز باركود الأستاذ الدائم للطلاب: ${profCode}`,
    ``,
    `ملاحظة: يمكنكم أيضاً فتح ملف (بوابة الأستاذ المستقلة .html) المرفق للعمل مباشرة من الهاتف أو الحاسوب بدون الحاجة للاتصال بالخادم.`,
  ].join('\n');
}

export function generateStandaloneProfessorHtmlApp(
  professor: Professor,
  subjects: Subject[] = [],
  sessions: BarcodeSession[] = [],
  students: Student[] = [],
  qrDataUrl?: string
): string {
  const profCode = professor.profCode || `PRF-${professor.username.toUpperCase()}`;
  const profSubjects = subjects.filter(
    (s) => s.professorId === professor.docId || s.professorId === professor.username
  );
  const subjectName = profSubjects[0]?.name || `مقرر ${professor.name}`;
  const profSessions = sessions.filter(
    (s) =>
      s.professorId === professor.docId ||
      s.professorId === professor.username ||
      s.profCode === profCode
  );
  const initialSessionCode =
    profSessions[0]?.sessionCode || `BAR-${Math.floor(100000 + Math.random() * 900000)}`;

  const safeStudentsJson = JSON.stringify(
    students.map((s) => ({
      id: s.id,
      name: s.name,
      department: s.department || 'هندسة تقنيات البرمجيات',
      level: s.level || 'المرحلة الأولى',
    }))
  );

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>بوابة الأستاذ المستقلة — ${professor.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { background: #060c18; color: #f8fafc; min-height: 100vh; padding: 20px; line-height: 1.6; }
    .container { max-width: 1040px; margin: 0 auto; }
    .header { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 20px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
    .badge { color: #38bdf8; font-size: 13px; font-weight: 700; }
    .title { font-size: 22px; font-weight: 900; color: #ffffff; }
    .subtitle { font-size: 13px; color: #94a3b8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 22px; }
    .card h2 { font-size: 17px; font-weight: 800; margin-bottom: 12px; color: #ffffff; }
    .qr-box { background: #ffffff; padding: 16px; border-radius: 16px; width: 200px; height: 200px; margin: 12px auto; display: flex; align-items: center; justify-content: center; }
    .qr-box img { width: 100%; height: 100%; object-fit: contain; }
    .code-display { background: #020617; border: 1px solid #1e293b; padding: 12px; border-radius: 12px; text-align: center; font-family: monospace; font-size: 20px; font-weight: 900; color: #22d3ee; letter-spacing: 1px; margin: 10px 0; }
    .btn { background: #2563eb; color: #ffffff; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.15s; }
    .btn:hover { background: #1d4ed8; }
    .btn-emerald { background: #059669; }
    .btn-emerald:hover { background: #047857; }
    .input { width: 100%; padding: 10px 14px; background: #020617; border: 1px solid #1e293b; border-radius: 12px; color: #ffffff; font-size: 13px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #1e293b; text-align: right; }
    th { background: #020617; color: #94a3b8; }
    .status-present { color: #34d399; font-weight: 700; }
    .status-absent { color: #f87171; font-weight: 700; }
    @media print { .no-print { display: none !important; } body { background: #fff; color: #000; } .card, .header { border: 1px solid #ccc; background: #fff; color: #000; } .title, .card h2 { color: #000; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="badge">الجامعة الذكية التفاعلية · نسخة الأستاذ المستقلة (تعمل بدون إنترنت)</div>
        <div class="title">${professor.name}</div>
        <div class="subtitle">${professor.roleType || 'ملاك دائم'} · ${professor.department || 'هندسة تقنيات البرمجيات'} · المقرر: ${subjectName}</div>
      </div>
      <div class="no-print" style="display:flex; gap:10px;">
        <button class="btn" onclick="window.print()">طباعة بطاقة الباركود والكشف</button>
        <button class="btn btn-emerald" onclick="exportCsv()">تصدير الحضور (CSV/Excel)</button>
      </div>
    </div>

    <div class="grid">
      <div class="card" style="text-align:center;">
        <h2>باركود الأستاذ الدائم لتسجيل الطلاب</h2>
        <p class="subtitle">يعرض هذا الباركود للطلاب على الشاشة أو يطبع لكي يسجلوا حضورهم مباشرة</p>
        <div class="qr-box">
          ${
            qrDataUrl
              ? `<img src="${qrDataUrl}" alt="QR ${profCode}" />`
              : `<div style="color:#0f172a;font-weight:900;font-family:monospace;font-size:18px;">${profCode}</div>`
          }
        </div>
        <div class="code-display" id="profCodeDisplay" dir="ltr">${profCode}</div>
        <div class="subtitle">رمز جلسة المحاضرة النشطة: <strong style="color:#34d399;font-family:monospace;" id="sessionCodeText" dir="ltr">${initialSessionCode}</strong></div>
        <div class="no-print" style="margin-top:12px;">
          <input type="text" id="newLectureInput" class="input" placeholder="عنوان المحاضرة الجديدة..." />
          <button class="btn btn-emerald" style="width:100%;" onclick="generateNewSession()">+ توليد رمز جلسة باركود جديد</button>
        </div>
      </div>

      <div class="card">
        <h2>تسجيل حضور الطلاب الفوري (${subjectName})</h2>
        <p class="subtitle" style="margin-bottom:10px;">يمكنك تحضير الطلاب بالضغط المباشر أو إضافة طالب جديد بالرقم الجامعي</p>
        <div class="no-print" style="display:flex; gap:8px; margin-bottom:12px;">
          <input type="text" id="stuNameInput" class="input" style="margin:0;" placeholder="اسم الطالب أو رقمه الجامعي STU-..." />
          <button class="btn" onclick="addCustomStudent()">+ تسجيل حضور</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>الرقم الجامعي</th>
              <th>اسم الطالب</th>
              <th>الحالة</th>
              <th class="no-print">إجراء</th>
            </tr>
          </thead>
          <tbody id="studentsBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const students = ${safeStudentsJson}.map(s => ({ ...s, status: 'حاضر', time: new Date().toLocaleTimeString('ar-IQ') }));
    function renderTable() {
      const tbody = document.getElementById('studentsBody');
      tbody.innerHTML = students.map((s, idx) => \`
        <tr>
          <td dir="ltr" style="font-family:monospace;color:#38bdf8;">\${s.id}</td>
          <td style="font-weight:700;">\${s.name}</td>
          <td class="\${s.status === 'حاضر' ? 'status-present' : 'status-absent'}">\${s.status} (\${s.time})</td>
          <td class="no-print">
            <button class="btn" style="padding:4px 10px;font-size:11px;background:\${s.status === 'حاضر' ? '#dc2626' : '#059669'};" onclick="toggleStatus(\${idx})">
              \${s.status === 'حاضر' ? 'تحويل لغائب' : 'تسجيل حاضر'}
            </button>
          </td>
        </tr>
      \`).join('');
    }
    function toggleStatus(idx) {
      students[idx].status = students[idx].status === 'حاضر' ? 'غائب' : 'حاضر';
      students[idx].time = new Date().toLocaleTimeString('ar-IQ');
      renderTable();
    }
    function addCustomStudent() {
      const val = document.getElementById('stuNameInput').value.trim();
      if (!val) return;
      students.unshift({
        id: val.startsWith('STU-') ? val.toUpperCase() : 'STU-' + Math.floor(100000 + Math.random() * 900000),
        name: val,
        status: 'حاضر',
        time: new Date().toLocaleTimeString('ar-IQ')
      });
      document.getElementById('stuNameInput').value = '';
      renderTable();
    }
    function generateNewSession() {
      const title = document.getElementById('newLectureInput').value.trim() || 'محاضرة جديدة';
      const newCode = 'BAR-' + Math.floor(100000 + Math.random() * 900000);
      document.getElementById('sessionCodeText').textContent = newCode + ' (' + title + ')';
      document.getElementById('newLectureInput').value = '';
    }
    function exportCsv() {
      const rows = [['الرقم الجامعي', 'اسم الطالب', 'المقرر', 'الحالة', 'الوقت']];
      students.forEach(s => rows.push([s.id, s.name, '${subjectName}', s.status, s.time]));
      const csv = '\\uFEFF' + rows.map(r => r.join(',')).join('\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'كشف-حضور-${professor.username}.csv';
      a.click();
    }
    renderTable();
  </script>
</body>
</html>`;
}

export function buildAllProfessorsTelegramAnnouncement(
  rawOrigin: string,
  professors: Professor[] = [],
  subjects: Subject[] = []
): string {
  const publicOrigin = resolvePublicSharedOrigin(rawOrigin);
  const profLines = professors.map((p, idx) => {
    const profCode = p.profCode || `PRF-${p.username.toUpperCase()}`;
    const sub = subjects.find((s) => s.professorId === p.docId || s.professorId === p.username);
    return `${idx + 1}. ${p.name} (${sub ? sub.name : 'مقرر عام'}) — اسم المستخدم: ${p.username} | كلمة المرور: ${p.password || '123'} | الباركود: ${profCode}`;
  });

  return [
    `تعميم رسمي إلى السادة تدريسيي وأساتذة الكلية المحترمين`,
    `الموضوع / إطلاق منظومة تسجيل حضور الطلبة بالباركود الذكي (PWA + النسخة الرسمية الموحدة)`,
    ``,
    `نضع بين أيديكم المنظومة الرسمية الموحدة لتسجيل حضور الطلبة بالباركود وإصدار محاضر الغياب والسعي المعتمدة:`,
    ``,
    `أولاً: رابط المنظومة السحابية وتثبيت التطبيق على الهاتف والحاسوب (PWA):`,
    `${publicOrigin}/`,
    `(عند فتح الرابط، اضغط على زر "تثبيت التطبيق الرسمي على الجهاز" في أعلى الشاشة ليتم تنزيله كأيقونة مستقلة على هاتفك أو حاسوبك).`,
    ``,
    `ثانياً: النسخة الرسمية الموحدة لجميع الأساتذة (تعمل فوراً بدون إنترنت):`,
    `يمكنكم تحميل ملف (المنظومة-الرسمية-لجميع-الأساتذة-وتسجيل-الطلاب.html) المرفق مع هذا التعميم، وفتحه مباشرة لاختيار اسم التدريسي أو تسجيل أستاذ جديد وتوليد باركود المحاضرة (QR) وتصدير كشف الحضور المصدق (Excel / PDF).`,
    ``,
    `ثالثاً: بيانات الدخول المعتمدة للسادة الأساتذة:`,
    ...profLines,
  ].join('\n');
}

export function generateUnifiedAllProfessorsOfficialHtmlApp(
  professors: Professor[] = [],
  subjects: Subject[] = [],
  sessions: BarcodeSession[] = [],
  students: Student[] = [],
  qrByProfCode: Record<string, string> = {}
): string {
  const safeProfs = JSON.stringify(
    professors.map((p) => {
      const code = p.profCode || `PRF-${p.username.toUpperCase()}`;
      const sub = subjects.find((s) => s.professorId === p.docId || s.professorId === p.username);
      const sess = sessions.find(
        (bs) => bs.professorId === p.docId || bs.professorId === p.username || bs.profCode === code
      );
      return {
        username: p.username,
        password: p.password || '123',
        name: p.name,
        department: p.department || 'هندسة تقنيات البرمجيات',
        roleType: p.roleType || 'ملاك دائم',
        profCode: code,
        subjectName: sub?.name || `مقرر ${p.name}`,
        sessionCode: sess?.sessionCode || `BAR-${Math.floor(100000 + Math.random() * 900000)}`,
        qrUrl: qrByProfCode[code] || p.qrCode || '',
      };
    })
  );

  const safeStudents = JSON.stringify(
    students.map((s) => ({
      id: s.id,
      name: s.name,
      department: s.department || 'هندسة تقنيات البرمجيات',
      level: s.level || 'المرحلة الأولى',
    }))
  );

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>المنظومة الرسمية الموحدة للأساتذة وتسجيل الطلاب بالباركود</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { background: #060c18; color: #f8fafc; min-height: 100vh; padding: 16px; line-height: 1.6; }
    .container { max-width: 1140px; margin: 0 auto; }
    .topbar { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 18px 22px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 18px; }
    .brand { font-size: 20px; font-weight: 900; color: #ffffff; }
    .sub { font-size: 12px; color: #94a3b8; }
    .badge { color: #38bdf8; font-size: 12px; font-weight: 800; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 20px; margin-bottom: 18px; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    h2 { font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 10px; }
    .input, select { width: 100%; padding: 10px 12px; background: #020617; border: 1px solid #1e293b; border-radius: 12px; color: #ffffff; font-size: 13px; margin-bottom: 10px; }
    .btn { background: #2563eb; color: #ffffff; border: none; padding: 10px 16px; border-radius: 12px; font-weight: 700; font-size: 12px; cursor: pointer; }
    .btn:hover { background: #1d4ed8; }
    .btn-emerald { background: #059669; }
    .btn-emerald:hover { background: #047857; }
    .btn-slate { background: #1e293b; color: #e2e8f0; }
    .qr-wrap { background: #ffffff; padding: 14px; border-radius: 16px; width: 190px; height: 190px; margin: 12px auto; display: flex; align-items: center; justify-content: center; }
    .qr-wrap img, .qr-wrap svg { width: 100%; height: 100%; object-fit: contain; }
    .code-box { background: #020617; border: 1px solid #1e293b; padding: 10px; border-radius: 12px; text-align: center; font-family: monospace; font-size: 19px; font-weight: 900; color: #22d3ee; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { padding: 10px; border-bottom: 1px solid #1e293b; text-align: right; }
    th { background: #020617; color: #94a3b8; }
    .present { color: #34d399; font-weight: 800; }
    .absent { color: #f87171; font-weight: 800; }
    .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; margin-top: 24px; }
      body { background: #ffffff; color: #000000; }
      .card, .topbar { background: #ffffff; border: 1px solid #cbd5e1; color: #000000; }
      .brand, h2 { color: #000000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="topbar">
      <div>
        <div class="badge">الجامعة الذكية التفاعلية · المنظومة الرسمية الموحدة لجميع الأساتذة (تعمل على الهاتف والحاسوب بدون إنترنت)</div>
        <div class="brand" id="headerProfName">بوابة الأساتذة الرسمية لتسجيل الطلبة بالباركود</div>
        <div class="sub" id="headerProfMeta">اختر اسم الأستاذ أو أضف اسمك ومادتك الدراسية لبدء تسجيل حضور الطلبة رسمياً</div>
      </div>
      <div class="no-print" style="display:flex; flex-wrap:wrap; gap:8px;">
        <button class="btn" onclick="window.print()">طباعة محضر الحضور الرسمي (PDF)</button>
        <button class="btn btn-emerald" onclick="exportOfficialCsv()">تصدير الكشف الرسمي (Excel / CSV)</button>
      </div>
    </div>

    <!-- Professor Switcher & New Professor Registration -->
    <div class="card no-print">
      <div class="grid-2">
        <div>
          <h2>1. اختيار الأستاذ الحالي من الملاك أو الأساتذة الضيوف</h2>
          <select id="profSelect" onchange="switchProfessor(this.value)"></select>
          <p class="sub">يتم حفظ سجل حضور كل أستاذ ومادته تلقائياً في ذاكرة الجهاز</p>
        </div>
        <div>
          <h2>2. أو تسجيل أستاذ جديد / أستاذ ضيف فوراً</h2>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <input type="text" id="newProfName" class="input" style="flex:1; min-width:140px; margin:0;" placeholder="الاسم واللقب (مثال: د. أحمد الربيعي)" />
            <input type="text" id="newProfSubject" class="input" style="flex:1; min-width:140px; margin:0;" placeholder="اسم المادة أو المحاضرة..." />
            <button class="btn btn-emerald" onclick="registerNewProfessor()">+ تفعيل باركود الأستاذ</button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Professor QR & Session Barcode Generator -->
      <div class="card" style="text-align:center;">
        <h2>الباركود الرسمي للأستاذ وجلسة المحاضرة</h2>
        <p class="sub">اعرض هذا الباركود للطلاب على الشاشة أو الهاتف لتسجيل حضورهم</p>
        <div class="qr-wrap" id="qrContainer"></div>
        <div class="code-box" id="profCodeBox" dir="ltr">PRF-101842</div>
        <div class="sub" style="margin-bottom:10px;">
          رمز جلسة المحاضرة الفعالة:
          <strong style="color:#34d399;font-family:monospace;font-size:14px;" id="sessionCodeBox" dir="ltr">BAR-100200</strong>
        </div>
        <div class="no-print" style="display:flex; gap:8px;">
          <input type="text" id="lectureTitleInput" class="input" style="margin:0; flex:1;" placeholder="عنوان المحاضرة أو القاعة..." />
          <button class="btn btn-emerald" onclick="createNewSession()">توليد باركود محاضرة جديد</button>
        </div>
      </div>

      <!-- Student Barcode Check-In & Official Roster -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h2 style="margin:0;" id="rosterTitle">سجل حضور الطلاب الرسمي</h2>
          <span class="badge" id="statsBadge">الحضور: 0 / 0</span>
        </div>
        <div class="no-print" style="display:flex; gap:8px; margin-bottom:12px;">
          <input type="text" id="scanStudentInput" class="input" style="margin:0; flex:1;" placeholder="امسح باركود الطالب أو أدخل رقمه الجامعي STU-... أو اسمه" onkeydown="if(event.key==='Enter') checkInStudent()" />
          <button class="btn" onclick="checkInStudent()">+ تسجيل حضور بالباركود</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>الرقم الجامعي</th>
              <th>اسم الطالب</th>
              <th>الحالة ووقت التسجيل</th>
              <th class="no-print">إجراء</th>
            </tr>
          </thead>
          <tbody id="rosterBody"></tbody>
        </table>

        <div class="print-only">
          <p><strong>توقيع أستاذ المادة المعتمد:</strong> ___________________________</p>
          <p style="margin-top:6px;"><strong>التاريخ والوقت:</strong> <span id="printDate"></span></p>
        </div>
      </div>
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'official_all_professors_portal_v1';
    const initialProfs = ${safeProfs};
    const defaultStudents = ${safeStudents};

    let state = {
      professors: initialProfs,
      activeUsername: initialProfs[0] ? initialProfs[0].username : 'ali',
      attendanceByProf: {}
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.professors && saved.professors.length > 0) {
        state = saved;
      }
    } catch (e) {}

    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function getActiveProf() {
      return state.professors.find(p => p.username === state.activeUsername) || state.professors[0];
    }

    function getProfRoster(username) {
      if (!state.attendanceByProf[username]) {
        state.attendanceByProf[username] = defaultStudents.map(s => ({
          id: s.id,
          name: s.name,
          status: 'حاضر',
          time: new Date().toLocaleTimeString('ar-IQ')
        }));
      }
      return state.attendanceByProf[username];
    }

    function buildDeterministicQrSvg(code) {
      const size = 21;
      const cells = [];
      let hash = 2166136261;
      for (let i = 0; i < code.length; i++) {
        hash ^= code.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      function isFinder(r, c) {
        const inTL = r < 7 && c < 7;
        const inTR = r < 7 && c >= size - 7;
        const inBL = r >= size - 7 && c < 7;
        return inTL || inTR || inBL;
      }
      function finderBit(r, c) {
        const lr = r >= size - 7 ? r - (size - 7) : r;
        const lc = c >= size - 7 ? c - (size - 7) : c;
        if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
        if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
        return false;
      }
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          let filled = false;
          if (isFinder(r, c)) {
            filled = finderBit(r, c);
          } else {
            const bit = ((hash >>> ((r * size + c) % 24)) ^ (r * 31 + c * 17)) & 1;
            filled = bit === 1;
          }
          if (filled) {
            cells.push(\`<rect x="\${c}" y="\${r}" width="1" height="1" fill="#0f172a" />\`);
          }
        }
      }
      return \`<svg viewBox="0 0 \${size} \${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">\${cells.join('')}</svg>\`;
    }

    function renderAll() {
      const select = document.getElementById('profSelect');
      select.innerHTML = state.professors.map(p =>
        \`<option value="\${p.username}" \${p.username === state.activeUsername ? 'selected' : ''}>\${p.name} — \${p.subjectName} (\${p.profCode})</option>\`
      ).join('');

      const prof = getActiveProf();
      if (!prof) return;

      document.getElementById('headerProfName').textContent = prof.name + ' — ' + prof.subjectName;
      document.getElementById('headerProfMeta').textContent = prof.roleType + ' · ' + prof.department + ' · الباركود الدائم: ' + prof.profCode;
      document.getElementById('profCodeBox').textContent = prof.profCode;
      document.getElementById('sessionCodeBox').textContent = prof.sessionCode;
      document.getElementById('rosterTitle').textContent = 'سجل حضور الطلاب الرسمي (' + prof.subjectName + ')';
      document.getElementById('printDate').textContent = new Date().toLocaleString('ar-IQ');

      const qrBox = document.getElementById('qrContainer');
      if (prof.qrUrl) {
        qrBox.innerHTML = \`<img src="\${prof.qrUrl}" alt="QR \${prof.profCode}" />\`;
      } else {
        qrBox.innerHTML = buildDeterministicQrSvg(prof.profCode + '-' + prof.sessionCode);
      }

      const roster = getProfRoster(prof.username);
      const presentCount = roster.filter(s => s.status === 'حاضر').length;
      document.getElementById('statsBadge').textContent = \`الحاضرون: \${presentCount} من \${roster.length}\`;

      const tbody = document.getElementById('rosterBody');
      tbody.innerHTML = roster.map((s, idx) => \`
        <tr>
          <td dir="ltr" style="font-family:monospace;color:#38bdf8;">\${s.id}</td>
          <td style="font-weight:700;">\${s.name}</td>
          <td class="\${s.status === 'حاضر' ? 'present' : 'absent'}">\${s.status} (\${s.time})</td>
          <td class="no-print">
            <button class="btn" style="padding:4px 10px;font-size:11px;background:\${s.status === 'حاضر' ? '#dc2626' : '#059669'};" onclick="toggleStudent(\${idx})">
              \${s.status === 'حاضر' ? 'تحويل لغائب' : 'تسجيل حاضر'}
            </button>
          </td>
        </tr>
      \`).join('');
      saveState();
    }

    function switchProfessor(username) {
      state.activeUsername = username;
      renderAll();
    }

    function registerNewProfessor() {
      const nameVal = document.getElementById('newProfName').value.trim();
      const subVal = document.getElementById('newProfSubject').value.trim();
      if (!nameVal) return;
      const username = 'prof_' + Math.floor(1000 + Math.random() * 9000);
      const profCode = 'PRF-' + Math.floor(100000 + Math.random() * 900000);
      const sessionCode = 'BAR-' + Math.floor(100000 + Math.random() * 900000);
      state.professors.unshift({
        username,
        password: '123',
        name: nameVal,
        department: 'هندسة تقنيات البرمجيات',
        roleType: 'أستاذ ضيف / ملاك',
        profCode,
        subjectName: subVal || ('مقرر ' + nameVal),
        sessionCode,
        qrUrl: ''
      });
      state.activeUsername = username;
      document.getElementById('newProfName').value = '';
      document.getElementById('newProfSubject').value = '';
      renderAll();
    }

    function createNewSession() {
      const prof = getActiveProf();
      if (!prof) return;
      const title = document.getElementById('lectureTitleInput').value.trim();
      const code = 'BAR-' + Math.floor(100000 + Math.random() * 900000);
      prof.sessionCode = title ? (code + ' · ' + title) : code;
      prof.qrUrl = '';
      document.getElementById('lectureTitleInput').value = '';
      renderAll();
    }

    function toggleStudent(idx) {
      const prof = getActiveProf();
      const roster = getProfRoster(prof.username);
      roster[idx].status = roster[idx].status === 'حاضر' ? 'غائب' : 'حاضر';
      roster[idx].time = new Date().toLocaleTimeString('ar-IQ');
      renderAll();
    }

    function checkInStudent() {
      const input = document.getElementById('scanStudentInput');
      const val = input.value.trim();
      if (!val) return;
      const prof = getActiveProf();
      const roster = getProfRoster(prof.username);
      const existing = roster.find(
        s => s.id.toLowerCase() === val.toLowerCase() || s.name.toLowerCase().includes(val.toLowerCase())
      );
      if (existing) {
        existing.status = 'حاضر';
        existing.time = new Date().toLocaleTimeString('ar-IQ') + ' (باركود)';
      } else {
        roster.unshift({
          id: val.toUpperCase().startsWith('STU-') ? val.toUpperCase() : 'STU-' + Math.floor(100000 + Math.random() * 900000),
          name: val,
          status: 'حاضر',
          time: new Date().toLocaleTimeString('ar-IQ') + ' (باركود)'
        });
      }
      input.value = '';
      renderAll();
    }

    function exportOfficialCsv() {
      const prof = getActiveProf();
      const roster = getProfRoster(prof.username);
      const rows = [['الرقم الجامعي', 'اسم الطالب', 'الأستاذ', 'المقرر الدراسي', 'باركود الأستاذ', 'الحالة', 'وقت التسجيل']];
      roster.forEach(s => rows.push([s.id, s.name, prof.name, prof.subjectName, prof.profCode, s.status, s.time]));
      const csv = '\\uFEFF' + rows.map(r => r.join(',')).join('\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = \`كشف-حضور-رسمي-\${prof.username}.csv\`;
      a.click();
    }

    renderAll();
  </script>
</body>
</html>`;
}

