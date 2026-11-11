/* icons.js — the inline SVG icons (one colour = currentColor, no CDN, no letters) → CP.icons (ui.js hands them out as ICON).
   16px for buttons and tables · 20px for the side menu and the top bar (the KOL Management set, CR-04 §4.1). */
CP.icons = (function () {
  'use strict';
  const s16 = d => `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${d}</svg>`;
  const s20 = d => `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${d}</svg>`;
  return {
    calendar: s16('<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/>'),
    table: s16('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6h12M2 9.5h12M6 6v7.5"/>'),
    chart: s16('<path d="M3 13.5V8M6.5 13.5V4M10 13.5V7M13.5 13.5V2.5"/>'),
    download: s16('<path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2.5 13.5h11"/>'),
    chevron: s16('<path d="M6 4l4 4-4 4"/>'),
    chevronDown: s16('<path d="M4 6l4 4 4-4"/>'),
    prev: s16('<path d="M10 3.5 5.5 8l4.5 4.5"/>'),
    next: s16('<path d="M6 3.5 10.5 8 6 12.5"/>'),
    close: s16('<path d="M4 4l8 8M12 4l-8 8"/>'),
    pencil: s16('<path d="M10.5 2.5l3 3L6 13H3v-3z"/>'),
    search: s16('<circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14"/>'),
    sun: s20('<circle cx="10" cy="10" r="3.2"/><path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M4.5 15.5l1.1-1.1M14.4 5.6l1.1-1.1"/>'),
    moon: s20('<path d="M16.2 12.4A6.6 6.6 0 0 1 7.6 3.8a6.6 6.6 0 1 0 8.6 8.6z"/>'),
    /* CR-12 §3 — System theme (a screen — not the menu's monitor gauge) · Display (the language + theme on a phone: sliders) */
    system: s20('<rect x="2.5" y="3.5" width="15" height="10" rx="1.5"/><path d="M7 17h6M10 13.5V17"/>'),
    display: s20('<path d="M3 6h8M15 6h2M3 14h2M9 14h8"/><circle cx="13" cy="6" r="2"/><circle cx="7" cy="14" r="2"/>'),
    menu: s20('<path d="M3 5.5h14M3 10h14M3 14.5h14"/>'),
    /* CR-03 — + New · ⋯ · copy */
    plus: s16('<path d="M8 3v10M3 8h10"/>'),
    /* CR-11 — View plan (a page with lines) on the Campaign Tracking toolbar */
    plan: s16('<rect x="3.5" y="2" width="9" height="12" rx="1.5"/><path d="M6 5.5h4M6 8h4M6 10.5h2.5"/>'),
    more: s16('<circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>'),
    copy: s16('<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5V3a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5"/>'),
    /* the panel with its edge and an arrow: fold the menu (‹) · open it (› — the same icon turned round by CSS) */
    collapse: s20('<rect x="3" y="3.5" width="14" height="13" rx="2.5"/><path d="M7.5 3.5v13M13 8.2 11.2 10l1.8 1.8"/>'),
    /* the app: a rounded square in the KOL blue → violet, its glyph a rising chart (KOL has a person) */
    logo: '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id="cpLogo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f6df6"/><stop offset=".55" stop-color="#5b4bf0"/><stop offset="1" stop-color="#9b3df2"/></linearGradient></defs>' +
      '<rect width="32" height="32" rx="8" fill="url(#cpLogo)"/><path d="M8.5 23.5h15" stroke="#fff" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
      '<rect x="9.5" y="16.5" width="3.2" height="5.5" rx=".8" fill="#fff" fill-opacity=".75"/><rect x="14.4" y="13" width="3.2" height="9" rx=".8" fill="#fff" fill-opacity=".85"/><rect x="19.3" y="9.5" width="3.2" height="12.5" rx=".8" fill="#fff"/>' +
      '<path d="M9 14.2 14.3 10.6l3.6 1.6 5.6-4.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    /* side menu (outline 20px) */
    nav: {
      dashboard: s20('<rect x="3" y="3" width="6" height="7" rx="1.5"/><rect x="11" y="3" width="6" height="4" rx="1.5"/><rect x="11" y="9" width="6" height="8" rx="1.5"/><rect x="3" y="12" width="6" height="5" rx="1.5"/>'),
      campaign: s20('<path d="M4.5 17.5V3M4.5 3.5h10.5l-2.2 3.6 2.2 3.6H4.5"/>'),
      campaigns: s20('<rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M6.5 7.5h7M6.5 10.5h7M6.5 13.5h4"/>'),
      /* CR-06 — Product Master (a box) · Timeline (bars on a calendar) · Operations (a checklist) */
      products: s20('<path d="M10 2.8 16.5 6v8L10 17.2 3.5 14V6z"/><path d="M3.5 6 10 9.2 16.5 6M10 9.2v8"/>'),
    /* CR-15 §10 — Settings (a gear) */
    settings: s20('<circle cx="10" cy="10" r="2.6"/><path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7"/><circle cx="10" cy="10" r="5.4"/>'),
      timeline: s20('<path d="M3 3.5v13h14"/><path d="M6 7h6M8.5 10.5h6.5M6.5 14h4"/>'),
      operations: s20('<rect x="3.5" y="3" width="13" height="14" rx="2"/><path d="M6.5 7.5l1.2 1.2L10 6.5M6.5 12l1.2 1.2L10 11M12 7.8h2M12 12.3h2"/>'),
      plus: s20('<circle cx="10" cy="10" r="7"/><path d="M10 6.5v7M6.5 10h7"/>'),
      sales: s20('<path d="M3 17h14"/><path d="M5 14V10M9 14V7M13 14V9M17 14V4"/><path d="M4 8.5 8.5 5l3.5 2.5L16.5 3"/>'),
      waterfall: s20('<path d="M3 17h14"/><rect x="3.5" y="4" width="3" height="10"/><rect x="8.5" y="4" width="3" height="4"/><rect x="13.5" y="8" width="3" height="6"/>'),
      /* CR-07 — Campaign Monitor (a gauge) · Campaign Planning (a clipboard with steps) · My tasks (a check in a box) */
      monitor: s20('<path d="M3.5 13.5a6.5 6.5 0 0 1 13 0"/><path d="M10 13.5 13 8.5"/><circle cx="10" cy="13.5" r="1.2"/><path d="M3 16.5h14"/>'),
      planning: s20('<rect x="4" y="3.5" width="12" height="14" rx="2"/><path d="M7.5 2.5h5v2.2h-5z"/><path d="M7 9l1 1 2-2M7 13.5l1 1 2-2M11.5 9.5h2.5M11.5 14h2.5"/>'),
      tasks: s20('<rect x="3.5" y="3.5" width="13" height="13" rx="2.5"/><path d="M7 10.2l2.1 2.1L13.5 8"/>'),
      expenses: s20('<path d="M5 2.5h10v15l-2-1.3-1.7 1.3L10 16.2l-1.3 1.3L7 16.2 5 17.5z"/><path d="M7.5 6.5h5M7.5 9.5h5M7.5 12.5h3"/>'),
    },
  };
})();
