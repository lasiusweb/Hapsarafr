# Conflict Resolution Strategies Research

This document outlines various conflict resolution strategies for data synchronization in distributed systems, with a recommendation for the Hapsara project.

## 1. Last-Write-Wins (LWW)

*   **Description:** The last write operation, typically determined by a timestamp, overwrites any previous changes. This is the simplest strategy and the one currently in implicit use.
*   **Pros:** Simple to implement, no user interaction required.
*   **Cons:** Prone to unintentional data loss, especially in collaborative environments.
*   **Recommendation:** Suitable only for low-risk, non-critical data or where concurrent edits are extremely rare.

## 2. Three-Way Merge

*   **Description:** When a conflict occurs, the system compares three versions of the data: the original version (common ancestor), the client's version, and the server's current version. It attempts to merge the changes automatically.
*   **Pros:** Can automatically resolve non-overlapping changes to the same record, preserving work from multiple users.
*   **Cons:** More complex to implement. Fails if the exact same field is modified in both versions, requiring a fallback strategy.
*   **Recommendation:** A strong candidate for the Hapsara backend. It can handle many common offline-first scenarios gracefully.

## 3. Operational Transformation (OT)

*   **Description:** A highly complex algorithm used for real-time collaborative editing (e.g., Google Docs). It transforms editing *operations* against each other to ensure all users converge on the same state.
*   **Pros:** Provides a seamless real-time collaborative experience.
*   **Cons:** Extremely complex to implement and debug. Generally overkill for applications that are not real-time text editors.
*   **Recommendation:** Not recommended for this project due to its complexity.

## 4. Conflict-Free Replicated Data Types (CRDTs)

*   **Description:** Mathematically-proven data structures that allow for concurrent modifications and are guaranteed to eventually converge to the same state without conflicts.
*   **Pros:** Excellent for distributed systems and offline-first applications. Avoids conflicts by design.
*   **Cons:** Can be complex to understand and may require significant changes to the data model.
*   **Recommendation:** A powerful but potentially overly complex solution for the current needs. It could be considered in a future major architectural revision if real-time collaboration becomes a primary feature.

## 5. Manual Conflict Resolution (User-driven)

*   **Description:** When an automated merge fails, the system presents the conflicting versions to the user and requires them to manually choose the correct version or merge the content themselves. This is how `git` handles merge conflicts.
*   **Pros:** Puts the user in control, preventing any automated data loss. It's the safest option when data integrity is paramount.
*   **Cons:** Interrupts the user's workflow and requires a well-designed UI to be effective. Can be confusing for non-technical users.
*   **Recommendation:** Highly recommended as a fallback mechanism when a three-way merge fails.

## Recommended Strategy for Hapsara

A hybrid approach is recommended for the Hapsara project to balance data integrity with user experience:

1.  **Primary Strategy: Three-Way Merge.** The sync process should attempt to automatically merge changes. This will handle cases where different fields of the same farmer record are updated by different users.
2.  **Fallback Strategy: Manual Conflict Resolution.** If the three-way merge detects a conflict on the *same field*, the system should not automatically decide a winner. Instead, it should:
    *   Flag the record as "conflicted".
    *   Create a notification for an administrator or a designated user.
    *   Provide a simple UI where the user can see the conflicting values (e.g., "Phone number was changed to X on your device, but was Y on the server. Which is correct?") and choose the winning version.
3.  **Default for Low-Risk Data: Last-Write-Wins.** For less critical data (e.g., UI preferences, non-essential logs), LWW can be maintained to reduce complexity and user friction.

This approach provides a robust system that prevents most data loss scenarios while providing a safe escape hatch for true conflicts, ensuring an admin or user can make the final call.
