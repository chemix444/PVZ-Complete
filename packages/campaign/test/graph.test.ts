import { describe, expect, it } from 'vitest';
import { CampaignGraph, grantReward, type CampaignNodeDef } from '@pvz/campaign';
import { CampaignRegistry } from '@pvz/content';
import { createProfile } from '@pvz/save';

const nodes: CampaignNodeDef[] = [
  { id: 'start', kind: 'start', era: 'pvz1', title: 'Start', requires: [], auto: true, rewards: [{ type: 'plant', id: 'peashooter' }] },
  { id: 'pvz1.a', kind: 'level', era: 'pvz1', title: 'A', level: 'a', requires: ['start'], rewards: [{ type: 'plant', id: 'sunflower' }] },
  { id: 'pvz1.b', kind: 'level', era: 'pvz1', title: 'B', level: 'b', requires: ['pvz1.a'], rewards: [{ type: 'feature', id: 'shovel' }] },
  { id: 'side.minigame', kind: 'minigame', era: 'pvz1', title: 'Mini', requires: ['pvz1.a'], side: true },
  { id: 'transition.time-travel', kind: 'transition', era: 'pvz2', title: 'Time travel', requires: ['pvz1.b'], auto: true, rewards: [{ type: 'feature', id: 'plant-food' }] },
  { id: 'pvz2.egypt.1', kind: 'level', era: 'pvz2', title: 'Egypt 1', level: 'e1', requires: ['transition.time-travel'], rewards: [{ type: 'plant', id: 'bonk-choy' }] },
];

describe('CampaignGraph', () => {
  it('completes the start node for a new profile and points Continue at the first level', () => {
    const graph = new CampaignGraph(nodes);
    const profile = createProfile('Tester', 1000);
    expect(graph.start(profile, 1000)).toEqual(['start']);
    expect(profile.plants.peashooter).toEqual({ source: 'start', acquiredAt: 1000 });
    expect(profile.campaign.current).toBe('pvz1.a');
    expect(graph.status(profile, 'pvz1.b')).toBe('locked');
  });

  it('grants rewards once and opens the next nodes', () => {
    const graph = new CampaignGraph(nodes);
    const profile = createProfile('Tester', 0);
    graph.start(profile, 0);
    const first = graph.complete(profile, 'pvz1.a', 10);
    expect(first.firstTime).toBe(true);
    expect(first.granted).toEqual([{ type: 'plant', id: 'sunflower' }]);
    expect(first.unlocked.sort()).toEqual(['pvz1.b', 'side.minigame']);
    expect(profile.campaign.current).toBe('pvz1.b');

    const again = graph.complete(profile, 'pvz1.a', 20);
    expect(again.firstTime).toBe(false);
    expect(again.granted).toEqual([]);
    expect(profile.campaign.completed['pvz1.a']).toEqual({ firstCompletedAt: 10, lastCompletedAt: 20, completions: 2 });
  });

  it('flows from the last PvZ 1 node through the transition into PvZ 2 on the same profile', () => {
    const graph = new CampaignGraph(nodes);
    const profile = createProfile('Tester', 0);
    graph.start(profile, 0);
    graph.complete(profile, 'pvz1.a', 1);
    const result = graph.complete(profile, 'pvz1.b', 2);
    expect(result.autoCompleted).toEqual(['transition.time-travel']);
    expect(profile.features).toEqual(['shovel', 'plant-food']);
    expect(profile.campaign.current).toBe('pvz2.egypt.1');
    expect(Object.keys(profile.plants)).toEqual(['peashooter', 'sunflower']);
  });

  it('never makes side content the Continue target', () => {
    const graph = new CampaignGraph(nodes);
    const profile = createProfile('Tester', 0);
    graph.start(profile, 0);
    graph.complete(profile, 'pvz1.a', 1);
    graph.complete(profile, 'pvz1.b', 2);
    graph.complete(profile, 'pvz2.egypt.1', 3);
    expect(graph.status(profile, 'side.minigame')).toBe('available');
    expect(profile.campaign.current).toBeNull();
  });

  it('lets developer tools unlock a node without its requirements', () => {
    const graph = new CampaignGraph(nodes);
    const profile = createProfile('Tester', 0);
    graph.start(profile, 0);
    graph.unlock(profile, 'pvz2.egypt.1');
    expect(graph.status(profile, 'pvz2.egypt.1')).toBe('available');
    expect(graph.status(profile, 'pvz1.b')).toBe('locked');
  });

  it('rejects broken graphs', () => {
    expect(() => new CampaignGraph([...nodes, nodes[1]])).toThrow(/duplicate/);
    expect(() => new CampaignGraph([{ ...nodes[0], requires: ['missing'] }])).toThrow(/unknown node/);
    expect(
      () =>
        new CampaignGraph([
          { id: 'x', kind: 'level', era: 'pvz1', title: 'x', requires: ['y'] },
          { id: 'y', kind: 'level', era: 'pvz1', title: 'y', requires: ['x'] },
        ]),
    ).toThrow(/cycle/);
  });

  it('does not grant a second copy of an owned plant', () => {
    const profile = createProfile('Tester', 0);
    expect(grantReward(profile, { type: 'plant', id: 'peashooter' }, 'a', 1)).toBe(true);
    expect(grantReward(profile, { type: 'plant', id: 'peashooter' }, 'b', 2)).toBe(false);
    expect(profile.plants.peashooter.source).toBe('a');
  });

  it('builds the shipped campaign: new profile owns Peashooter and continues at 1-1', () => {
    const graph = new CampaignGraph(CampaignRegistry.all());
    const profile = createProfile('Tester', 0);
    graph.start(profile, 0);
    expect(Object.keys(profile.plants)).toEqual(['peashooter']);
    expect(profile.campaign.current).toBe('pvz1.day.1');
    expect(graph.nodeForLevel('pvz1-day-01')?.id).toBe('pvz1.day.1');
    const result = graph.complete(profile, 'pvz1.day.1', 5);
    expect(result.granted).toEqual([{ type: 'plant', id: 'sunflower' }]);
  });
});
