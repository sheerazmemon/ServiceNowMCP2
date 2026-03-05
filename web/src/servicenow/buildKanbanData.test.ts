/**
 * Test suite for buildKanbanData adapter
 * Run with: node --loader ts-node/esm buildKanbanData.test.ts
 * Or just verify logic manually
 */

import { buildKanbanData } from './buildKanbanData';

// Test 1: Empty snapshot
console.log('Test 1: Empty snapshot');
const emptyResult = buildKanbanData({ sprint: null, stories: [] });
console.assert(emptyResult.cards.length === 0, 'Should have no cards');
console.assert(emptyResult.swimlanes.length === 0, 'Should have no swimlanes');
console.log('✅ Passed\n');

// Test 2: Story with tasks
console.log('Test 2: Story with tasks');
const withTasksSnapshot = {
  sprint: { id: 'sprint1', name: 'Sprint 1' },
  stories: [
    {
      id: 'story1',
      key: 'STRY0010001',
      title: 'Test Story',
      state: 'Work in Progress',
      assigneeName: 'John Doe',
      tasks: [
        {
          id: 'task1',
          key: 'STSK0011001',
          title: 'Task 1',
          state: 'Draft',
          assigneeName: 'Jane Smith'
        },
        {
          id: 'task2',
          key: 'STSK0011002',
          title: 'Task 2',
          state: 'Complete',
          assigneeName: 'Bob Johnson'
        }
      ]
    }
  ]
};

const withTasksResult = buildKanbanData(withTasksSnapshot);
console.assert(withTasksResult.swimlanes.length === 1, 'Should have 1 swimlane');
console.assert(withTasksResult.cards.length === 2, 'Should have 2 cards');
console.assert(withTasksResult.cards[0].StoryId === 'story1', 'Card should reference story');
console.assert(withTasksResult.cards[0].IsPlaceholder === false, 'Card should not be placeholder');
console.log('✅ Passed\n');

// Test 3: Story with no tasks (placeholder)
console.log('Test 3: Story with no tasks (placeholder)');
const noTasksSnapshot = {
  sprint: { id: 'sprint1', name: 'Sprint 1' },
  stories: [
    {
      id: 'story2',
      key: 'STRY0010002',
      title: 'Empty Story',
      state: 'Draft',
      assigneeName: null,
      tasks: []
    }
  ]
};

const noTasksResult = buildKanbanData(noTasksSnapshot);
console.assert(noTasksResult.swimlanes.length === 1, 'Should have 1 swimlane');
console.assert(noTasksResult.cards.length === 1, 'Should have 1 placeholder card');
console.assert(noTasksResult.cards[0].Id === 'placeholder_story2', 'Should have correct placeholder ID');
console.assert(noTasksResult.cards[0].Title === '(No tasks)', 'Should have placeholder title');
console.assert(noTasksResult.cards[0].IsPlaceholder === true, 'Should be marked as placeholder');
console.assert(noTasksResult.cards[0].Status === 'Draft', 'Should inherit story state');
console.log('✅ Passed\n');

// Test 4: ServiceNow lowercase state normalization (BUGFIX)
console.log('Test 4: ServiceNow lowercase state normalization');
const lowercaseStateSnapshot = {
  sprint: { id: 'sprint1', name: 'Sprint 1' },
  stories: [
    {
      id: 'story3',
      key: 'STRY0010003',
      title: 'Story with ServiceNow state',
      state: 'Draft',
      assigneeName: null,
      tasks: [
        {
          id: 'task3',
          key: 'STSK0011003',
          title: 'Task with lowercase state',
          state: 'Work in progress',  // ServiceNow returns lowercase 'p'
          assigneeName: null
        }
      ]
    }
  ]
};

const lowercaseStateResult = buildKanbanData(lowercaseStateSnapshot);
console.assert(lowercaseStateResult.cards[0].Status === 'Work in Progress', 'ServiceNow "Work in progress" should map to "Work in Progress"');
console.log('  Input: "Work in progress" -> Output: "' + lowercaseStateResult.cards[0].Status + '"');
console.log('✅ Passed\n');

// Test 5: Invalid state normalization
console.log('Test 5: Invalid state normalization');
const invalidStateSnapshot = {
  sprint: { id: 'sprint1', name: 'Sprint 1' },
  stories: [
    {
      id: 'story4',
      key: 'STRY0010004',
      title: 'Story with invalid state',
      state: 'Unknown State',
      assigneeName: null,
      tasks: [
        {
          id: 'task4',
          key: 'STSK0011004',
          title: 'Task with invalid state',
          state: 'Invalid',
          assigneeName: null
        }
      ]
    }
  ]
};

const invalidStateResult = buildKanbanData(invalidStateSnapshot);
console.assert(invalidStateResult.cards[0].Status === 'Draft', 'Invalid state should default to Draft');
console.log('✅ Passed\n');

// Test 6: Null safety
console.log('Test 6: Null safety');
const nullSafetySnapshot = {
  sprint: { id: 'sprint1', name: 'Sprint 1' },
  stories: [
    {
      id: 'story5',
      key: 'STRY0010005',
      title: 'Story with nulls',
      state: null as any,
      assigneeName: null,
      tasks: [
        {
          id: 'task5',
          key: 'STSK0011005',
          title: 'Task with nulls',
          state: null as any,
          assigneeName: null
        }
      ]
    }
  ]
};

const nullSafetyResult = buildKanbanData(nullSafetySnapshot);
console.assert(nullSafetyResult.cards[0].Assignee === '', 'Null assignee should be empty string');
console.assert(nullSafetyResult.cards[0].Status === 'Draft', 'Null state should default to Draft');
console.log('✅ Passed\n');

// Test 7: Stable ordering
console.log('Test 7: Stable ordering');
const orderingSnapshot = {
  sprint: { id: 'sprint1', name: 'Sprint 1' },
  stories: [
    {
      id: 'story6',
      key: 'STRY0010006',
      title: 'Story B',
      state: 'Draft',
      assigneeName: null,
      tasks: [
        { id: 'task6', key: 'STSK0011006', title: 'Task C', state: 'Draft', assigneeName: null },
        { id: 'task5', key: 'STSK0011005', title: 'Task A', state: 'Draft', assigneeName: null },
        { id: 'task7', key: 'STSK0011007', title: 'Task B', state: 'Draft', assigneeName: null }
      ]
    },
    {
      id: 'story5',
      key: 'STRY0010005',
      title: 'Story A',
      state: 'Draft',
      assigneeName: null,
      tasks: []
    }
  ]
};

const orderingResult = buildKanbanData(orderingSnapshot);
console.assert(orderingResult.swimlanes[0].id === 'story5', 'Stories should be sorted by key');
console.assert(orderingResult.swimlanes[1].id === 'story6', 'Stories should be sorted by key');
console.assert(orderingResult.cards[1].Id === 'task5', 'Tasks should be sorted by key (STSK0011005)');
console.assert(orderingResult.cards[2].Id === 'task6', 'Tasks should be sorted by key (STSK0011006)');
console.assert(orderingResult.cards[3].Id === 'task7', 'Tasks should be sorted by key (STSK0011007)');
console.log('✅ Passed\n');

console.log('🎉 All tests passed!');
