/**
 * MELO Header Component
 * 
 * Top branding bar with MELO logo, subtitle, and connection status.
 */

/**
 * @param {HTMLElement} container
 * @param {{ mode: string }} options
 */
export function renderHeader(container, { mode = 'mock' } = {}) {
  const el = document.createElement('header');
  el.className = 'melo-header';
  el.id = 'melo-header';
  el.innerHTML = `
    <div class="melo-header__scan-line"></div>
    <div class="melo-header__brand">
      <span class="melo-header__logo">MELO</span>
      <span class="melo-header__subtitle">Autonomous Intelligence</span>
    </div>
    <div class="melo-header__status">
      <span class="melo-header__status-dot ${mode === 'mock' ? 'melo-header__status-dot--mock' : ''}"></span>
      <span id="header-status-text">${mode === 'mock' ? 'DEMO MODE' : 'CONNECTED'}</span>
    </div>
  `;
  container.appendChild(el);
  return el;
}
