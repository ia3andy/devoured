document.addEventListener('DOMContentLoaded', () => {

  const container = document.querySelector('.digest-articles');
  if (!container) return;

  // --- Migrate old localStorage format ---
  const oldPri = localStorage.getItem('digest-tag-priorities');
  if (oldPri) {
    try {
      const old = JSON.parse(oldPri);
      const hidden = Object.keys(old).filter(t => old[t] === 5);
      if (hidden.length > 0) localStorage.setItem('digest-hidden-tags', JSON.stringify(hidden));
    } catch (_) {}
    localStorage.removeItem('digest-tag-priorities');
    localStorage.removeItem('digest-unsorted-priority');
  }

  const threshold = parseInt(localStorage.getItem('digest-rating-threshold') || '4');
  const hiddenTags = JSON.parse(localStorage.getItem('digest-hidden-tags') || '[]');

  function resolveDisplayPriority(rating, tags) {
    if (tags.some(t => hiddenTags.includes(t))) return 5;
    if (rating >= threshold + 1) return 1;
    if (rating >= threshold)     return 2;
    if (rating >= threshold - 1) return 3;
    if (rating >= threshold - 2) return 4;
    return 5;
  }

  const articles = Array.from(container.querySelectorAll('.digest-article'));
  const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  for (const el of articles) {
    const tags = (el.dataset.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const rating = parseInt(el.dataset.rating || '3');
    const priority = resolveDisplayPriority(rating, tags);
    el.dataset.priority = priority;
    grouped[priority] = grouped[priority] || [];
    grouped[priority].push(el);
  }

  for (const el of articles) el.remove();

  for (const p of [1, 2]) {
    for (const el of grouped[p]) {
      if (p >= 2) {
        const details = el.querySelector('.digest-summary-details');
        if (details) details.removeAttribute('open');
      }
      container.appendChild(el);
    }
  }

  const otherNews = [...grouped[3], ...grouped[4]];
  if (otherNews.length > 0) {
    const card = document.createElement('div');
    card.className = 'digest-quick-links';

    const heading = document.createElement('h3');
    heading.className = 'digest-quick-links-title';
    heading.textContent = 'Other news';
    card.appendChild(heading);

    function createSpan(cls, text) {
      const s = document.createElement('span');
      s.className = cls;
      s.textContent = text;
      return s;
    }

    for (const el of otherNews) {
      const title = el.querySelector('.digest-article-title')?.textContent || '';
      const oneLiner = el.querySelector('.digest-summary-toggle')?.textContent?.trim() || '';
      const badge = el.querySelector('.digest-badge')?.textContent || '';
      const tags = (el.dataset.tags || '').split(',').map(t => t.trim()).filter(Boolean);

      const details = document.createElement('details');
      details.className = 'digest-quick-link-item';

      const summary = document.createElement('summary');

      const icon = document.createElement('span');
      icon.className = 'digest-deep-icon';
      icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      summary.appendChild(icon);

      const textWrap = document.createElement('span');
      textWrap.className = 'digest-quick-link-text';

      const header = document.createElement('span');
      header.className = 'digest-quick-link-header';
      header.appendChild(createSpan('digest-quick-link-title', title));
      header.appendChild(createSpan('digest-badge', badge));
      textWrap.appendChild(header);

      const meta = document.createElement('span');
      meta.className = 'digest-quick-link-meta';
      meta.appendChild(createSpan('digest-quick-link-desc', oneLiner));
      const tagsWrap = document.createElement('span');
      tagsWrap.className = 'digest-quick-link-tags';
      for (const t of tags) tagsWrap.appendChild(createSpan('digest-quick-link-tag', t));
      meta.appendChild(tagsWrap);
      textWrap.appendChild(meta);

      summary.appendChild(textWrap);
      details.appendChild(summary);

      el.classList.add('digest-quick-link-expanded');
      details.appendChild(el);

      card.appendChild(details);
    }
    container.appendChild(card);
  }

  container.dataset.ready = '';
});
