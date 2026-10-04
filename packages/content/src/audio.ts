import type { AudioDef } from './types';

// Every sound the game can request. The placeholder names a procedural
// generator in @pvz/audio; a supplied asset with the same id replaces it.
export const audioDefs: AudioDef[] = [
  { id: 'music.menu', channel: 'music', placeholder: 'music-menu', loop: true, volume: 0.7 },
  { id: 'music.choose-seeds', channel: 'music', placeholder: 'music-choose', loop: true, volume: 0.7 },
  { id: 'music.day', channel: 'music', placeholder: 'music-day', loop: true, volume: 0.6 },
  { id: 'audio.win', channel: 'sfx', placeholder: 'jingle-win' },
  { id: 'audio.lose', channel: 'sfx', placeholder: 'jingle-lose' },
  { id: 'audio.plant', channel: 'sfx', placeholder: 'plant', maxInstances: 3 },
  { id: 'audio.throw', channel: 'sfx', placeholder: 'throw', maxInstances: 6, volume: 0.6 },
  { id: 'audio.splat', channel: 'sfx', placeholder: 'splat', maxInstances: 6, volume: 0.7 },
  { id: 'audio.plastic-hit', channel: 'sfx', placeholder: 'plastic-hit', maxInstances: 4, volume: 0.6 },
  { id: 'audio.points', channel: 'sfx', placeholder: 'points', maxInstances: 4 },
  { id: 'audio.chomp', channel: 'sfx', placeholder: 'chomp', maxInstances: 4, volume: 0.6 },
  { id: 'audio.gulp', channel: 'sfx', placeholder: 'gulp', maxInstances: 2 },
  { id: 'audio.groan', channel: 'sfx', placeholder: 'groan', maxInstances: 2, volume: 0.5 },
  { id: 'audio.limbs-pop', channel: 'sfx', placeholder: 'pop', maxInstances: 4 },
  { id: 'audio.zombie-fall', channel: 'sfx', placeholder: 'thud', maxInstances: 3, volume: 0.6 },
  { id: 'audio.lawnmower', channel: 'sfx', placeholder: 'lawnmower', maxInstances: 2 },
  { id: 'audio.awooga', channel: 'sfx', placeholder: 'awooga' },
  { id: 'audio.siren', channel: 'sfx', placeholder: 'siren' },
  { id: 'audio.final-wave', channel: 'sfx', placeholder: 'final-wave' },
  { id: 'audio.ready-set-plant', channel: 'sfx', placeholder: 'ready' },
  { id: 'audio.reward', channel: 'sfx', placeholder: 'reward' },
  { id: 'audio.tap', channel: 'ui', placeholder: 'tap', maxInstances: 2 },
  { id: 'audio.seed-lift', channel: 'ui', placeholder: 'seed-lift', maxInstances: 2 },
  { id: 'audio.buzzer', channel: 'ui', placeholder: 'buzzer', maxInstances: 1 },
  { id: 'audio.pause', channel: 'ui', placeholder: 'pause', maxInstances: 1 },
];
