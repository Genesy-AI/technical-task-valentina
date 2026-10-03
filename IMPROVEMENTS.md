# TinyEnginy Improvements

**Project area:** Leads, imports, and enrichment  
**Document status:** Proposed backlog  
**Goal:** Make lead data reliable to import and maintain, and make asynchronous enrichment safe to operate as usage grows.

## Delivery Order

1. **Now:** Resolve data correctness and provider configuration gaps before relying on phone enrichment.
2. **Next:** Improve workflow recovery and add end-to-end coverage for the API/database/Temporal boundaries.
3. **Later:** Scale lead browsing and reduce duplicated frontend/backend contracts.

## Backlog

### LEAD-01: Capture a real company website for Orion

**Priority:** P1 · **Status:** Proposed

Orion expects `companyWebsite`, but leads currently have no website field. Enrichment currently derives it from the email domain, which can be wrong for personal email addresses or companies with separate web domains.

**Acceptance criteria**
- Add an optional company website field to the lead model and migration.
- Support the field in create, update, and CSV import flows.
- Pass the stored website to Orion; do not infer it from personal email domains.
- Validate and normalize website input without requiring a particular URL scheme.

### LEAD-02: Keep CSV and API validation consistent

**Priority:** P1 · **Status:** Proposed

CSV parsing validates some fields in the browser, while the bulk import endpoint independently filters required values. New lead fields and country-code validation can therefore be dropped or bypassed through direct API calls.

**Acceptance criteria**
- Parse `phone`, `yearsCompany`, and `linkedinUrl` from CSV and include them in the bulk-import payload.
- Persist those fields through bulk import and single-lead create/update.
- Apply the same country-code, integer, email, and URL validation on the server.
- Return row-level errors that identify the rejected field and row; do not silently discard invalid values.
- Cover valid, missing, malformed, and mixed-validity CSVs with tests.

### ENRICH-01: Add safe provider configuration and readiness checks

**Priority:** P1 · **Status:** Proposed

Provider activities require `ORION_CONNECT_API_KEY`, `ASTRA_DIALER_API_KEY`, and `NIMBUS_LOOKUP_API_KEY`. Missing configuration currently appears as a failed enrichment after a user starts the job.

**Acceptance criteria**
- Document the required environment variables in the local setup guide and deployment configuration.
- Validate provider configuration before accepting enrichment jobs and return an actionable error if keys are missing.
- Keep credentials out of source control and redact them from logs and error responses.
- Add a readiness check that distinguishes API availability from Temporal/provider readiness.

### ENRICH-02: Support explicit retries for failed lookups

**Priority:** P1 · **Status:** Proposed

A stable workflow ID prevents duplicate work, but also means a lead whose lookup ends in `failed` cannot be retried through the current endpoint. `no_data` should remain distinct from a provider error.

**Acceptance criteria**
- Allow a user to retry a failed lookup without creating concurrent workflows for the same lead.
- Keep successful and `no_data` results idempotent unless the user explicitly requests a refresh.
- Record an attempt number or generation in workflow IDs and persisted state.
- Expose retry progress and the final outcome in the table.

### ENRICH-03: Add provider-level diagnostics and rate limits

**Priority:** P2 · **Status:** Proposed

The current UI reports a final status, but does not identify which provider was attempted, how long it took, or why it failed. The worker has a global activity rate cap; future provider limits may differ.

**Acceptance criteria**
- Record provider name, attempt count, duration, and outcome without logging credentials or unnecessary personal data.
- Configure concurrency and request-rate limits independently per provider.
- Respect `Retry-After` for rate-limit responses and apply bounded exponential backoff with jitter.
- Expose a concise final diagnostic to operators while keeping raw provider responses private.

### PLATFORM-01: Separate the API and Temporal worker processes

**Priority:** P2 · **Status:** Proposed

The Express API starts the Temporal worker in the same process. This couples HTTP availability to worker startup and makes independent scaling, deployments, and graceful shutdown harder.

**Acceptance criteria**
- Provide separate API and worker start commands and deployment processes.
- Keep both processes pointed at the same Temporal task queue and database.
- Add graceful shutdown for HTTP, Temporal connections, and Prisma clients.
- Verify that restarting the API does not interrupt already-started workflows.

### PLATFORM-02: Add server-side pagination and lead search

**Priority:** P2 · **Status:** Proposed

`GET /leads` currently returns every lead, and the table loads the entire result set into the browser. This will increase response time and memory use as the dataset grows.

**Acceptance criteria**
- Add stable cursor-based pagination with a configurable page size.
- Support search across name, email, and company, plus filters for enrichment status.
- Preserve selection and bulk actions across pages with clear selection semantics.
- Add indexes based on measured query plans and representative data volumes.

### PLATFORM-03: Share API contracts and message-template fields

**Priority:** P2 · **Status:** Proposed

Frontend request/response types are maintained separately from backend routes, and the message-template field list is duplicated between the UI and generator. These contracts can drift when fields are added.

**Acceptance criteria**
- Define request/response schemas once and validate API inputs at runtime.
- Generate or share frontend types from those schemas.
- Use a single field registry for template insertion and backend substitution.
- Add contract tests that ensure every advertised template field is supported and has consistent missing-value behavior.

### QUALITY-01: Add API and Temporal integration tests

**Priority:** P1 · **Status:** Proposed

Unit tests cover message generation and provider adapters, but do not exercise the Express routes, database state transitions, duplicate workflow starts, or the full enrichment lifecycle.

**Acceptance criteria**
- Test the enrichment endpoint with a test database and mocked Temporal client.
- Test a workflow against a Temporal test environment or equivalent deterministic harness.
- Cover provider success at each position, all providers returning no data, exhausted retries, duplicate requests, and worker/API restart behavior.
- Run backend and frontend tests plus type checks in CI for every pull request.

## Suggested Milestones

**Milestone 1: Reliable inputs and operations**  
Complete LEAD-01, LEAD-02, and ENRICH-01. These close the highest-risk gaps between imported data, provider requests, and actionable failures.

**Milestone 2: Recoverable enrichment**  
Complete ENRICH-02, ENRICH-03, and QUALITY-01. This gives the team safe retries, provider visibility, and regression coverage before increasing enrichment volume.

**Milestone 3: Scale and simplify**  
Complete PLATFORM-01, PLATFORM-02, and PLATFORM-03 as deployment and data volume requirements become clearer.
