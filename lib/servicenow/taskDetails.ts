/**
 * Task Details Aggregator
 * 
 * Fetches and aggregates detailed task information from ServiceNow.
 * 
 * This module provides a single function to retrieve all task details:
 * - Basic task fields
 * - Assignee information
 * - Parent story
 * - Labels/tags
 * - Attachments
 * - Activity history
 * 
 * Phase 4: Real ServiceNow integration
 */

import type { TaskDetails } from './taskDetailsTypes';
import type { ServiceNowClient } from './client';

/**
 * Fetches detailed information about a single task.
 * 
 * @param client - ServiceNow client instance
 * @param input - Object containing either taskId (sys_id) or taskKey (task number)
 * @param input.taskId - Task sys_id (e.g., "6c6bdd5fcfb23e10ac0b71164d851cba")
 * @param input.taskKey - Task number (e.g., "STSK0011008")
 * @returns Promise resolving to TaskDetails
 * @throws Error if neither or both taskId and taskKey are provided
 * @throws Error if task is not found
 * 
 * @example
 * // Fetch by sys_id
 * const task = await getTaskDetails(client, { taskId: "6c6bdd5fcfb23e10ac0b71164d851cba" });
 * 
 * @example
 * // Fetch by task number
 * const task = await getTaskDetails(client, { taskKey: "STSK0011008" });
 */
