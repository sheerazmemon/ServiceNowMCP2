/**
 * Agile Snapshot Aggregation
 * Fetches and aggregates sprint, stories, tasks, and users into a clean data model
 */

import { ServiceNowClient } from './client';
import {
  RawSprint,
  RawStory,
  RawScrumTask,
  RawUser,
  AgileSnapshot,
  AgileStory,
  AgileTask,
  AgileSprint
} from './types';

export async function getAgileSnapshot(client: ServiceNowClient): Promise<AgileSnapshot> {
  console.log('[AgileSnapshot] Starting data fetch...');

  // Step 1: Fetch current sprint
  // Note: state=2 means "Current" in ServiceNow
  console.log('[AgileSnapshot] Fetching current sprint...');
  const sprintResponse = await client.query<RawSprint>('rm_sprint', {
    sysparm_query: 'state=2',
    sysparm_fields: 'sys_id,short_description,state',
    sysparm_limit: '1'
  });

  if (sprintResponse.result.length === 0) {
    console.log('[AgileSnapshot] No current sprint found');
    return {
      sprint: null,
      stories: []
    };
  }

  const rawSprint = sprintResponse.result[0];
  const sprintId = rawSprint.sys_id.value;
  const sprint: AgileSprint = {
    id: sprintId,
    name: rawSprint.short_description.display_value
  };

  console.log(`[AgileSnapshot] Found sprint: ${sprint.name} (${sprint.id})`);

  // Step 2: Fetch stories in this sprint
  console.log('[AgileSnapshot] Fetching stories...');
  const storyResponse = await client.query<RawStory>('rm_story', {
    sysparm_query: `sprint=${sprintId}`,
    sysparm_fields: 'sys_id,number,short_description,assigned_to,state'
  });

  const rawStories = storyResponse.result;
  console.log(`[AgileSnapshot] Found ${rawStories.length} stories`);

  if (rawStories.length === 0) {
    return {
      sprint,
      stories: []
    };
  }

  // Step 3: Fetch scrum tasks for these stories
  const storyIds = rawStories.map(s => s.sys_id.value);
  console.log('[AgileSnapshot] Fetching scrum tasks...');
  
  const taskResponse = await client.query<RawScrumTask>('rm_scrum_task', {
    sysparm_query: `storyIN${storyIds.join(',')}`,
    sysparm_fields: 'sys_id,number,short_description,assigned_to,state,story'
  });

  const rawTasks = taskResponse.result;
  console.log(`[AgileSnapshot] Found ${rawTasks.length} tasks`);

  // Step 4: Collect all unique user IDs
  const userIds = new Set<string>();
  
  rawStories.forEach(story => {
    if (story.assigned_to?.value) {
      userIds.add(story.assigned_to.value);
    }
  });
  
  rawTasks.forEach(task => {
    if (task.assigned_to?.value) {
      userIds.add(task.assigned_to.value);
    }
  });

  console.log(`[AgileSnapshot] Fetching ${userIds.size} unique users...`);

  // Fetch user display names
  const userMap = new Map<string, string>();
  
  if (userIds.size > 0) {
    const userIdsArray = Array.from(userIds);
    const userResponse = await client.query<RawUser>('sys_user', {
      sysparm_query: `sys_idIN${userIdsArray.join(',')}`,
      sysparm_fields: 'sys_id,name,user_name'
    });

    userResponse.result.forEach(user => {
      const userId = user.sys_id.value;
      const displayName = user.name?.display_value || user.user_name?.display_value || 'Unknown';
      userMap.set(userId, displayName);
    });

    console.log(`[AgileSnapshot] Resolved ${userMap.size} user names`);
  }

  // Step 5: Group tasks by story
  const tasksByStory = new Map<string, RawScrumTask[]>();
  rawTasks.forEach(task => {
    const storyId = task.story.value;
    if (!tasksByStory.has(storyId)) {
      tasksByStory.set(storyId, []);
    }
    tasksByStory.get(storyId)!.push(task);
  });

  // Step 6: Aggregate into clean model
  const stories: AgileStory[] = rawStories.map(rawStory => {
    const storyId = rawStory.sys_id.value;
    const assigneeId = rawStory.assigned_to?.value;
    
    const storyTasks = tasksByStory.get(storyId) || [];
    const tasks: AgileTask[] = storyTasks.map(rawTask => ({
      id: rawTask.sys_id.value,
      key: rawTask.number.display_value,
      title: rawTask.short_description.display_value,
      state: rawTask.state.display_value,
      assigneeName: rawTask.assigned_to?.value 
        ? (userMap.get(rawTask.assigned_to.value) || null)
        : null
    }));

    return {
      id: storyId,
      key: rawStory.number.display_value,
      title: rawStory.short_description.display_value,
      state: rawStory.state.display_value,
      assigneeName: assigneeId ? (userMap.get(assigneeId) || null) : null,
      tasks
    };
  });

  console.log('[AgileSnapshot] Aggregation complete');
  console.log(`[AgileSnapshot] Summary: ${stories.length} stories, ${rawTasks.length} tasks, ${userMap.size} users`);

  return {
    sprint,
    stories
  };
}
