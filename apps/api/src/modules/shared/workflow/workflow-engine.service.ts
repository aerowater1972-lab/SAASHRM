import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowTransitionResult,
} from './workflow.interface';

/**
 * Lightweight approval state-machine (ADR-0001 Decision 3).
 *
 * Modules register a {@link WorkflowDefinition} keyed by a stable workflow key
 * (e.g. `expense`, `loan`, `resignation`). The engine is the single authority
 * on which transitions are legal from a given state, replacing the duplicated
 * inline `if (status !== X) throw` guards that previously lived in every
 * approval service. Side-effects (status persistence, events) remain the
 * responsibility of the calling module.
 */
@Injectable()
export class WorkflowEngineService {
  private readonly definitions = new Map<string, WorkflowDefinition>();

  register(def: WorkflowDefinition): void {
    this.definitions.set(def.key, def);
  }

  registerMany(defs: WorkflowDefinition[]): void {
    defs.forEach((d) => this.register(d));
  }

  hasDefinition(key: string): boolean {
    return this.definitions.has(key);
  }

  getDefinition(key: string): WorkflowDefinition {
    const def = this.definitions.get(key);
    if (!def) {
      throw new NotFoundException(`Workflow '${key}' is not registered`);
    }
    return def;
  }

  getAvailableActions(key: string, from: string): string[] {
    const def = this.getDefinition(key);
    return def.states[from]?.transitions.map((t) => t.action) ?? [];
  }

  canTransition(key: string, from: string, action: string): boolean {
    return this.getAvailableActions(key, from).includes(action);
  }

  /**
   * Validate and resolve a transition. Throws BadRequestException when the
   * (key, from, action) tuple is not a registered, legal transition.
   */
  transition(key: string, from: string, action: string): WorkflowTransitionResult {
    const def = this.getDefinition(key);
    const state = def.states[from];
    if (!state) {
      throw new BadRequestException(`Workflow '${key}' has no state '${from}'`);
    }
    const match = state.transitions.find((t) => t.action === action);
    if (!match) {
      const allowed = this.getAvailableActions(key, from).join(', ') || 'none';
      throw new BadRequestException(
        `Invalid transition '${action}' from '${from}' in workflow '${key}'. Allowed: [${allowed}]`,
      );
    }
    return { from, action, to: match.to };
  }
}
