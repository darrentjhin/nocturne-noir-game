# NOCTURNE production operations

## Required Railway settings

The code is prepared for durable single-instance operation. In the Railway dashboard:

1. Keep the service at exactly one replica.
2. Mount a persistent volume at `/data`.
3. Set `ROOM_STORE_PATH=/data/nocturne-rooms.json`.
4. Set `FEEDBACK_STORE_PATH=/data/nocturne-feedback.jsonl`.
5. Set `MAX_ACTIVE_ROOMS=1000` unless a lower measured capacity is preferred.
6. Leave `SEAT_RELEASE_MS` unset to use the two-minute reconnect window.
7. Redeploy and verify `/api/health` reports `persistence: "file"` and `feedbackStorage: "file"`.

Do not enable multiple replicas while rooms use a JSON file. Move room state to Redis or Postgres first.

## Release gate

Railway must not deploy every unverified push to `main`. Use one of these supported policies:

- Configure Railway to deploy a protected `production` branch, then update that branch only after `Release checks` succeeds.
- Or disable automatic source deploys and trigger production from a CI job holding a Railway project token.

Until the dashboard is changed, a failed commit can briefly reach production before GitHub Actions reports the failure.

## Release procedure

1. Open a pull request into `main`.
2. Require the `Release checks` workflow.
3. Review gameplay/data changes for accidental hidden-answer exposure.
4. Merge only while production is not hosting a scheduled playtest.
5. Promote the verified commit to the Railway production source.
6. Confirm the health endpoint reports that exact commit.
7. Run both production socket smokes. They do not submit production feedback.
8. Open both live landing pages and inspect the release on a phone and desktop.

## Rollback

1. Select the previous successful Railway deployment and redeploy it.
2. Confirm `/api/health` returns the prior release hash.
3. Verify the room persistence file still parses.
4. Run both socket smokes.
5. Record the failed release, symptom, and rollback hash.

Do not overwrite or delete the volume during an application rollback.

## Backup and restore drill

After the volume is enabled, regularly copy both `/data` files through Railway's supported backup/export mechanism. A quarterly restore drill should:

1. Back up rooms and feedback.
2. Restore them into a non-production service.
3. Confirm File 01 and File 02 resume with stale socket IDs removed.
4. Confirm each notebook remains tied to the correct resume token.
5. Run `npm run feedback:summary -- /path/to/nocturne-feedback.jsonl`.

## Monitoring

The scheduled `Production health` GitHub workflow probes health and both case surfaces every 15 minutes. Enable GitHub Actions failure notifications for the repository owner. Production logs and future error reporting must never include Radio messages, notebooks, or resume tokens.

## Capacity

Before promotion, run 25-, 50-, and 100-room load tests against staging. Measure memory, CPU, WebSocket latency, persistence latency, reconnect success, and cleanup. Remain on one replica until shared transactional room state exists.
