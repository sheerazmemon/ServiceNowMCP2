/**
 * ServiceNow Agile Data Types
 */

// Raw ServiceNow response types
export interface ServiceNowResponse<T> {
  result: T[];
}

export interface RawSprint {
  sys_id: { value: string; display_value: string };
  short_description: { value: string; display_value: string };
  state: { value: string; display_value: string };
}

export interface RawStory {
  sys_id: { value: string; display_value: string };
  number: { value: string; display_value: string };
  short_description: { value: string; display_value: string };
  assigned_to: { value: string; display_value: string };
  state: { value: string; display_value: string };
}

export interface RawScrumTask {
  sys_id: { value: string; display_value: string };
  number: { value: string; display_value: string };
  short_description: { value: string; display_value: string };
  assigned_to: { value: string; display_value: string };
  state: { value: string; display_value: string };
  story: { value: string; display_value: string };
}

export interface RawUser {
  sys_id: { value: string; display_value: string };
  name: { value: string; display_value: string };
  user_name: { value: string; display_value: string };
}

// Clean aggregated types
export interface AgileTask {
  id: string;
  key: string;
  title: string;
  state: string;
  assigneeName: string | null;
}

export interface AgileStory {
  id: string;
  key: string;
  title: string;
  state: string;
  assigneeName: string | null;
  tasks: AgileTask[];
}

export interface AgileSprint {
  id: string;
  name: string;
}

export interface AgileSnapshot {
  sprint: AgileSprint | null;
  stories: AgileStory[];
}
