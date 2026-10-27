# AARC Project Management Pro V2

GitHub repository for the new, independent Aaru Avatu Recreation Club (AARC) project management web app.

## Current status
The GitHub repository has been initialized. The full V2 source is available in the ChatGPT-generated archive `AARC_Project_Management_Pro_V2_GitHub_Ready.zip` and must be uploaded to this repository before building or deploying. This README is a temporary placeholder; replace it with the README.md from the archive during upload.

## Features in the source archive
- Responsive AARC financial dashboard and Crab Beach project hierarchy
- Income, expenses, category and receipt management
- Transfer-slip and invoice reading with manual review
- Project reports, audit history, and JSON backup import/export
- Node.js backend with SQLite, Docker files and tests

## Security and migration
The new app starts with a separate, empty database. Existing AppDeploy income/expense records and transfer-slip files have **not** been imported. Keep the old app and backups intact until a verified migration. Do not commit credentials, production data, bank statements or uploaded slips.

## Next step
Extract the ChatGPT-provided ZIP, then upload its files (including hidden `.github`, `.gitignore`, and `.env.example`) into this repository, replacing this placeholder README. Follow the archive's README for setup and deployment. GitHub Pages alone cannot host this app's backend/database.
