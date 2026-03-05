/**
 * Task Details Data Contract
 * 
 * Canonical type definition for detailed task information.
 * This type is shared between:
 * - UI components (widget, modals, detail views)
 * - MCP tools (agile_get_task_details)
 * - API endpoints (REST fallback)
 * 
 * This contract defines the normalized shape of task data,
 * independent of ServiceNow's internal representation.
 * 
 * NO ServiceNow client imports.
 * NO implementation logic.
 * Types only.
 */

/**
 * Detailed information about a single task.
 * 
 * Includes all data needed to display a task detail view:
 * - Basic fields (title, description, state)
 * - Relationships (assignee, story)
 * - Metadata (labels)
 * - Attachments (files)
 * - Activity history (comments, field changes, system events)
 */
export type TaskDetails = {
  /** Task sys_id (unique identifier) */
  id: string;

  /** Task number (e.g., "STSK0011008") */
  key: string;

  /** Task title/short description */
  title: string;

  /** Full task description (may be null if not set) */
  description: string | null;

  /** Current state label (e.g., "Work in Progress") */
  state: string;

  /** Assigned user (null if unassigned) */
  assignee: null | {
    /** User sys_id */
    id: string;
    /** User display name */
    name: string;
  };

  /** Parent story (null if task is not linked to a story) */
  story: null | {
    /** Story sys_id */
    id: string;
    /** Story number (e.g., "STRY0010003") */
    key: string;
    /** Story title */
    title: string;
  };

  /** Task labels/tags (empty array if none) */
  labels: string[];

  /** File attachments (empty array if none) */
  attachments: Array<{
    /** Attachment sys_id */
    id: string;
    /** Original file name */
    fileName: string;
    /** MIME type (null if unknown) */
    contentType: string | null;
    /** File size in bytes (null if unknown) */
    sizeBytes: number | null;
    /** Download URL (null if not accessible) */
    downloadUrl: string | null;
  }>;

  /** Activity history (comments, field changes, system events) */
  activity: Array<{
    /** Activity record sys_id */
    id: string;

    /** Type of activity */
    type: "comment" | "work_note" | "field_change" | "system";

    /** Author display name (null for system events) */
    author: string | null;

    /** ISO 8601 timestamp */
    timestamp: string;

    /** Comment/note text (for comment/work_note types) */
    text?: string;

    /** Field name (for field_change type) */
    field?: string;

    /** Previous value (for field_change type, null if was empty) */
    from?: string | null;

    /** New value (for field_change type, null if cleared) */
    to?: string | null;
  }>;
};
