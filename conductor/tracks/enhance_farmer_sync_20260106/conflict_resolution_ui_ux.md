# UI/UX Design: Sync Status & Conflict Resolution

This document outlines the UI/UX design for synchronization status notifications and the conflict resolution workflow, leveraging the project's existing design patterns.

## 1. Global Sync Status Indicator

A persistent sync status indicator will be added to the main application header to provide users with at-a-glance information about the state of their data.

-   **Location:** Main application navbar, likely near the user profile menu.
-   **Component:** An icon paired with a short text label. The component will have a tooltip for more detailed information.
-   **States:**
    -   **Synced:**
        -   **Icon:** Green checkmark.
        -   **Text:** "Synced"
        -   **Tooltip:** "All data is up to date."
    -   **Syncing:**
        -   **Icon:** Rotating sync/spinner icon.
        -   **Text:** "Syncing..."
        -   **Tooltip:** "Syncing data with the cloud."
    -   **Offline:**
        -   **Icon:** Cloud with a slash through it.
        -   **Text:** "Offline"
        -   **Tooltip:** "You are currently offline. Changes are saved locally and will sync when you reconnect."
    -   **Pending:**
        -   **Icon:** Up-arrow icon.
        -   **Text:** "Changes pending"
        -   **Tooltip:** "You have local changes waiting to be synced."
    -   **Conflict:**
        -   **Icon:** Yellow warning triangle.
        -   **Text:** "Conflicts"
        -   **Tooltip:** "Data conflicts require your attention. Click to resolve."
        -   **Action:** Clicking this indicator will navigate the user to the Conflict Resolution Page.
    -   **Error:**
        -   **Icon:** Red error icon.
        -   **Text:** "Sync failed"
        -   **Tooltip:** "The last sync attempt failed. Please check your connection or contact support."

## 2. Toast Notifications

The existing `Notification.tsx` component will be used to provide transient feedback on sync events.

-   **On Sync Success:** A `success` type notification with the message: "Sync completed successfully."
-   **On Sync Failure:** An `error` type notification with the message: "Sync failed. Please check your connection and try again."
-   **On Conflict Detection:** An `error` or `info` type notification with the message: "Data conflict detected. Go to the Conflicts page to resolve." This notification should persist longer or require manual dismissal. Clicking it should navigate to the Conflict Resolution Page.

## 3. Conflict Resolution Page

A new page will be created for administrators to manage and resolve data conflicts.

-   **Route:** `/conflicts` (or `/admin/conflicts`)
-   **Access:** Restricted to users with administrative permissions.
-   **Layout:** A two-column layout.
    -   **Left Column:** A scrollable list of all unresolved conflicts, fetched from the `conflicts` table. Each list item will display:
        -   The type of record (e.g., "Farmer").
        -   A primary identifier for the record (e.g., Farmer's Name or HAP ID).
        -   The date and time the conflict was detected.
        -   The currently selected item will be highlighted.
    -   **Right Column:** The main resolution interface, which is displayed when a conflict is selected from the list.

### Conflict Resolution Interface

-   **Header:** A clear title, e.g., "Resolve Conflict for Farmer: [Farmer Name]".
-   **Comparison View:**
    -   A clean, table-based layout will present the conflicting data.
    -   Each row represents a field in the data record.
    -   Columns:
        1.  **Field Name:** The human-readable name of the field (e.g., "Phone Number").
        2.  **Your Version (Local):** The value from the client at the time of the conflict.
        3.  **Server Version:** The value from the server at the time of the conflict.
        4.  **Resolution:** A set of radio buttons or a dropdown to choose the winning version.
    -   Non-conflicting fields will be displayed but marked as "No conflict".
    -   Quick-action buttons like "Use All My Versions" and "Use All Server Versions" will be provided at the top.
-   **Resolution Actions:**
    -   A "Resolve" button will be the primary action.
    -   Clicking "Resolve" will trigger a `ConfirmationModal`.
-   **Confirmation Modal:**
    -   **Title:** "Confirm Resolution"
    -   **Message:** A summary of the actions to be taken, e.g., "This will overwrite 2 fields with the server's version and 1 field with your version. This action cannot be undone."
    -   **Buttons:** "Confirm" (with `destructive` variant if overwriting) and "Cancel".

This UI/UX design aims to provide a clear, non-intrusive notification system for everyday sync operations while offering a powerful and intuitive interface for the critical task of resolving data conflicts.
