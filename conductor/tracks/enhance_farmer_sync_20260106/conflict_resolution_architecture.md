# Conflict Resolution Architecture

This document details the proposed architecture for a hybrid conflict resolution mechanism for the Hapsara application.

## 1. Guiding Principles

-   **Data Integrity First:** The system must prevent unintentional data loss from concurrent edits.
-   **Automate When Safe:** Automatically merge non-conflicting changes to reduce user friction.
-   **User Control for Conflicts:** When a direct conflict occurs, a user with appropriate permissions must make the final decision.
-   **Transparency:** The system should provide a clear audit trail for any conflicts and their resolution.

## 2. Architectural Components

### 2.1. Client-Side (WatermelonDB) Modifications

A new, non-persisted field will be added to relevant WatermelonDB models:

-   `server_modified_at`: This field will store the `updated_at` timestamp of a record as it was last pulled from the server. This field will **not** be part of the schema pushed to Supabase. It's a transient, in-memory field used purely for conflict detection during the push phase.

The local `syncStatusLocal` field will be updated to include a new `'conflicted'` state.

### 2.2. Server-Side (Supabase) Modifications

A new table named `conflicts` will be created to store and manage data conflicts.

**`conflicts` Table Schema:**

| Column          | Type         | Description                                                      |
|-----------------|--------------|------------------------------------------------------------------|
| `id`            | `uuid`       | Primary key.                                                     |
| `table_name`    | `text`       | The name of the table where the conflict occurred (e.g., 'farmers'). |
| `record_id`     | `uuid`       | The ID of the conflicting record.                                |
| `client_record` | `jsonb`      | The complete record from the client at the time of the push.     |
| `server_record` | `jsonb`      | The complete record from the server at the time of the push.     |
| `status`        | `text`       | The status of the conflict (e.g., 'unresolved', 'resolved').     |
| `created_at`    | `timestampz` | Timestamp of when the conflict was logged.                       |
| `resolved_at`   | `timestampz` | Timestamp of when the conflict was resolved (nullable).          |
| `resolved_by`   | `uuid`       | The ID of the user who resolved the conflict (nullable).         |

### 2.3. Synchronization Logic (`lib/sync.ts`) Modifications

The `pushChanges` function in `lib/sync.ts` will be significantly updated.

**Proposed `pushChanges` Flow:**

For each `updated` record in the `changes` object from WatermelonDB:

1.  **Pre-flight Check:** Before attempting an `upsert`, execute a `select` query to fetch the current `updated_at` timestamp for the corresponding record on the server.

2.  **Conflict Detection:**
    -   Compare the `updated_at` from the server with the `server_modified_at` field stored on the local WatermelonDB record.
    -   **No Conflict:** If the timestamps match, it means the server record is unchanged since the last pull. The `upsert` can proceed safely.
    -   **Conflict Detected:** If the timestamps do not match, a conflict has occurred.

3.  **Conflict Handling:**
    -   **Do NOT `upsert` the change.**
    -   Fetch the full current record from the server.
    -   Create a new entry in the `conflicts` table, logging the `table_name`, `record_id`, the full `client_record`, and the full `server_record`.
    -   Update the local record's `syncStatusLocal` to `'conflicted'`. This will prevent it from being included in subsequent pushes until the conflict is resolved and the local record is updated via a pull.

*(Note: A three-way automatic merge could be added here as an optimization, but the initial implementation will focus on flagging for manual resolution to ensure maximum safety.)*

## 3. Manual Resolution UI

A new administrative page will be developed for conflict resolution.

-   **View:** The page will display a list of all records from the `conflicts` table with a status of `'unresolved'`.
-   **Component:** A conflict resolution component will be created to:
    -   Display a side-by-side "diff" view of the `client_record` and `server_record` JSON objects, highlighting the differing fields.
    -   Allow the administrator to choose which version to keep for each conflicting field, or to enter a new value.
-   **Action:** Upon saving the resolution, the component will:
    1.  Construct the final, resolved record.
    2.  `upsert` the resolved record into the correct target table (e.g., `farmers`).
    3.  Update the corresponding entry in the `conflicts` table, setting the `status` to `'resolved'`, and filling in `resolved_at` and `resolved_by`.

This architecture creates a robust, auditable system for managing data conflicts, prioritizing data safety while providing a clear workflow for resolution.
