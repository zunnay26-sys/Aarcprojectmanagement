# AARC Project Management — Source Review and V2 Changes

**Source reviewed:** `https://aarc-project-management-rpitlt.v2.appdeploy.ai/` using the AppDeploy stored source and deployment status. The pre-existing app was built with React/Vite, an AppDeploy-specific backend, per-account storage, and browser OCR. It was deployed successfully, but the source app's backend data is not included in its source snapshot.

## Main findings

1. **Data portability:** Existing income, expenses and slip files reside outside the frontend code. Cloning a dashboard cannot clone these records. Manual export and receipt transfer are required.
2. **Account model:** Original AppDeploy records were associated with the signed-in account, not a club-wide permission model. Shared treasurer/committee roles require explicit implementation. V2 currently supports an initial administrator only.
3. **Slip reader:** OCR can return uncertain or missing values, especially where BML receipts separate label and value into different columns. V2 keeps all suggestions editable, validates mandatory inputs, and blocks saves until manual verification is checked.
4. **Expense classification:** Classifications must use existing categories. V2 provides local keyword categorization and an optional cloud-AI text analysis path. AI is never a proof of payment or a substitute for authorized approval.
5. **Financial controls:** V2 separately tracks Pending vs Confirmed and includes a duplicate reference+date+amount guard. Only Confirmed entries count in financial totals. These are conveniences, not formal double-entry bookkeeping.
6. **Receipt removal:** Removing a receipt must not remove or modify a transaction. V2 gives explicit confirmation for receipt-only removal and records the action in an audit log.
7. **Hosting:** AppDeploy-specific SDK services do not transfer automatically to GitHub Pages. V2 uses built-in Node.js SQLite and a persistent receipt directory; deploy on a host with persistent storage and HTTPS.

## New application scope

- Responsive dashboard with sidebar, finance metrics, monthly chart, budget usage, recent activity.
- Main project/child project structure with six Crab Beach subprojects.
- Income and expense CRUD with account fields and receipt attachments.
- Category management, CSV/PDF print, JSON import/export, audit.
- Browser OCR and optional cloud AI interpretation with manual review.
- Setup-token-protected initial administrator; authenticated session cookies; no open registration after setup.

## Validation completed

- `npm run check` (Node syntax checks) — passed.
- `npm test` (8 backend/parser tests) — passed.
- Production test for missing `SETUP_SECRET` — required by server when initially binding to a public interface.
- Browser navigation QA — **not completed**, because the automated browser environment blocked localhost navigation. Real-device acceptance testing still required.

## Not yet implemented

- Direct copy of AppDeploy or Hercules database/slip binary files.
- Multiuser access levels, fine-grained permissions, MFA, approval chains.
- Automatic backups, notifications, background OCR, scheduled automation.
- A public live V2 URL or GitHub repository publication (no connected GitHub repository was available and AppDeploy was at its daily new-deployment limit on 27 October 2026).
