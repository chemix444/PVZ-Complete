import { button, h, panel, slider, toggle, type Screen } from '@pvz/ui';
import { exportProfile, importProfile } from '@pvz/save';
import { requireProfile, type GameContext } from '../context';

export class SettingsScreen implements Screen {
  constructor(private readonly ctx: GameContext) {}

  mount(root: HTMLElement): void {
    const ctx = this.ctx;
    const profile = requireProfile(ctx);
    const settings = profile.settings;
    const save = () => {
      ctx.applySettings();
      void ctx.saveProfile();
    };
    const fileInput = h('input', { type: 'file', accept: 'application/json', style: 'display:none' });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const imported = importProfile(await file.text());
      if (!confirm(`Replace ${profile.name}'s progress with the imported profile "${imported.name}"?`)) return;
      imported.id = profile.id;
      ctx.profile = imported;
      ctx.campaign.start(imported, Date.now());
      await ctx.saveProfile();
      ctx.applySettings();
      ctx.nav.settings();
    });

    root.append(
      h(
        'div',
        { class: 'screen' },
        h('div', { class: 'back' }, button('Back', () => ctx.nav.menu(), 'secondary')),
        h('h1', null, 'Settings'),
        h(
          'div',
          { class: 'settings' },
          panel(
            null,
            slider('Music', settings.musicVolume, (v) => {
              settings.musicVolume = v;
              save();
            }),
            slider('Sound', settings.sfxVolume, (v) => {
              settings.sfxVolume = v;
              save();
            }),
            toggle('Show FPS', settings.showFps, (v) => {
              settings.showFps = v;
              save();
            }),
            toggle('Developer tools button in menus', settings.devTools, (v) => {
              settings.devTools = v;
              save();
            }),
            h(
              'div',
              { class: 'row' },
              button('Export profile', () => download(`${profile.name}.pvzc.json`, exportProfile(profile)), 'secondary'),
              button('Import profile', () => fileInput.click(), 'secondary'),
              fileInput,
            ),
          ),
        ),
      ),
    );
  }

  unmount(): void {}

  onKey(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      this.ctx.nav.menu();
      return true;
    }
    return false;
  }
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
