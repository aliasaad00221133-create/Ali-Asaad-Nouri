# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Authentication & Email Verification**: All standard reads and writes require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`), or a verified bootstrapped administrator (`aliasaad00221133@gmail.com`).
3. **Path Variable Hardening (`isValidId`)**: Document IDs (`{snapshotId}`, `{clearanceId}`) on single-document operations (`get`, `create`, `update`, `delete`) must be strings of length `1..128` matching `^[a-zA-Z0-9_\-]+$`.
4. **Strict Key & Schema Validation (`isValidSystemSnapshot`, `isValidClearanceRecord`)**:
   - Every write (`create` and `update`) is gated by the entity validation helper first.
   - `hasAll` and `hasOnly` enforce exact required and allowed keys so shadow/ghost fields are impossible.
   - Every string field enforces both `is string` and explicit `.size()` bounds.
5. **Identity Integrity & Immutability**:
   - `ownerId` must equal `request.auth.uid` on creation and remain immutable (`incoming().ownerId == existing().ownerId`) on update.
   - `createdAt` must equal `request.time` on creation and remain immutable (`incoming().createdAt == existing().createdAt`) on update.
   - `updatedAt` must equal `request.time` on both creation and update.
6. **Terminal State Locking**:
   - Once a `ClearanceRecord` reaches `status == 'completed'`, non-admin users cannot mutate it further.
7. **PII & Query Isolation**:
   - `system_snapshots` contains `ownerEmail` and is strictly isolated to `resource.data.ownerId == request.auth.uid || isAdmin()`.
   - `allow list` rules explicitly enforce `resource.data.ownerId == request.auth.uid` without `get()`/`exists()` calls inside list rules.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/system_snapshots/snap-1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'aliasaad00221133@gmail.com', email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Shadow / Ghost Field Injection**: Adding `isAdmin: true` to `/clearance_records/clr-1` -> Rejected by `hasOnly()`.
4. **Identity Spoofing on Create**: Authenticated as `uid: 'u1'`, setting `ownerId: 'u2'` -> Rejected by `data.ownerId == request.auth.uid`.
5. **Owner Mutation on Update**: Changing `ownerId` from `'u1'` to `'u2'` on update -> Rejected by `incoming().ownerId == existing().ownerId`.
6. **Client Timestamp Forgery on Create**: Setting `createdAt` to a past timestamp instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
7. **Immortal `createdAt` Mutation on Update**: Modifying `createdAt` during an update -> Rejected by `incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)`.
8. **ID Poisoning Attack**: Creating a document with a 300-character or special-character ID `snap$invalid!` -> Rejected by `isValidId()`.
9. **Oversized String / Denial of Wallet**: Sending a 1,000,000-character `studentName` -> Rejected by `data.studentName.size() <= 150`.
10. **Value Poisoning on Update**: Updating `status` in `clearance_records` to `'hacked_status'` -> Rejected by enum check inside `isValidClearanceRecord(incoming())`.
11. **Terminal State Bypass**: Non-admin attempting to update a `clearance_records` document where `existing().status == 'completed'` -> Rejected by terminal state lock `existing().status != 'completed'`.
12. **Unauthorized Cross-User List / PII Scrape**: User `u2` attempting `get` or `list` on `u1`'s `/system_snapshots` -> Rejected by `resource.data.ownerId == request.auth.uid`.
