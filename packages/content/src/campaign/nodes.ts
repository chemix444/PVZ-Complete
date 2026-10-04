import type { CampaignNodeDef } from '@pvz/campaign';
import type { LevelDef } from '@pvz/engine';
import { pvz1Levels } from '../pvz1/levels';

const levels = new Map(pvz1Levels.map((level) => [level.id, level]));

function levelNode(id: string, levelId: string, requires: string[]): CampaignNodeDef {
  const level = levels.get(levelId) as LevelDef;
  return {
    id,
    kind: 'level',
    era: level.era,
    title: `Level ${level.label}`,
    world: level.world,
    level: levelId,
    requires,
    rewards: level.rewards,
  };
}

// Campaign order: PvZ 1 Day, Night, Pool, Fog, Roof, finale and postgame,
// then the time-travel transition into the PvZ 2 worlds. Only nodes whose
// content exists are listed; later milestones append to this graph.
export const campaignNodes: CampaignNodeDef[] = [
  {
    id: 'campaign.start',
    kind: 'start',
    era: 'pvz1',
    title: 'A new lawn',
    requires: [],
    auto: true,
    rewards: [{ type: 'plant', id: 'peashooter' }],
  },
  levelNode('pvz1.day.1', 'pvz1-day-01', ['campaign.start']),
];
