# MultiBot Salvaged Notes

Saved before full reset of `multibot-orchestrator`.

## Worth keeping

- Basic backend contract that worked:
  - `POST /api/auth/login`
  - `GET|POST|PATCH /api/conversations`
  - `GET|DELETE /api/conversations/:id`
  - `POST /api/chat`
  - `GET /api/usage`

- Core limits logic:
  - Daily runs limit: `10`
  - Daily API calls limit: `30`
  - Enforced server-side before model execution

- Access model:
  - Email-only login with allowlist
  - Session cookie `multibot_email`

- Orchestration intent:
  - Quick mode: single model
  - Super mode: bot flow + optional staged merges

## Known pitfall to avoid in rebuild

- Controlled/uncontrolled warnings from UI primitive components under hydration.
- Prefer native form controls or strict normalization to prevent `undefined` values for:
  - select `value`
  - switch/checkbox `checked`

## Rebuild recommendation

- Rebuild backend first, then layer UI.
- Keep strict zod schemas and normalized defaults for flow/models.
