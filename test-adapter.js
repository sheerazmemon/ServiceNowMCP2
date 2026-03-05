/**
 * Quick test script to validate buildKanbanData adapter
 * Run with: node test-adapter.js
 */

// Simulate the adapter logic (no TypeScript compilation needed)
const ALLOWED_STATES = [
  'Draft',
  'Ready',
  'Work in Progress',
  'Complete',
  'Cancelled'
];

// Build lookup map: normalized label -> canonical column key
const STATE_LOOKUP = new Map(
  ALLOWED_STATES.map(canonicalKey => {
    const normalized = canonicalKey
      .trim()
      .replace(/\s+/g, ' ')  // collapse whitespace
      .toLowerCase();
    return [normalized, canonicalKey];
  })
);

function normalizeState(state) {
  if (!state) return 'Draft';
  
  // Normalize input: trim, collapse whitespace, lowercase
  const normalized = state
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  
  // Look up canonical column key
  return STATE_LOOKUP.get(normalized) || 'Draft';
}

function safeString(value) {
  return value || '';
}

function buildKanbanData(snapshot) {
  const cards = [];
  const swimlanes = [];

  if (!snapshot || !snapshot.stories || snapshot.stories.length === 0) {
    return { cards: [], swimlanes: [] };
  }

  const sortedStories = [...snapshot.stories].sort((a, b) => {
    return a.key.localeCompare(b.key);
  });

  for (const story of sortedStories) {
    swimlanes.push({
      id: story.id,
      text: `${story.key}: ${story.title}`
    });

    const sortedTasks = [...story.tasks].sort((a, b) => {
      return a.key.localeCompare(b.key);
    });

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

  return { cards, swimlanes };
}

// Test with actual ServiceNow data structure
// Note: ServiceNow returns "Work in progress" (lowercase 'p')
const actualSnapshot = {
  sprint: {
    id: "2928d15bcfb23e10ac0b71164d851c23",
    name: "Autonomous Enterprise Sprint 1"
  },
  stories: [
    {
      id: "dc881d5bcfb23e10ac0b71164d851c89",
      key: "STRY0010003",
      title: "ChatGPT App ServiceNow Integration",
      state: "Draft",
      assigneeName: null,
      tasks: [
        {
          id: "6c6bdd5fcfb23e10ac0b71164d851cba",
          key: "STSK0011008",
          title: "Display Widget in ChatGPT",
          state: "Work in progress",  // ServiceNow's actual lowercase format
          assigneeName: "Demo Dev1"
        },
        {
          id: "da4b1d5fcfb23e10ac0b71164d851cac",
          key: "STSK0011007",
          title: "Configure MCP Server",
          state: "Draft",
          assigneeName: "Demo Dev1"
        },
        {
          id: "ea1b195fcfb23e10ac0b71164d851cca",
          key: "STSK0011004",
          title: "Build the Widget",
          state: "Draft",
          assigneeName: "Demo Dev1"
        }
      ]
    }
  ]
};

console.log('Testing buildKanbanData with actual ServiceNow data...\n');

const result = buildKanbanData(actualSnapshot);

console.log('Swimlanes:', result.swimlanes.length);
console.log(JSON.stringify(result.swimlanes, null, 2));

console.log('\nCards:', result.cards.length);
console.log(JSON.stringify(result.cards, null, 2));

console.log('\n✅ Adapter test complete!');
console.log(`Generated ${result.swimlanes.length} swimlane(s) and ${result.cards.length} card(s)`);

// Verify state normalization
console.log('\n🔍 State Normalization Check:');
const workInProgressCard = result.cards.find(c => c.Id === '6c6bdd5fcfb23e10ac0b71164d851cba');
if (workInProgressCard) {
  console.log(`  Input state: "Work in progress" (ServiceNow lowercase)`);
  console.log(`  Output Status: "${workInProgressCard.Status}"`);
  if (workInProgressCard.Status === 'Work in Progress') {
    console.log('  ✅ Correctly normalized to canonical column key!');
  } else {
    console.log('  ❌ ERROR: Should be "Work in Progress" but got "' + workInProgressCard.Status + '"');
  }
}
