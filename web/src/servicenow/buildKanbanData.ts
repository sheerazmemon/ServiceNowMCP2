/**
 * ServiceNow → Kanban Data Adapter
 * 
 * Pure transformation utility that converts ServiceNow agile snapshot
 * into Syncfusion Kanban-compatible data structure.
 * 
 * NO React code, NO side effects, NO API calls.
 * Deterministic transformation only.
 */

// ServiceNow Snapshot Types (input)
interface AgileTask {
  id: string;
  key: string;
  title: string;
  state: string;
  assigneeName: string | null;
}

interface AgileStory {
  id: string;
  key: string;
  title: string;
  state: string;
  assigneeName: string | null;
  tasks: AgileTask[];
}

interface AgileSprint {
  id: string;
  name: string;
}

interface AgileSnapshot {
  sprint: AgileSprint | null;
  stories: AgileStory[];
}

// Kanban Data Types (output)
export interface KanbanCard {
  Id: string;
  Title: string;
  Status: string;
  Assignee: string;
  StoryId: string;
  StoryTitle: string;
  IsPlaceholder: boolean;
}

export interface KanbanSwimlane {
  id: string;
  text: string;
}

export interface KanbanData {
  cards: KanbanCard[];
  swimlanes: KanbanSwimlane[];
}

// Allowed Kanban columns (workflow states)
// These are the exact keyField values used in KanbanComponent columns
const ALLOWED_STATES = [
  'Draft',
  'Ready',
  'Work in Progress',
  'Complete',
  'Cancelled'
] as const;

// Build lookup map: normalized label -> canonical column key
// This handles ServiceNow's "Work in progress" (lowercase) -> "Work in Progress" (canonical)
const STATE_LOOKUP = new Map(
  ALLOWED_STATES.map(canonicalKey => {
    const normalized = canonicalKey
      .trim()
      .replace(/\s+/g, ' ')  // collapse whitespace
      .toLowerCase();
    return [normalized, canonicalKey];
  })
);

/**
 * Normalize ServiceNow state display value to canonical Kanban column key
 * 
 * Examples:
 *   "Work in progress" -> "Work in Progress"
 *   "work in progress" -> "Work in Progress"
 *   " Work   in progress " -> "Work in Progress"
 *   "Draft" -> "Draft"
 *   "Unknown" -> "Draft" (fallback)
 */
function normalizeState(state: string | null | undefined): string {
  if (!state) return 'Draft';
  
  // Normalize input: trim, collapse whitespace, lowercase
  const normalized = state
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  
  // Look up canonical column key
  return STATE_LOOKUP.get(normalized) ?? 'Draft';
}


/**
 * Safely convert nullable string to empty string
 */
function safeString(value: string | null | undefined): string {
  return value || '';
}

/**
 * Build Kanban data from ServiceNow agile snapshot
 * 
 * @param snapshot - ServiceNow agile snapshot
 * @returns Kanban-ready data structure
 */
export function buildKanbanData(snapshot: AgileSnapshot): KanbanData {
  const cards: KanbanCard[] = [];
  const swimlanes: KanbanSwimlane[] = [];

  // Handle empty snapshot
  if (!snapshot || !snapshot.stories || snapshot.stories.length === 0) {
    return { cards: [], swimlanes: [] };
  }

  // Sort stories by key (stable ordering)
  const sortedStories = [...snapshot.stories].sort((a, b) => {
    return a.key.localeCompare(b.key);
  });

  // Process each story
  for (const story of sortedStories) {
    // Create swimlane for this story
    swimlanes.push({
      id: story.id,
      text: story.title
    });

    // Sort tasks by key (stable ordering)
    const sortedTasks = [...story.tasks].sort((a, b) => {
      return a.key.localeCompare(b.key);
    });

    // If story has no tasks, create placeholder card
    if (sortedTasks.length === 0) {
      cards.push({
        Id: `placeholder_${story.id}`,
        Title: '(No tasks)',
        Status: normalizeState(story.state),
        Assignee: safeString(story.assigneeName),
        StoryId: story.id,
        StoryTitle: story.title,
        IsPlaceholder: true
      });
    } else {
      // Create card for each task
      for (const task of sortedTasks) {
        cards.push({
          Id: task.id,
          Title: task.title,
          Status: normalizeState(task.state),
          Assignee: safeString(task.assigneeName),
          StoryId: story.id,
          StoryTitle: story.title,
          IsPlaceholder: false
        });
      }
    }
  }

  return {
    cards,
    swimlanes
  };
}
