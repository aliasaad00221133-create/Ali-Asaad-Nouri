import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SystemData, StudentClearance } from '../types.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Permission denied on /test/connection still proves online connectivity to Firestore server
    return true;
  }
}

testFirestoreConnection();

export async function signInWithGoogleCloud(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutFromGoogleCloud(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sanitizes and truncates outgoing payload to strictly match firebase-blueprint.json constraints
 */
function sanitizeSnapshotId(uid: string): string {
  return uid.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128) || 'default_user';
}

export async function saveSystemSnapshotToCloud(
  data: SystemData,
  version: number = 1
): Promise<{ syncedAt: string; docId: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('يتطلب الحفظ السحابي المباشر تسجيل الدخول بحساب Google مُفعّل');
  }

  const snapshotId = sanitizeSnapshotId(currentUser.uid);
  const path = `system_snapshots/${snapshotId}`;
  const docRef = doc(db, 'system_snapshots', snapshotId);

  // Strip heavy base64 QR data URLs if needed to keep payload well below 900,000 chars
  const compactData: SystemData = {
    ...data,
    students: (data.students || []).map((s) => ({ ...s, qrCode: undefined })),
    professors: (data.professors || []).map((p) => ({ ...p, qrCode: undefined })),
    barcodeSessions: (data.barcodeSessions || []).map((bs) => ({ ...bs, qrDataUrl: undefined })),
    clearances: (data.clearances || []).map((c) => ({ ...c, qrDataUrl: undefined })),
  };

  const payloadJson = JSON.stringify(compactData).slice(0, 890000);
  const ownerEmail = (currentUser.email || 'user@uni.edu.iq').slice(0, 254);

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ownerId: currentUser.uid.slice(0, 128),
        ownerEmail,
        payloadJson,
        version: Math.max(1, version),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prevVersion = Number(existingSnap.data()?.version || 1);
      await updateDoc(docRef, {
        payloadJson,
        version: prevVersion + 1,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      syncedAt: new Date().toLocaleTimeString('ar-IQ'),
      docId: snapshotId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadSystemSnapshotFromCloud(): Promise<{
  data: SystemData | null;
  version: number;
} | null> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return null;
  }

  const snapshotId = sanitizeSnapshotId(currentUser.uid);
  const path = `system_snapshots/${snapshotId}`;
  const docRef = doc(db, 'system_snapshots', snapshotId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const raw = snap.data();
    if (!raw?.payloadJson) return null;
    const parsed = JSON.parse(raw.payloadJson) as SystemData;
    return {
      data: parsed,
      version: Number(raw.version || 1),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToCloudSnapshot(
  onUpdate: (data: SystemData, version: number) => void
): Unsubscribe | null {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return null;
  }

  const snapshotId = sanitizeSnapshotId(currentUser.uid);
  const path = `system_snapshots/${snapshotId}`;
  const docRef = doc(db, 'system_snapshots', snapshotId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        if (raw?.payloadJson) {
          try {
            const parsed = JSON.parse(raw.payloadJson) as SystemData;
            onUpdate(parsed, Number(raw.version || 1));
          } catch (e) {
            console.error('Failed to parse cloud snapshot JSON:', e);
          }
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncClearanceRecordToCloud(record: StudentClearance): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const cleanStuId = record.studentId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 60);
  const cleanUid = currentUser.uid.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 60);
  const clearanceId = `${cleanUid}_${cleanStuId}`.slice(0, 128);
  const path = `clearance_records/${clearanceId}`;
  const docRef = doc(db, 'clearance_records', clearanceId);

  const statusEnum: 'pending' | 'in_progress' | 'completed' | 'blocked' =
    record.overallStatus === 'مكتملة'
      ? 'completed'
      : record.overallStatus === 'معلقة لوجود ذمة'
      ? 'blocked'
      : 'in_progress';

  try {
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        ownerId: currentUser.uid.slice(0, 128),
        studentId: cleanStuId,
        studentName: record.studentName.slice(0, 150),
        department: (record.department || 'هندسة تقنيات البرمجيات').slice(0, 150),
        clearanceCode: record.clearanceCode.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64),
        status: statusEnum,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (existing.data()?.status !== 'completed') {
      await updateDoc(docRef, {
        status: statusEnum,
        studentName: record.studentName.slice(0, 150),
        department: (record.department || 'هندسة تقنيات البرمجيات').slice(0, 150),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
