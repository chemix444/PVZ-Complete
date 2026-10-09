import type { Era, RewardSpec } from '@pvz/engine';
import type { PlayerProfile } from '@pvz/save';

export type CampaignNodeKind =
  | 'start'
  | 'level'
  | 'world'
  | 'boss'
  | 'tutorial'
  | 'minigame'
  | 'unlock'
  | 'reward'
  | 'story'
  | 'shop'
  | 'side-mode'
  | 'transition';

export interface CampaignNodeDef {
  readonly id: string;
  readonly kind: CampaignNodeKind;
  readonly era: Era;
  readonly title: string;
  readonly world?: string;
  readonly level?: string;
  /** Nodes that must all be completed before this one opens. */
  readonly requires: readonly string[];
  readonly rewards?: readonly RewardSpec[];
  /** Completes itself as soon as it opens (start markers, unlock events). */
  readonly auto?: boolean;
  /** Side content is playable but never becomes the "Continue" target. */
  readonly side?: boolean;
}

export type NodeStatus = 'locked' | 'available' | 'completed';

export interface CompletionResult {
  readonly node: string;
  readonly firstTime: boolean;
  /** Rewards actually granted (already-owned plants are skipped). */
  readonly granted: RewardSpec[];
  /** Nodes that became available because of this completion. */
  readonly unlocked: string[];
  readonly autoCompleted: string[];
}

/**
 * The single campaign: PvZ 1 adventure, the time-travel transition and every
 * PvZ 2 world are nodes in one graph, evaluated against one profile.
 */
export class CampaignGraph {
  private readonly byId = new Map<string, CampaignNodeDef>();
  private readonly byLevel = new Map<string, CampaignNodeDef>();
  readonly order: readonly CampaignNodeDef[];

  constructor(nodes: readonly CampaignNodeDef[]) {
    this.order = nodes;
    for (const node of nodes) {
      if (this.byId.has(node.id)) throw new Error(`Campaign: duplicate node "${node.id}"`);
      this.byId.set(node.id, node);
      if (node.level) {
        if (this.byLevel.has(node.level)) throw new Error(`Campaign: level "${node.level}" used by two nodes`);
        this.byLevel.set(node.level, node);
      }
    }
    for (const node of nodes) {
      for (const req of node.requires) {
        if (!this.byId.has(req)) throw new Error(`Campaign: "${node.id}" requires unknown node "${req}"`);
      }
    }
    this.assertAcyclic();
  }

