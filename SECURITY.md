# Security

## Environment-file remediation status

A real `.env` file was previously tracked in this public repository. During the documentation/security pass, the current-tree file was removed **without reading or exposing its contents**, `.env`/`.env.*` were added to `.gitignore`, and a sanitized `.env.example` was added.

That fixes the current-tree hygiene issue but does **not** prove historical values were safe.

Remaining required follow-up:

1. determine whether any previously committed value was secret or privileged;
2. rotate/revoke any credential that may have been exposed;
3. assess Git history and rewrite it if sensitive values must be removed;
4. review provider/account logs where useful.

Deleting `.env` from the current tree does not erase prior versions from Git history.

## Supabase/client configuration

The frontend uses a Supabase publishable-key configuration. Browser-visible publishable keys are not a substitute for authorization.

Never expose a Supabase service-role key or other privileged credential to client code.

Database/storage policies must enforce access to non-public data independently of UI checks.

## Market/data-provider keys

Any private market-data, AI, or other provider key should remain server-side. If the browser needs a protected capability, proxy it through an authenticated/rate-limited server boundary rather than embedding a secret in Vite environment variables.

## Public APIs

Public endpoints should be designed assuming automated use and abuse. Add as appropriate:

- input validation;
- rate limits/quotas;
- request-size constraints;
- timeout/retry policies;
- provider error isolation;
- logging with secret redaction.

## Financial-data integrity

Security/reliability includes preventing misleading data:

- preserve source/freshness metadata where possible;
- validate units/types before scoring;
- distinguish missing data from zero;
- keep AI explanation unable to overwrite scores or structured values;
- version methodology changes for reproducibility.

## Dependency and deployment hygiene

- review dependency advisories;
- remove unused dependencies;
- protect deployment credentials in the hosting platform;
- use HTTPS;
- maintain a rollback path for broken releases.

## Incident response

If a secret is discovered in repository history:

1. rotate/revoke it first;
2. assess/rewrite Git history if necessary;
3. verify provider/account access logs where available;
4. document the remediation;
5. add or strengthen a guardrail that prevents recurrence.

Do not paste exposed credential values into issues or remediation documentation.
