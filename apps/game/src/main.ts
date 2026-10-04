import '@pvz/ui/styles.css';
import '@pvz/tools/dev.css';
import './game.css';
import { Game } from './game';

const host = document.getElementById('app')!;
const loading = document.createElement('div');
loading.className = 'loading';
loading.textContent = 'Loading PVZ Complete...';
host.append(loading);

Game.boot(host)
  .then((game) => {
    loading.remove();
    (window as unknown as { pvz: Game }).pvz = game;
  })
  .catch((error: unknown) => {
    loading.textContent = `Failed to start: ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  });
