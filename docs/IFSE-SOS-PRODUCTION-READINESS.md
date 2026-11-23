# IFSE SOS production-readiness checklist

## 0. Runtime architecture

The deployed Render service uses the existing Python FastAPI application started with `uvicorn app:app`. The production IFSE routes in this pull request are mounted from `ifse_runtime.py` into that FastAPI application. Keep Render's existing Python start command; do not switch this service to the unused Express entry point.

FastAPI routes added for responder and escalation workflows:

- `POST /api/responder-response/{emergency_id}/accept`
- `POST /api/responder-response/{emergency_id}/arrived`
- `POST /api/ifse-dispatch/escalate-due` (protected by `X-IFSE-Escalation-Secret`)

Initial SOS dispatch remains `POST /api/ifse-dispatch/{emergency_id}/dispatch`. It creates the assignment and invokes the backend-only signed agency gateway. An agency endpoint is contacted only when that agency's HTTPS URL and shared signing secret have been configured by an authorised administrator. Otherwise the agency notification remains `queued`.

This document describes configuration that must be verified before SOS can be described as operational. Repository code and passing CI do not prove that live Firestore records, responder accounts, agency partnerships, or external delivery channels exist.

## 1. Required Firestore configuration

### `emergencyResponseRules`

Create and review one active rule document for each supported classification:

- `MEDICAL`
- `FIRE`
- `FLOOD`
- `POLICE`
- `ARMED_ATTACK`

Required fields consumed by dispatch:

- `active: true`
- `primaryAgency`: exact `agencyCode` or `agencyName` in `ifseAgencyRegistry`
- `secondaryAgency` and `tertiaryAgency`: optional exact registry identifiers
- `escalationMinutes`: positive number of minutes to wait for responder acceptance
- `priority` and `estimatedArrivalMinutes`: operational values appropriate to the rule

Do not use zero or omit `escalationMinutes` for an active rule. Automatic escalation intentionally skips invalid or non-positive timers.

### `ifseAgencyRegistry`

Each agency record must be formally verified before activation:

- `agencyName`, `agencyCode`
- `agencyType`
- `active: true`
- `governmentAuthorized: true`
- `responderCollection`: exact Firestore collection name
- `ifseVerifiedRequired`: true when the agency requires IFSE-level responder verification

An agency must not be marked active or government-authorized merely because its name appears in a rule. Authorization must be supported by a genuine, documented agency relationship.

### Responder collection

Every responder referenced by an agency's `responderCollection` must have:

- `available: true`
- `onDuty: true`
- `verified: true`
- `suspended: false` (or omitted)
- `ifseVerified: true` when the agency requires it
- A real linked Firebase account UID in one of: `firebaseUid`, `firebaseUID`, `userId`, or `uid`

The Firebase UID must identify the responder who signs in. Do not create placeholder responder identities or link a shared account to multiple people.

## 2. External agency dispatch

The backend dispatch gateway reads these server-side environment variables for each agency code:

- `IFSE_AGENCY_<AGENCYCODE>_DISPATCH_URL`
- `IFSE_AGENCY_<AGENCYCODE>_DISPATCH_SECRET`

The endpoint must be HTTPS and supplied by the agency through an authorized technical contact. The matching secret must be exchanged securely, not committed to GitHub or placed in client-side code.

The gateway signs the minimal incident payload using HMAC-SHA256 and includes a timestamp and idempotency key. An agency endpoint must validate the signature and timestamp, deduplicate the idempotency key, acknowledge receipt, and protect the incident data in transit and at rest.

Until the endpoint and secret are configured and tested with the agency, the backend may record a dispatch as queued. Queued is not delivered, and provider acceptance is not proof that an officer or responder received or acted on the alert.

## 3. Automatic escalation scheduler

After the backend PR is reviewed, merged, and deployed:

1. Set Render's `IFSE_ESCALATION_SECRET` to a strong random secret.
2. Set GitHub repository secrets `IFSE_ESCALATION_URL` and `IFSE_ESCALATION_SECRET`.
3. `IFSE_ESCALATION_URL` must be the deployed backend URL ending in `/api/ifse-dispatch/escalate-due`.
4. Confirm the scheduled workflow runs and returns HTTP success.
5. Confirm a controlled test case escalates only after its configured acceptance timeout.
6. Confirm an accepted responder stops further escalation.

The scheduled workflow in this branch does not run automatically from the default branch until its changes are merged there.

## 4. Controlled end-to-end test plan

Use a dedicated test incident and test responder accounts; never create a false emergency involving public agencies.

- Registered member creates a test SOS; anonymous Firebase user is rejected.
- Only the SOS owner can initiate dispatch for that incident.
- A verified, on-duty responder with a linked Firebase UID is assigned.
- A different Firebase account cannot accept or report arrival for that responder.
- The assigned responder can accept once; repeated acceptance is idempotent.
- Acceptance racing with escalation results in one authoritative state, not a second assignment.
- Arrival is rejected before acceptance and accepted only for the current assigned responder.
- An unaccepted assignment escalates after the configured interval.
- A queue cannot be processed concurrently by two workers.
- An unavailable agency or missing responder is audited and retried/escalated according to configured rules.
- No external agency delivery is reported unless its authorized endpoint acknowledges the signed request.
- Trusted Contacts receive only the information required for the SOS workflow.

## 5. Go-live gate

Do not announce SOS as fully operational until all of the following are evidenced:

- Live Firestore rules, agency registry records, responder collections, and UID links reviewed.
- Firebase rules and backend authorization reviewed.
- Backend deployment and secrets verified.
- GitHub scheduled escalation run verified.
- End-to-end tests passed in a controlled environment.
- Each participating agency has formally authorized the integration and completed endpoint testing.
- Notification delivery and failure handling are tested and audited.

No real agency partnership, live responder roster, endpoint credential, or successful public-service delivery is implied by this checklist.
