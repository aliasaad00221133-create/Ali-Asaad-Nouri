import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePublicSharedOrigin,
  encodeProfessorInvitePayload,
  decodeProfessorInvitePayload,
  buildProfessorInviteLink,
  buildProfessorInvitationMessage,
  generateStandaloneProfessorHtmlApp,
  buildAllProfessorsTelegramAnnouncement,
  generateUnifiedAllProfessorsOfficialHtmlApp,
} from './professorShare.ts';
import type { Professor, Subject } from '../types.ts';

const sampleProfessor: Professor = {
  docId: 'prof-test',
  profCode: 'PRF-998877',
  name: 'أ.د. وسام الكيلاني',
  username: 'wissam',
  password: '456',
  department: 'هندسة تقنيات البرمجيات',
  roleType: 'أستاذ ضيف',
};

const sampleSubjects: Subject[] = [
  {
    docId: 'sub-test',
    name: 'الأمن السيبراني المتقدم',
    professorId: 'prof-test',
  },
];

test('resolvePublicSharedOrigin converts ais-dev URLs to ais-pre public URLs', () => {
  const devOrigin = 'https://ais-dev-x7jpvcrjffukwjtdhpz5yr-33194573907.europe-west2.run.app';
  const resolved = resolvePublicSharedOrigin(devOrigin);
  assert.equal(
    resolved,
    'https://ais-pre-x7jpvcrjffukwjtdhpz5yr-33194573907.europe-west2.run.app'
  );
});

test('encodeProfessorInvitePayload and decodeProfessorInvitePayload round-trip Arabic professor data', () => {
  const token = encodeProfessorInvitePayload(sampleProfessor, sampleSubjects, []);
  const decoded = decodeProfessorInvitePayload(token);
  assert.ok(decoded);
  assert.equal(decoded.name, 'أ.د. وسام الكيلاني');
  assert.equal(decoded.username, 'wissam');
  assert.equal(decoded.profCode, 'PRF-998877');
  assert.equal(decoded.subjectName, 'الأمن السيبراني المتقدم');
  assert.equal(decoded.roleType, 'أستاذ ضيف');
});

test('buildProfessorInviteLink uses public shared origin and includes role, prof, and invite params', () => {
  const link = buildProfessorInviteLink(
    'https://ais-dev-x7jpvcrjffukwjtdhpz5yr-33194573907.europe-west2.run.app',
    sampleProfessor,
    sampleSubjects,
    []
  );
  assert.ok(link.startsWith('https://ais-pre-'));
  assert.ok(link.includes('role=professor'));
  assert.ok(link.includes('prof=wissam'));
  assert.ok(link.includes('invite='));
});

test('buildProfessorInvitationMessage includes link, credentials, and barcode', () => {
  const link = 'https://ais-pre-example.run.app/?role=professor&prof=wissam';
  const msg = buildProfessorInvitationMessage(sampleProfessor, link, sampleSubjects);
  assert.ok(msg.includes('أ.د. وسام الكيلاني'));
  assert.ok(msg.includes('wissam'));
  assert.ok(msg.includes('456'));
  assert.ok(msg.includes('PRF-998877'));
  assert.ok(msg.includes(link));
});

test('generateStandaloneProfessorHtmlApp generates valid self-contained RTL HTML', () => {
  const html = generateStandaloneProfessorHtmlApp(sampleProfessor, sampleSubjects, [], []);
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('أ.د. وسام الكيلاني'));
  assert.ok(html.includes('PRF-998877'));
  assert.ok(html.includes('الأمن السيبراني المتقدم'));
});

test('buildAllProfessorsTelegramAnnouncement lists all professors and public URL', () => {
  const announcement = buildAllProfessorsTelegramAnnouncement(
    'https://ais-dev-x7jpvcrjffukwjtdhpz5yr-33194573907.europe-west2.run.app',
    [sampleProfessor],
    sampleSubjects
  );
  assert.ok(announcement.includes('https://ais-pre-'));
  assert.ok(announcement.includes('أ.د. وسام الكيلاني'));
  assert.ok(announcement.includes('PRF-998877'));
});

test('generateUnifiedAllProfessorsOfficialHtmlApp creates multi-professor official HTML portal', () => {
  const html = generateUnifiedAllProfessorsOfficialHtmlApp([sampleProfessor], sampleSubjects, [], []);
  assert.ok(html.includes('المنظومة الرسمية الموحدة للأساتذة'));
  assert.ok(html.includes('أ.د. وسام الكيلاني'));
  assert.ok(html.includes('registerNewProfessor'));
});
