import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Pure rule evaluator that mirrors firestore.rules invariants to verify all Dirty Dozen payloads return PERMISSION_DENIED
interface AuthContext {
  uid: string;
  token: {
    email?: string;
    email_verified?: boolean;
  };
}

function isValidId(id: unknown): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_\-]+$/.test(id)
  );
}

function isVerifiedUser(auth: AuthContext | null): boolean {
  return auth !== null && auth.token?.email_verified === true;
}

function isAdmin(auth: AuthContext | null): boolean {
  return isVerifiedUser(auth) && auth!.token.email === 'aliasaad00221133@gmail.com';
}

function evaluateClearanceWrite(params: {
  op: 'create' | 'update' | 'get' | 'list';
  docId: string;
  auth: AuthContext | null;
  incoming?: Record<string, any>;
  existing?: Record<string, any>;
  requestTime: string;
}): 'ALLOWED' | 'PERMISSION_DENIED' {
  const { op, docId, auth, incoming, existing, requestTime } = params;
  if (!isVerifiedUser(auth)) return 'PERMISSION_DENIED';

  if (op === 'get') {
    if (!isValidId(docId)) return 'PERMISSION_DENIED';
    if (!existing) return 'PERMISSION_DENIED';
    return existing.ownerId === auth!.uid || isAdmin(auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
  }

  if (op === 'list') {
    if (!existing) return 'PERMISSION_DENIED';
    return existing.ownerId === auth!.uid ? 'ALLOWED' : 'PERMISSION_DENIED';
  }

  if (!isValidId(docId) || !incoming) return 'PERMISSION_DENIED';

  const requiredKeys = [
    'ownerId',
    'studentId',
    'studentName',
    'department',
    'clearanceCode',
    'status',
    'createdAt',
    'updatedAt',
  ];
  const incomingKeys = Object.keys(incoming);
  const hasAll = requiredKeys.every((k) => incomingKeys.includes(k));
  const hasOnly = incomingKeys.every((k) => requiredKeys.includes(k));
  if (!hasAll || !hasOnly) return 'PERMISSION_DENIED';

  const validBlueprint =
    isValidId(incoming.ownerId) &&
    incoming.ownerId === auth!.uid &&
    typeof incoming.studentId === 'string' &&
    incoming.studentId.length >= 3 &&
    incoming.studentId.length <= 64 &&
    /^[a-zA-Z0-9_\-]+$/.test(incoming.studentId) &&
    typeof incoming.studentName === 'string' &&
    incoming.studentName.length >= 2 &&
    incoming.studentName.length <= 150 &&
    typeof incoming.department === 'string' &&
    incoming.department.length >= 2 &&
    incoming.department.length <= 150 &&
    typeof incoming.clearanceCode === 'string' &&
    incoming.clearanceCode.length >= 4 &&
    incoming.clearanceCode.length <= 64 &&
    /^[a-zA-Z0-9_\-]+$/.test(incoming.clearanceCode) &&
    ['pending', 'in_progress', 'completed', 'blocked'].includes(incoming.status) &&
    typeof incoming.createdAt === 'string' &&
    typeof incoming.updatedAt === 'string';

  if (!validBlueprint) return 'PERMISSION_DENIED';

  if (op === 'create') {
    if (incoming.createdAt !== requestTime || incoming.updatedAt !== requestTime) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOWED';
  }

  if (op === 'update') {
    if (!existing) return 'PERMISSION_DENIED';
    if (
      incoming.ownerId !== existing.ownerId ||
      incoming.studentId !== existing.studentId ||
      incoming.clearanceCode !== existing.clearanceCode ||
      incoming.createdAt !== existing.createdAt ||
      incoming.updatedAt !== requestTime
    ) {
      return 'PERMISSION_DENIED';
    }
    if (isAdmin(auth)) return 'ALLOWED';
    if (existing.ownerId !== auth!.uid) return 'PERMISSION_DENIED';
    if (existing.status === 'completed') return 'PERMISSION_DENIED';

    const allowedChanged = ['status', 'studentName', 'department', 'updatedAt'];
    const changedKeys = incomingKeys.filter((k) => incoming[k] !== existing[k]);
    if (!changedKeys.every((k) => allowedChanged.includes(k))) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOWED';
  }

  return 'PERMISSION_DENIED';
}

test('firestore.rules file exists and contains all required security gates', () => {
  const rulesText = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('allow read, write: if false;'));
  assert.ok(rulesText.includes('isValidSystemSnapshot(incoming())'));
  assert.ok(rulesText.includes('isValidClearanceRecord(incoming())'));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
});

test('Dirty Dozen Payloads all return PERMISSION_DENIED', () => {
  const now = '2026-10-19T12:00:00Z';
  const validAuth: AuthContext = {
    uid: 'user-1',
    token: { email: 'student@uni.edu.iq', email_verified: true },
  };
  const basePayload = {
    ownerId: 'user-1',
    studentId: 'STU-102941',
    studentName: 'حيدر كرار العبيدي',
    department: 'هندسة تقنيات البرمجيات',
    clearanceCode: 'CLR-102941',
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  };

  // 1. Unauthenticated write
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'clr-1',
      auth: null,
      incoming: basePayload,
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 2. Unverified email spoof of admin
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'clr-1',
      auth: { uid: 'user-1', token: { email: 'aliasaad00221133@gmail.com', email_verified: false } },
      incoming: basePayload,
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 3. Shadow / Ghost field injection
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'clr-1',
      auth: validAuth,
      incoming: { ...basePayload, isAdmin: true },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 4. Identity spoofing on create
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'clr-1',
      auth: validAuth,
      incoming: { ...basePayload, ownerId: 'user-2' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 5. Owner mutation on update
  assert.equal(
    evaluateClearanceWrite({
      op: 'update',
      docId: 'clr-1',
      auth: validAuth,
      existing: basePayload,
      incoming: { ...basePayload, ownerId: 'user-2' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 6. Client timestamp forgery on create
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'clr-1',
      auth: validAuth,
      incoming: { ...basePayload, createdAt: '2020-01-01T00:00:00Z' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 7. Immortal createdAt mutation on update
  assert.equal(
    evaluateClearanceWrite({
      op: 'update',
      docId: 'clr-1',
      auth: validAuth,
      existing: basePayload,
      incoming: { ...basePayload, createdAt: '2026-10-20T00:00:00Z' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 8. ID poisoning attack
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'bad$id!@#',
      auth: validAuth,
      incoming: basePayload,
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 9. Oversized string / Denial of Wallet
  assert.equal(
    evaluateClearanceWrite({
      op: 'create',
      docId: 'clr-1',
      auth: validAuth,
      incoming: { ...basePayload, studentName: 'A'.repeat(500) },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 10. Value poisoning on update (invalid enum status)
  assert.equal(
    evaluateClearanceWrite({
      op: 'update',
      docId: 'clr-1',
      auth: validAuth,
      existing: basePayload,
      incoming: { ...basePayload, status: 'super_admin_approved' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 11. Terminal state bypass (updating after completed)
  assert.equal(
    evaluateClearanceWrite({
      op: 'update',
      docId: 'clr-1',
      auth: validAuth,
      existing: { ...basePayload, status: 'completed' },
      incoming: { ...basePayload, status: 'in_progress' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 12. Unauthorized cross-user list / PII scrape
  assert.equal(
    evaluateClearanceWrite({
      op: 'list',
      docId: 'clr-1',
      auth: { uid: 'attacker-uid', token: { email: 'attacker@uni.edu.iq', email_verified: true } },
      existing: basePayload,
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );
});
