# inventory-backend — Bruno API collection

A [Bruno](https://www.usebruno.com/) collection covering representative
inventory-backend endpoints (health, products + CSV import, GST/GSTR reports,
notifications, calendar, party CSV import).

## Usage

1. Open this folder in Bruno (`File → Open Collection`).
2. Select the **local** environment and set:
   - `baseUrl` — defaults to `http://localhost:3100/api/v1`.
   - `token` — a valid **kalnostics business JWT** (same `JWT_SECRET`). All
     non-health routes require it.
3. Run requests individually, or the whole collection with the Bruno CLI:
   ```
   npx @usebruno/cli run --env local
   ```

The `/health` request is public; every other request sends `Authorization:
Bearer {{token}}`. Import requests default to `dryRun: true` (preview) — flip to
`false` to commit. Replace placeholder ids (e.g. `categoryId`) with real values
from your tenant.
