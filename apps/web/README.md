# @roomdesigner/web

Next.js app (UI, server actions and API routes) for RoomDesigner.

## Development

From the repository root:

```bash
pnpm dev
```

The web app runs on [http://localhost:3001](http://localhost:3001) and starts
the worker alongside it. See the root `README.md` for environment setup.

## Production

The production image is built from `apps/web/Dockerfile` and runs behind Caddy
on the Hostinger VPS (`docker-compose.prod.yml`). See
[`docs/runbook.md`](../../docs/runbook.md) for deployment, rollback and
operations.