export async function getTaskDetails(
  client: ServiceNowClient,
  input: {
    taskId?: string;
    taskKey?: string;
  }
): Promise<TaskDetails> {
  const { taskId, taskKey } = input;

  // Validate input: must provide exactly one identifier
  if (!taskId && !taskKey) {
    throw new Error('Must provide either taskId or taskKey');
  }

  if (taskId && taskKey) {
    throw new Error('Must provide only one of taskId or taskKey, not both');
  }

  const identifier = taskKey || taskId;
  const identifierType = taskKey ? 'taskKey' : 'taskId';
  console.log(`[getTaskDetails] Fetching task by ${identifierType}: ${identifier}`);

  // Step 1: Resolve task sys_id if taskKey provided
  let resolvedTaskId = taskId;
  
  if (!resolvedTaskId && taskKey) {
    console.log(`[getTaskDetails] Looking up sys_id for task key: ${taskKey}`);
    
    const lookupResponse = await client.query<{ sys_id: { value: string } }>(
      'rm_scrum_task',
      {
        sysparm_query: `number=${taskKey}`,
        sysparm_fields: 'sys_id',
        sysparm_limit: '1'
      }
    );

    if (!lookupResponse.result || lookupResponse.result.length === 0) {
      throw new Error(`Task not found for key: ${taskKey}`);
    }

    resolvedTaskId = lookupResponse.result[0].sys_id.value;
    console.log(`[getTaskDetails] Resolved ${taskKey} to sys_id: ${resolvedTaskId}`);
  }

  // Step 2: Fetch main task record
  console.log(`[getTaskDetails] Fetching task record: ${resolvedTaskId}`);
  
  const taskResponse = await client.query<any>('rm_scrum_task', {
    sysparm_query: `sys_id=${resolvedTaskId}`,
    sysparm_fields: 'sys_id,number,short_description,description,state,assigned_to,story,sys_tags,sys_created_on',
    sysparm_limit: '1'
  });

  if (!taskResponse.result || taskResponse.result.length === 0) {
    throw new Error(`Task not found: ${resolvedTaskId}`);
  }

  const taskRecord = taskResponse.result[0];
  console.log(`[getTaskDetails] Found task: ${taskRecord.number?.display_value || taskRecord.number?.value}`);

  // Step 3: Fetch attachments
  console.log(`[getTaskDetails] Fetching attachments for task: ${resolvedTaskId}`);
  
  let attachments: TaskDetails['attachments'] = [];
  
  try {
    const attachmentResponse = await client.query<any>('sys_attachment', {
      sysparm_query: `table_name=rm_scrum_task^table_sys_id=${resolvedTaskId}`,
      sysparm_fields: 'sys_id,file_name,content_type,size_bytes,download_link'
    });

    attachments = (attachmentResponse.result || []).map((att: any) => ({
      id: att.sys_id?.value || att.sys_id || '',
      fileName: att.file_name?.display_value || att.file_name?.value || att.file_name || 'unknown',
      contentType: att.content_type?.display_value || att.content_type?.value || att.content_type || null,
      sizeBytes: att.size_bytes?.value ? parseInt(att.size_bytes.value, 10) : null,
      downloadUrl: att.download_link?.display_value || att.download_link?.value || att.download_link || null
    }));

    console.log(`[getTaskDetails] Found ${attachments.length} attachments`);
  } catch (error: any) {
    console.warn(`[getTaskDetails] Failed to fetch attachments: ${error.message}`);
    // Continue with empty attachments array
  }

  // Step 4: Fetch journal entries (comments and work notes)
  console.log(`[getTaskDetails] Fetching journal entries for task: ${resolvedTaskId}`);
  
  let journalActivity: TaskDetails['activity'] = [];
  
  try {
    const journalResponse = await client.query<any>('sys_journal_field', {
      sysparm_query: `element_id=${resolvedTaskId}^ORDERBYDESCsys_created_on`,
      sysparm_fields: 'sys_id,element,value,sys_created_by,sys_created_on'
    });

    journalActivity = (journalResponse.result || []).map((journal: any) => {
      const element = journal.element?.value || journal.element || '';
      const isWorkNote = element === 'work_notes';
      const isComment = element === 'comments';
      
      return {
        id: journal.sys_id?.value || journal.sys_id || '',
        type: (isWorkNote ? 'work_note' : isComment ? 'comment' : 'system') as any,
        author: journal.sys_created_by?.display_value || journal.sys_created_by?.value || journal.sys_created_by || null,
        timestamp: journal.sys_created_on?.value || journal.sys_created_on || new Date().toISOString(),
        text: journal.value?.value || journal.value || ''
      };
    }).filter((activity: any) => activity.type === 'comment' || activity.type === 'work_note');

    console.log(`[getTaskDetails] Found ${journalActivity.length} journal entries`);
  } catch (error: any) {
    console.warn(`[getTaskDetails] Failed to fetch journal entries: ${error.message}`);
    // Continue with empty journal array
  }

  // Step 5: Fetch audit records (field changes)
  console.log(`[getTaskDetails] Fetching audit records for task: ${resolvedTaskId}`);
  
  let auditActivity: TaskDetails['activity'] = [];
  
  try {
    const auditResponse = await client.query<any>('sys_audit', {
      sysparm_query: `documentkey=${resolvedTaskId}^tablename=rm_scrum_task^ORDERBYDESCsys_created_on`,
      sysparm_fields: 'sys_id,fieldname,oldvalue,newvalue,user,sys_created_on',
      sysparm_limit: '50'
    });

    auditActivity = (auditResponse.result || []).map((audit: any) => ({
      id: audit.sys_id?.value || audit.sys_id || '',
      type: 'field_change' as const,
      author: audit.user?.display_value || audit.user?.value || audit.user || null,
      timestamp: audit.sys_created_on?.value || audit.sys_created_on || new Date().toISOString(),
      field: audit.fieldname?.value || audit.fieldname || '',
      from: audit.oldvalue?.display_value || audit.oldvalue?.value || audit.oldvalue || null,
      to: audit.newvalue?.display_value || audit.newvalue?.value || audit.newvalue || null
    }));

    console.log(`[getTaskDetails] Found ${auditActivity.length} audit records`);
  } catch (error: any) {
    console.warn(`[getTaskDetails] Failed to fetch audit records: ${error.message}`);
    // Continue with empty audit array
  }

  // Step 6: Merge and sort all activity
  const allActivity = [...journalActivity, ...auditActivity];
  allActivity.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // DESC order (newest first)
  });

  console.log(`[getTaskDetails] Total activity events: ${allActivity.length}`);

  // Step 7: Build normalized TaskDetails object
  const taskDetails: TaskDetails = {
    // Core identifiers
    id: taskRecord.sys_id?.value || taskRecord.sys_id || resolvedTaskId!,
    key: taskRecord.number?.display_value || taskRecord.number?.value || taskRecord.number || '',

    // Basic fields
    title: taskRecord.short_description?.display_value || taskRecord.short_description?.value || taskRecord.short_description || '',
    description: taskRecord.description?.display_value || taskRecord.description?.value || taskRecord.description || null,
    state: taskRecord.state?.display_value || taskRecord.state?.value || taskRecord.state || 'Draft',

    // Relationships
    assignee: taskRecord.assigned_to?.value ? {
      id: taskRecord.assigned_to.value,
      name: taskRecord.assigned_to.display_value || 'Unknown'
    } : null,

    story: taskRecord.story?.value ? {
      id: taskRecord.story.value,
      key: taskRecord.story.display_value || '',
      title: taskRecord.story.display_value || ''
    } : null,

    // Metadata
    labels: taskRecord.sys_tags?.value ? taskRecord.sys_tags.value.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],

    // Attachments
    attachments,

    // Activity history
    activity: allActivity
  };

  console.log(`[getTaskDetails] Successfully built TaskDetails for ${taskDetails.key}`);

  return taskDetails;
}
