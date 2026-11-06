// dopa — stroke icons (24×24). Filled variants use fill="currentColor".
const P = {
  home: 'M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z',
  search: 'M10.8 4a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM20 20l-4.3-4.3',
  spark: 'M12 2.8l2 6.2 6.2 2-6.2 2-2 6.2-2-6.2-6.2-2 6.2-2zM19 3v3M17.5 4.5h3',
  bag: 'M5.5 8h13l-1 12.5h-11zM9 8V6.5a3 3 0 0 1 6 0V8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  heart: 'M12 20.2s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6c0 5.8-7.5 10.4-7.5 10.4z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  down: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  truck: 'M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7M6.5 18.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM17 18.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 7.5l3 4.2 3-4.2M12 11.7v5M9.3 12.6h5.4M9.3 14.8h5.4',
  ticket: 'M3.5 7h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4zM14.5 7v10',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13',
  box: 'M3.5 7.5 12 3.5l8.5 4L12 11.5zM3.5 7.5v9l8.5 4 8.5-4v-9M12 11.5v9',
  gift: 'M4 10.5h16V20H4zM3 7h18v3.5H3zM12 7v13M12 7C10 3.5 6.5 4 7.2 6.1 7.8 7.5 12 7 12 7zM12 7c2-3.5 5.5-3 4.8-.9C16.2 7.5 12 7 12 7z',
  sound: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  vibrate: 'M8.5 4h7v16h-7zM4.5 8.5v7M19.5 8.5v7',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  crown: 'M3.5 8.5l4.2 4L12 6l4.3 6.5 4.2-4-1.8 10H5.3z',
  gem: 'M6.5 4h11l3.5 5.2L12 20.5 3 9.2zM3 9.2h18M9.5 4 8 9.2l4 11.3 4-11.3L14.5 4',
  star: 'M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 17l-5.4 3 1.2-6-4.5-4.2 6.1-.7z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 5.5H4.5a3.5 3.5 0 0 0 3.8 4M16 5.5h3.5a3.5 3.5 0 0 1-3.8 4M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z',
  medal: 'M8 3.5h3l1 4M16 3.5h-3l-1 4M12 9a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12 12l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5L11 14z',
  repeat: 'M17 3.5l3 3-3 3M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5l-3-3 3-3M20 12.5v1a4 4 0 0 1-4 4H4',
  flash: 'M13 2.5 5 13.5h6l-1 8 8-11h-6z',
  rotate: 'M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6M17.5 3v3.6h-3.6M6.5 21v-3.6h3.6',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5.5M12 7.8v.1',
  sort: 'M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5',
};
const FILLED = new Set(['star', 'heart-f']);
export function ic(name, size = 22, cls = '') {
  if (name === 'star-f') return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P.star}" fill="currentColor"/></svg>`;
  if (name === 'heart-f') return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P.heart}" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const d = P[name] || P.info;
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
export const _filled = FILLED;
