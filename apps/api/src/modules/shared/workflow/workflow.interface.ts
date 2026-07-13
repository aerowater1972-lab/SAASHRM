export interface WorkflowTransition {
  action: string;
  to: string;
  description?: string;
}

export interface WorkflowState {
  transitions: WorkflowTransition[];
}

export interface WorkflowDefinition {
  key: string;
  description?: string;
  initialState: string;
  states: Record<string, WorkflowState>;
}

export interface WorkflowTransitionResult {
  from: string;
  to: string;
  action: string;
}
