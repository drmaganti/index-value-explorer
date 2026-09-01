# Security

## Immediate repository issue

This public repository currently contains a tracked `.env` file.

The environment file's contents were **not inspected for this documentation pass**. Treat the file as potentially sensitive until reviewed.

Recommended remediation:

1. identify whether any committed value is secret or privileged;
2. rotate any credential that may have been exposed;
3. remove `.env` from Git tracking;
4. add a sanitized `.env.example` with variable names/placeholders only;
5. verify `.gitignore` excludes real local environment files;
6. assess Git history and rewrite it if sensitive values were committed previously.

A later deletion commit does not erase prior values from Git history.

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

If a secret is discovered in the public repository:

1. rotate/revoke it first;
2. remove the value from the current tree;
3. assess/rewrite Git history if necessary;
4. verify provider/account access logs where available;
5. document the remediation;
6. add a guardrail that prevents recurrence.

Do not paste exposed credential values into issues or remediation documentation.
