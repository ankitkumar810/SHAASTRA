# SHAASTRA Engineering Rules

## Coding standards

- Use TypeScript for all future application code and keep `strict` mode enabled.
- Prefer small, feature-focused components and pure, testable business logic.
- Use meaningful names, explicit types at boundaries, and short comments only where intent is not obvious.
- Keep accessibility native: semantic HTML, keyboard operation, labels, clear focus, adequate contrast, and plain language.
- Do not introduce hidden magic values; name operational thresholds and document their source.

## Technology and dependency rules

- Do not install a package without a clear requirement, maintained release history, licence suitability, and a documented use.
- Prefer the approved stack in `ARCHITECTURE.md`; avoid overlapping libraries that solve the same problem.
- Do not add a dependency for a task that standard platform APIs or existing project code can safely handle.
- Keep secrets in environment configuration only; never commit them or expose them to the client.

## Error handling

- Validate all inputs at client and server boundaries; server validation is authoritative.
- Return safe, actionable errors to users and structured diagnostic errors to logs.
- Do not expose stack traces, internal identifiers, access details, or secrets in production responses.
- Critical updates must show their confirmed/failed/pending state. Queued offline work must be visible and retryable.

## Security rules

- Apply least privilege through role and district scopes; deny by default.
- Treat names, contact data, exact location, shelter occupancy records, and disaster reports as sensitive.
- Use Row Level Security and server-side authorization; never rely only on hidden UI controls.
- Record sensitive access and verification actions in an audit log.
- Protect public forms with abuse prevention, validation, and rate limiting.
- Never make a person's phone number, precise personal location, or direct contact details public through search.

## AI boundaries and anti-hallucination rules

- AI may only answer from supplied, approved, time-stamped SHAASTRA data and approved safety content.
- AI must not invent capacity, resources, shelter status, official advisories, missing-person matches, confidence, or emergency instructions.
- Every operational recommendation must state its data freshness and uncertainty when relevant.
- AI does not replace emergency services, medical professionals, or authorised disaster authorities.
- If grounded information is unavailable, the assistant must say so, offer safe general guidance, and direct the user to official emergency channels.

## Human verification for sensitive AI results

- An authority must verify all public disaster reports that trigger operational action.
- An authorised human must approve resource-allocation decisions; forecasts are advisory only.
- Missing-person image matching, if ever added, may only produce a candidate for authorised human review and cannot confirm identity automatically.
- Do not use AI to make eligibility, priority, or safety determinations about an individual without an accountable human decision-maker.

## Low-bandwidth rules

- Treat the text/list experience as primary; maps and rich media are enhancements.
- Minimise initial JavaScript, images, animation, and network requests.
- Cache the latest verified critical information and visibly show when it was last updated.
- Design write flows to safely queue when offline and prevent duplicate submissions on sync.
- Keep essential content understandable on small screens and slow connections.

## Testing rules

- Test every critical journey: find a shelter, update a shelter, mark safe, controlled lookup, review report, receive alert, and offline retry.
- Unit test validation, permissions, resource thresholds, and AI output parsing.
- Integration test database policies and API authorization for every role.
- End-to-end test a citizen, shelter-admin, and authority path before each demo/release.
- Treat a broken privacy boundary or unsafe stale-data display as a release blocker.

## Git rules

- Keep commits focused and descriptive; do not mix refactors with functional changes.
- Never commit secrets, generated credentials, local databases, or large unreviewed assets.
- Review the diff before committing; preserve user changes that are outside the active task.
- Use feature branches once a shared repository workflow is established.

## Scope control

- Prioritise the working prototype flows defined in `PRODUCT_REQUIREMENTS.md` over speculative integrations.
- Build rule-based alerts before a complex predictive model.
- Defer native mobile apps, facial matching, multi-state tenancy, full SMS delivery, and advanced analytics unless they directly unblock the SIH demo.
- Do not over-engineer for national scale at the expense of a reliable district-level demonstration.

## Rules for Codex modifications

- Read these three documents before implementing a new SHAASTRA feature.
- Preserve the existing prototype unless a requested, reviewed task explicitly replaces part of it.
- Do not create, delete, rename, or install material project components beyond the user's stated task.
- Before modifying a file, inspect it and preserve unrelated changes.
- Explain the intended scope before a non-trivial implementation and report the files changed plus verification performed afterwards.
- Never fabricate test results, live data, user identities, or external service connectivity.
- Ask for direction before an irreversible, externally visible, paid, or security-sensitive action.
