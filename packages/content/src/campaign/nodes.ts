import type { CampaignNodeDef } from '@pvz/campaign';
import type { LevelDef } from '@pvz/engine';
import { pvz1Levels } from '../pvz1/levels';

const levels = new Map(pvz1Levels.map((level) => [level.id, level]));

function levelNode(id: string, levelId: string, requires: string[]): CampaignNodeDef {
  const level = levels.get(levelId) as LevelDef;
  return {
    id,
    kind: level.conveyor && level.plantableCols ? 'minigame' : 'level',
    era: level.era,
    title: `Level ${level.label}${level.name === 'Day' || level.name === 'Night' ? '' : `: ${level.name}`}`,
    world: level.world,
    level: levelId,
    requires,
    rewards: level.rewards,
  };
}

/** Ten nodes in a row, each requiring the one before. */
function area(prefix: string, levelPrefix: string, first: string): CampaignNodeDef[] {
  const nodes: CampaignNodeDef[] = [];
  for (let i = 1; i <= 10; i++) {
    const previous = i === 1 ? first : `${prefix}.${i - 1}`;
    nodes.push(levelNode(`${prefix}.${i}`, `${levelPrefix}-${String(i).padStart(2, '0')}`, [previous]));
  }
  return nodes;
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
  ...area('pvz1.day', 'pvz1-day', 'campaign.start'),
  ...area('pvz1.night', 'pvz1-night', 'pvz1.day.10'),
];
