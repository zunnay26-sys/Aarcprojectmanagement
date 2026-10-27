# AARC Project Management Pro — GitHub-ready V2

A new self-hosted Aaru Avatu Recreation Club project-management application inspired by the existing AARC dashboard. **It is a separate application**, not an in-place update of the existing AppDeploy deployment or its database.

## What it includes

- Modern, responsive dark-green sidebar dashboard with revenue, expense, balance, active-project cards, annual chart and activity timeline.
- **Crab Beach** main project with six counted subprojects: Eid Malhi 2025; Eid Malhi 2026; Hut Project 2026; Initial Beach Development; Maintenance Project; Other Beach Activities.
- AARC General and AARC Annual Trip 2027 root projects.
- Income/expense editing, editable categories, receipts (PDF/JPG/PNG/WEBP), and receipt-only removal independent of financial-entry removal.
- Income and expense status (`Pending` / `Confirmed`); only confirmed entries affect financial KPIs.
- JSON export, non-destructive JSON import, financial CSV exports, PDF/print view, and action audit log.
- OCR reader for transfer slips, bills and invoices: detects transaction date, amount, account numbers/names, invoice number, reference, description and recommends one of the configured expense categories. **Manual verification is required before saving.**
- Optional cloud AI interpretation of extracted OCR *text only* if an administrator supplies `OPENAI_API_KEY` on the server. Cloud AI is invoked only via the **Improve with AI** button, not automatically for every scan.
- SQLite storage, session-cookie sign-in, administrator initialization, size-limited and magic-byte-validated receipt uploads.

## Run locally

1. Install **Node.js 22.13 or later** (the app uses Node's built-in `node:sqlite` module).
2. Download or clone the repository, then open the project folder in Terminal.
3. Run `npm start`, then open `http://127.0.0.1:3000`.
4. Create an administrator email and a password of at least 12 characters. Then sign in.
5. Run `npm test` to execute the bundled backend / OCR checks.

**No `npm install` is required** for the server. The OCR reader loads PDF.js and Tesseract.js in the user's browser from public CDNs on demand. To use OCR, the phone/browser must be online and able to access those libraries; manual entry works without OCR.

## Production deployment

This is a **persistent Node.js server**, not a static website. Select a VPS, Docker host, or other Node host with a persistent data disk. **Do not use an ephemeral filesystem for SQLite or receipts.** A purely static GitHub Pages site is not supported. Traditional stateless serverless hosts without a persistent database/disk are not suitable without changing the storage backend.

Set environment variables in your hosting service:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATA_DIR=/data/aarc
SETUP_SECRET=YOUR_LONG_RANDOM_SETUP_CODE
# Optional, adds API charges according to your provider usage:
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4.1-mini
```

Put the service behind HTTPS reverse proxy, configure secure access, and use **persistent backups** of the full `DATA_DIR` (`aarc.sqlite`, its WAL files when present, and the `receipts/` folder). The administrator setup code is required in production, so an unauthenticated visitor cannot claim a freshly deployed installation without knowing it. After initial setup, credentials are checked server-side and the administrator signup route is permanently closed for that database.

**Privacy:** Receipt images/PDF files are stored privately on your server's disk. The optional AI feature sends the **extracted document text** to an external cloud AI service when the user clicks **Improve with AI**. Browser OCR itself may fetch language models and scripts from CDNs. Never upload sensitive bank data to a service without permission and a suitable data handling arrangement.

**Security and usage limits:** This app is a starting implementation, not a bank-approved finance system; obtain an independent security review before real confidential data or shared production access. Administrators should keep their own backups. The current implementation supports one initial administrator account; granular access roles, MFA, approval chains and cloud syncing require additional development.

## Migrating from the existing AARC AppDeploy app

The existing app's records and receipts are **not automatically copied** into this separate codebase.

1. Log into the original AppDeploy app and choose **Settings → Export JSON backup**.
2. In the new app, choose **Settings → Import a JSON backup** and confirm. The importer maps projects and transactions, protects current records, and skips repeat imports with the same external record IDs.
3. **Receipts / transfer slips are not included** in the JSON export. You must separately download the original slip images/PDFs and reattach them to migrated transactions.
4. Compare report totals, project counts, categories and receipt history before switching to the new app. Leave the original app unchanged until reconciled.

Notes: if you import a JSON backup twice, recognized source record IDs are skipped. Project budgets and entries already present are not overwritten. If receipts are missing or external records use undocumented formats, manual review/mapping is required. The importer does not have direct access to any AppDeploy or Hercules database.

## GitHub setup

The GitHub connector used in ChatGPT cannot currently create a *new repository* and did not list an accessible repository for this account. Create an **empty private repository** in GitHub, then upload the contents of this ZIP or push with:

```bash
git init
git add .
git commit -m "Initial AARC Project Management Pro V2"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
git push -u origin main
```

Never commit an actual `.env` or the `data/` directory. `.gitignore` excludes both. The provided `.env.example` is only a template.

## Audit and known limitations

- Server API and financial data workflows have automated tests; local tests cover administrator setup, receipt authentication, duplicate references, import behavior, and BML transfer slip field parsing.
- UI browser screenshot testing was attempted but the browser environment blocked localhost navigation. Test the app in your actual iPhone/iPad browser before operational use.
- OCR may misread a scanned PDF, name, amount or date and is **not payment verification**. The checkbox is required before saving any new or edited transaction; invoices default to `Pending`.
- CSV exports include full account numbers for records in the filtered report. Protect these exported files.
- Automatic periodic backups, user invitation/roles, and direct migration of physical receipts are not implemented.
- The original AppDeploy app is left untouched.

### Docker quick start

Docker Compose is supported, with persistent named volume for the database and slips:

```bash
export SETUP_SECRET="a-long-random-code-stored-outside-git"
docker compose up -d --build
```

The `compose.yaml` binds the server to `127.0.0.1:3000` by default. Keep it behind an HTTPS reverse proxy if it is made accessible from the internet. To restore data, include both the SQLite database files and receipt directory; do not rely on JSON export alone.

Additional source-review notes are in [REVIEW.md](REVIEW.md).
