import { h } from './dom';

export function button(label: string, onClick: () => void, variant: 'primary' | 'secondary' | 'danger' = 'primary'): HTMLButtonElement {
  return h('button', { class: `pvz-btn pvz-btn-${variant}`, onclick: onClick, type: 'button' }, label);
}

export function panel(title: string | null, ...children: (Node | string | null)[]): HTMLElement {
  return h('section', { class: 'pvz-panel' }, title ? h('h2', { class: 'pvz-panel-title' }, title) : null, ...children);
}

export function slider(label: string, value: number, onChange: (value: number) => void): HTMLElement {
  const output = h('span', { class: 'pvz-slider-value' }, `${Math.round(value * 100)}%`);
  const input = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)) });
  input.addEventListener('input', () => {
    const next = Number(input.value) / 100;
    output.textContent = `${input.value}%`;
    onChange(next);
  });
  return h('label', { class: 'pvz-slider' }, h('span', null, label), input, output);
}

export function toggle(label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox', checked: value });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'pvz-toggle' }, input, h('span', null, label));
}

/** Centered modal over the game area. Returns a function that closes it. */
export function modal(root: HTMLElement, content: HTMLElement, onBackdrop?: () => void): () => void {
  const backdrop = h('div', { class: 'pvz-modal-backdrop' }, h('div', { class: 'pvz-modal' }, content));
  if (onBackdrop) {
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) onBackdrop();
    });
  }
  root.append(backdrop);
  return () => backdrop.remove();
}
