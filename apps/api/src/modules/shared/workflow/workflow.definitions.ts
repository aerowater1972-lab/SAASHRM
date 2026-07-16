import { WorkflowDefinition } from './workflow.interface';

/**
 * Approval workflow definitions for every bounded context that owns an
 * approval/state lifecycle. States use each module's canonical status enum
 * value so the engine can be called directly with a record's `status` field.
 *
 * Logical states that do not exist as a stored enum value (e.g. benefit
 * enrollment's `PENDING`, onboarding's lifecycle) are modeled with stable
 * string states and mapped by the owning module.
 */
export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    key: 'expense',
    description: 'Expense claim approval lifecycle',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'REJECT', to: 'REJECTED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      APPROVED: { transitions: [{ action: 'PAY', to: 'PAID' }] },
      REJECTED: { transitions: [] },
      CANCELLED: { transitions: [] },
      PAID: { transitions: [] },
    },
  },
  {
    key: 'loan',
    description: 'Loan request approval lifecycle',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'REJECT', to: 'REJECTED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      APPROVED: { transitions: [{ action: 'CANCEL', to: 'CANCELLED' }] },
      REJECTED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'resignation',
    description: 'Resignation request approval lifecycle',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'REJECT', to: 'REJECTED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      APPROVED: {
        transitions: [
          { action: 'OFFBOARD', to: 'CANCELLED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      REJECTED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'leave',
    description: 'Leave request approval lifecycle',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'REJECT', to: 'REJECTED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      APPROVED: { transitions: [] },
      REJECTED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'performance-review',
    description: 'Performance review lifecycle',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'START', to: 'IN_PROGRESS' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      IN_PROGRESS: {
        transitions: [
          { action: 'COMPLETE', to: 'COMPLETED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      COMPLETED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'performance-goal',
    description: 'Performance goal lifecycle',
    initialState: 'NOT_STARTED',
    states: {
      NOT_STARTED: {
        transitions: [
          { action: 'START', to: 'IN_PROGRESS' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      IN_PROGRESS: {
        transitions: [
          { action: 'ACHIEVE', to: 'ACHIEVED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      ACHIEVED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'payroll-run',
    description: 'Payroll run lifecycle',
    initialState: 'DRAFT',
    states: {
      DRAFT: {
        transitions: [
          { action: 'RUN', to: 'PROCESSING' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      PROCESSING: { transitions: [{ action: 'COMPLETE', to: 'COMPLETED' }] },
      COMPLETED: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      APPROVED: { transitions: [{ action: 'LOCK', to: 'LOCKED' }] },
      LOCKED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'training',
    description: 'Training program lifecycle',
    initialState: 'PLANNED',
    states: {
      PLANNED: {
        transitions: [
          { action: 'START', to: 'IN_PROGRESS' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      IN_PROGRESS: {
        transitions: [
          { action: 'COMPLETE', to: 'COMPLETED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      COMPLETED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'benefit-enrollment',
    description: 'Employee benefit enrollment lifecycle (logical PENDING)',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'ACTIVE' },
          { action: 'REJECT', to: 'CANCELLED' },
        ],
      },
      ACTIVE: {
        transitions: [
          { action: 'EXPIRE', to: 'EXPIRED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      REJECTED: { transitions: [] },
      EXPIRED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'onboarding',
    description: 'Employee onboarding lifecycle',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'START', to: 'IN_PROGRESS' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      IN_PROGRESS: {
        transitions: [
          { action: 'COMPLETE', to: 'COMPLETED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      COMPLETED: { transitions: [] },
      CANCELLED: { transitions: [] },
    },
  },
  {
    key: 'overtime',
    description: 'Overtime request approval lifecycle (pre-approval SPL)',
    initialState: 'PENDING',
    states: {
      PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'REJECT', to: 'REJECTED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
      APPROVED: { transitions: [] },
      REJECTED: { transitions: [] },
      CANCELLED: { transitions: [] },
      RETROACTIVE_PENDING: {
        transitions: [
          { action: 'APPROVE', to: 'APPROVED' },
          { action: 'REJECT', to: 'REJECTED' },
          { action: 'CANCEL', to: 'CANCELLED' },
        ],
      },
    },
  },
];