  node(id: string): CampaignNodeDef {
    const node = this.byId.get(id);
    if (!node) throw new Error(`Campaign: unknown node "${id}"`);
    return node;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  nodeForLevel(levelId: string): CampaignNodeDef | undefined {
    return this.byLevel.get(levelId);
  }

  isCompleted(profile: PlayerProfile, id: string): boolean {
    return profile.campaign.completed[id] !== undefined;
  }

  isUnlocked(profile: PlayerProfile, id: string): boolean {
    if (this.isCompleted(profile, id) || profile.campaign.unlocked.includes(id)) return true;
    return this.node(id).requires.every((req) => this.isCompleted(profile, req));
  }

  status(profile: PlayerProfile, id: string): NodeStatus {
    if (this.isCompleted(profile, id)) return 'completed';
    return this.isUnlocked(profile, id) ? 'available' : 'locked';
  }

  /** First open, unfinished mainline node in campaign order. */
  nextMainline(profile: PlayerProfile): CampaignNodeDef | null {
    for (const node of this.order) {
      if (node.side || node.auto) continue;
      if (this.status(profile, node.id) === 'available') return node;
    }
    return null;
  }

  /**
   * Brings a profile up to date with the current content: completes newly
   * reachable auto nodes and grants plants, features and notes that completed
   * nodes gained after the profile completed them.
   */
  start(profile: PlayerProfile, now: number): string[] {
    const completed = this.resolveAuto(profile, now);
    for (const node of this.order) {
      if (!this.isCompleted(profile, node.id)) continue;
      for (const reward of node.rewards ?? []) {
        if (reward.type === 'plant' || reward.type === 'feature' || reward.type === 'note') grantReward(profile, reward, node.id, now);
      }
    }
    profile.campaign.current = this.nextMainline(profile)?.id ?? null;
    return completed;
  }

  complete(profile: PlayerProfile, id: string, now: number): CompletionResult {
    const node = this.node(id);
    const before = this.availableIds(profile);
    const existing = profile.campaign.completed[id];
    const firstTime = existing === undefined;
    const granted: RewardSpec[] = [];
    if (firstTime) {
      profile.campaign.completed[id] = { firstCompletedAt: now, lastCompletedAt: now, completions: 1 };
      for (const reward of node.rewards ?? []) {
        if (grantReward(profile, reward, id, now)) granted.push(reward);
      }
    } else {
      existing.lastCompletedAt = now;
      existing.completions++;
    }
    const autoCompleted = this.resolveAuto(profile, now);
    profile.campaign.current = this.nextMainline(profile)?.id ?? null;
    profile.updatedAt = now;
    const after = this.availableIds(profile);
    const unlocked = [...after].filter((nodeId) => !before.has(nodeId));
    return { node: id, firstTime, granted, unlocked, autoCompleted };
  }

  /** Opens a node regardless of requirements (developer tools, special events). */
  unlock(profile: PlayerProfile, id: string): void {
    this.node(id);
    if (!profile.campaign.unlocked.includes(id)) profile.campaign.unlocked.push(id);
    if (profile.campaign.current === null) profile.campaign.current = this.nextMainline(profile)?.id ?? null;
  }

  private resolveAuto(profile: PlayerProfile, now: number): string[] {
    const done: string[] = [];
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const node of this.order) {
        if (!node.auto || this.isCompleted(profile, node.id) || !this.isUnlocked(profile, node.id)) continue;
        profile.campaign.completed[node.id] = { firstCompletedAt: now, lastCompletedAt: now, completions: 1 };
        for (const reward of node.rewards ?? []) grantReward(profile, reward, node.id, now);
        done.push(node.id);
        progressed = true;
      }
    }
    return done;
  }

  private availableIds(profile: PlayerProfile): Set<string> {
    const ids = new Set<string>();
    for (const node of this.order) {
      if (this.status(profile, node.id) === 'available') ids.add(node.id);
    }
    return ids;
  }

  private assertAcyclic(): void {
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (id: string, path: string[]) => {
      const mark = state.get(id);
      if (mark === 'done') return;
      if (mark === 'visiting') throw new Error(`Campaign: requirement cycle ${[...path, id].join(' -> ')}`);
      state.set(id, 'visiting');
      for (const req of this.node(id).requires) visit(req, [...path, id]);
      state.set(id, 'done');
    };
    for (const node of this.order) visit(node.id, []);
  }
}

/** Applies one reward; returns false when it changed nothing (plant already owned). */
export function grantReward(profile: PlayerProfile, reward: RewardSpec, source: string, now: number): boolean {
  switch (reward.type) {
    case 'plant':
      if (!reward.id || profile.plants[reward.id]) return false;
      profile.plants[reward.id] = { source, acquiredAt: now };
      return true;
    case 'feature':
      if (!reward.id || profile.features.includes(reward.id)) return false;
      profile.features.push(reward.id);
      return true;
    case 'currency':
      if (!reward.id) return false;
      profile.currencies[reward.id] = (profile.currencies[reward.id] ?? 0) + (reward.amount ?? 0);
      return true;
    case 'seed-slot':
      profile.seedSlots += reward.amount ?? 1;
      return true;
    case 'note':
      if (!reward.id || profile.campaign.notes.includes(reward.id)) return false;
      profile.campaign.notes.push(reward.id);
      return true;
  }
}

export function hasFeature(profile: PlayerProfile, feature: string): boolean {
  return profile.features.includes(feature);
}
