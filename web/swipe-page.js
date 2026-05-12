document.addEventListener('DOMContentLoaded', () => {

  var root = document.querySelector('.swipe-page-root');
  if (!root) return;

  var postDate = root.dataset.postDate;
  var track = root.querySelector('.swipe-track');

  // --- Priority filtering ---

  var threshold = parseInt(localStorage.getItem('digest-rating-threshold') || '4');
  var hiddenTags = JSON.parse(localStorage.getItem('digest-hidden-tags') || '[]');

  function resolveDisplayPriority(rating, tags) {
    if (tags.some(function(t) { return hiddenTags.indexOf(t) !== -1; })) return 5;
    if (rating >= threshold + 1) return 1;
    if (rating >= threshold)     return 2;
    if (rating >= threshold - 1) return 3;
    if (rating >= threshold - 2) return 4;
    return 5;
  }

  var PLACEHOLDER_SUFFIX = 'article-placeholder.svg';
  var FALLBACK_BG_COUNT = 15;
  var BULLET_CHROME_HEIGHT = 180;
  var BULLET_BUDGET = window.innerHeight - BULLET_CHROME_HEIGHT;

  function chunkBullets(items, budget) {
    var chunks = [];
    var used = 0;
    var start = 0;
    for (var i = 0; i < items.length; i++) {
      var h = items[i].dataset.priority === '4' ? 44 : 72;
      if (used + h > budget && i > start) {
        chunks.push(items.slice(start, i));
        start = i;
        used = 0;
      }
      used += h;
    }
    if (start < items.length) chunks.push(items.slice(start));
    return chunks;
  }

  function fallbackBg(id) {
    var hash = 0;
    for (var i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    var n = (Math.abs(hash) % FALLBACK_BG_COUNT) + 1;
    return '/images/swipe-bg/' + n + '.jpg';
  }

  function createChevronSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'm9 18 6-6-6-6');
    svg.appendChild(path);
    return svg;
  }

  // --- Classify frames by priority ---

  var frames = Array.from(track.querySelectorAll('.swipe-frame:not(.swipe-frame-completion)'));
  var completionFrame = track.querySelector('.swipe-frame-completion');
  var grouped = { high: [], other: [], hidden: [] };

  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    var tags = (frame.dataset.tags || '').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
    var rating = parseInt(frame.dataset.rating || '3');
    var priority = resolveDisplayPriority(rating, tags);
    frame.dataset.priority = priority;

    if (priority === 5) grouped.hidden.push(frame);
    else if (priority <= 2) grouped.high.push(frame);
    else grouped.other.push(frame);

    frame.dataset.layerCount = frame.querySelector('.swipe-layers').children.length;

    var bgEls = frame.querySelectorAll('.swipe-frame-bg, .swipe-card-bg, .swipe-layer-bg');
    for (var j = 0; j < bgEls.length; j++) {
      var bgStyle = bgEls[j].style.backgroundImage;
      if (bgStyle && bgStyle.indexOf(PLACEHOLDER_SUFFIX) !== -1) {
        bgEls[j].style.backgroundImage = 'url(' + fallbackBg(frame.dataset.articleId) + ')';
      }
    }
  }

  // --- Dot indicators ---

  function buildDots(dotsEl, count, activeIndex) {
    dotsEl.textContent = '';
    for (var d = 0; d < count; d++) {
      var dot = document.createElement('span');
      dot.className = d === activeIndex ? 'swipe-dot is-active' : 'swipe-dot';
      dotsEl.appendChild(dot);
    }
  }

  function initDotScroll(layersEl, dotsEl) {
    var frame = layersEl.closest('.swipe-frame');
    layersEl.addEventListener('scroll', function() {
      var idx = Math.round(layersEl.scrollLeft / layersEl.clientWidth);
      var allDots = dotsEl.querySelectorAll('.swipe-dot');
      for (var k = 0; k < allDots.length; k++) {
        allDots[k].classList.toggle('is-active', k === idx);
      }
      if (frame) frame.classList.toggle('is-inner-layer', idx > 0);
    });
  }

  // --- Stash priority-4 frames, build bullet frames ---

  var stash = {};
  for (var i = 0; i < grouped.other.length; i++) {
    stash[grouped.other[i].dataset.articleId] = grouped.other[i];
  }

  var bulletChunks = chunkBullets(grouped.other, BULLET_BUDGET);

  var bulletFrames = [];
  var bulletPageTotal = bulletChunks.length;

  for (var ci = 0; ci < bulletChunks.length; ci++) {
    var chunk = bulletChunks[ci];

    var bf = document.createElement('div');
    bf.className = 'swipe-frame swipe-frame-bullets';

    var layers = document.createElement('div');
    layers.className = 'swipe-layers';

    var bulletLayer = document.createElement('div');
    bulletLayer.className = 'swipe-layer swipe-layer-bullets';

    var inner = document.createElement('div');
    inner.className = 'swipe-bullets-inner';

    var title = document.createElement('h3');
    title.className = 'swipe-bullets-title';
    var bulletPage = ci + 1;
    title.textContent = bulletPageTotal > 1 ? 'Other News (' + bulletPage + '/' + bulletPageTotal + ')' : 'Other News';
    inner.appendChild(title);

    var list = document.createElement('div');
    list.className = 'swipe-bullets-list';

    for (var j = 0; j < chunk.length; j++) {
      var article = chunk[j];

      var item = document.createElement('button');
      item.className = 'swipe-bullet-item';
      item.dataset.articleId = article.dataset.articleId;
      item.dataset.priority = article.dataset.priority || '3';

      var badge = document.createElement('span');
      badge.className = 'swipe-bullet-badge';
      badge.textContent = article.dataset.section || '';

      var textWrap = document.createElement('span');
      textWrap.className = 'swipe-bullet-text';

      var itemTitle = document.createElement('span');
      itemTitle.className = 'swipe-bullet-title';
      itemTitle.textContent = (article.querySelector('.swipe-card-title') || {}).textContent || '';
      textWrap.appendChild(itemTitle);

      var oneliner = (article.querySelector('.swipe-card-oneliner') || {}).textContent || '';
      if (oneliner) {
        var itemOneliner = document.createElement('span');
        itemOneliner.className = 'swipe-bullet-oneliner';
        itemOneliner.textContent = oneliner;
        textWrap.appendChild(itemOneliner);
      }

      var chevron = document.createElement('span');
      chevron.className = 'swipe-bullet-chevron';
      chevron.appendChild(createChevronSvg());

      item.appendChild(badge);
      item.appendChild(textWrap);
      item.appendChild(chevron);
      list.appendChild(item);
    }

    inner.appendChild(list);
    bulletLayer.appendChild(inner);
    layers.appendChild(bulletLayer);
    bf.appendChild(layers);

    var dotsEl = document.createElement('div');
    dotsEl.className = 'swipe-dots';
    bf.appendChild(dotsEl);

    bulletFrames.push(bf);
  }

  // --- Remove all frames, reinsert in priority order ---

  for (var i = 0; i < frames.length; i++) frames[i].remove();
  var visibleFrames = grouped.high.concat(bulletFrames);
  for (var i = 0; i < visibleFrames.length; i++) track.insertBefore(visibleFrames[i], completionFrame);
  var totalArticles = visibleFrames.length;

  for (var i = 0; i < visibleFrames.length; i++) {
    if (visibleFrames[i].classList.contains('swipe-frame-bullets')) continue;
    var layersEl = visibleFrames[i].querySelector('.swipe-layers');
    var dotsEl = visibleFrames[i].querySelector('.swipe-dots');
    var layerCount = layersEl.children.length;
    if (layerCount > 1) {
      buildDots(dotsEl, layerCount, 0);
      initDotScroll(layersEl, dotsEl);
    }
  }

  // --- Bullet frame: expand article on click ---

  function expandArticle(bulletFrame, articleId) {
    var bfLayers = bulletFrame.querySelector('.swipe-layers');
    var bfDots = bulletFrame.querySelector('.swipe-dots');
    var prevId = bulletFrame.dataset.activeArticle;

    if (prevId === articleId) {
      bfLayers.scrollTo({ left: bfLayers.clientWidth, behavior: 'smooth' });
      return;
    }

    if (prevId && stash[prevId]) {
      var prevLayers = bfLayers.querySelectorAll('.swipe-layer:not(.swipe-layer-bullets)');
      var prevStash = stash[prevId].querySelector('.swipe-layers');
      for (var k = 0; k < prevLayers.length; k++) prevStash.appendChild(prevLayers[k]);
    }

    var stashedFrame = stash[articleId];
    if (!stashedFrame) return;
    var articleLayersEl = stashedFrame.querySelector('.swipe-layers');
    var layersToMove = Array.from(articleLayersEl.children);
    for (var k = 0; k < layersToMove.length; k++) bfLayers.appendChild(layersToMove[k]);

    var bg = bulletFrame.querySelector(':scope > .swipe-frame-bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.className = 'swipe-frame-bg';
      bulletFrame.insertBefore(bg, bulletFrame.firstChild);
    }
    var cardBg = stashedFrame.querySelector('.swipe-card-bg');
    bg.style.backgroundImage = cardBg ? cardBg.style.backgroundImage : stashedFrame.querySelector('.swipe-frame-bg').style.backgroundImage;

    var layerCount = parseInt(stashedFrame.dataset.layerCount || '1');
    buildDots(bfDots, 1 + layerCount, 1);

    bulletFrame.dataset.activeArticle = articleId;

    var newViewports = bulletFrame.querySelectorAll('.swipe-layer:not(.swipe-layer-bullets) .swipe-text-viewport');
    for (var k = 0; k < newViewports.length; k++) initViewport(newViewports[k]);

    bfLayers.scrollTo({ left: bfLayers.clientWidth, behavior: 'smooth' });
  }

  for (var i = 0; i < bulletFrames.length; i++) {
    (function(bf) {
      bf.addEventListener('click', function(e) {
        var item = e.target.closest('.swipe-bullet-item');
        if (!item) return;
        expandArticle(bf, item.dataset.articleId);
      });
      initDotScroll(bf.querySelector('.swipe-layers'), bf.querySelector('.swipe-dots'));
    })(bulletFrames[i]);
  }

  // --- Progress ---

  var progressText = root.querySelector('.swipe-progress-text');
  var progressFill = root.querySelector('.swipe-progress-fill');
  var completionStats = root.querySelector('.swipe-completion-stats');
  if (progressText) progressText.textContent = '1 / ' + totalArticles;
  if (completionStats) completionStats.textContent = totalArticles + ' articles';

  // --- Scroll buttons ---

  function smoothScroll(element, delta, duration) {
    var start = element.scrollTop;
    var target = Math.max(0, Math.min(start + delta, element.scrollHeight - element.clientHeight));
    var startTime = null;
    function step(time) {
      if (!startTime) startTime = time;
      var t = Math.min((time - startTime) / duration, 1);
      var ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      element.scrollTop = start + (target - start) * ease;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  track.addEventListener('click', function(e) {
    var btn = e.target.closest('.swipe-scroll-btn');
    if (!btn) return;
    e.stopPropagation();
    var viewport = btn.closest('.swipe-layer').querySelector('.swipe-text-viewport');
    if (!viewport) return;
    var delta = viewport.clientHeight * 0.6;
    if (btn.classList.contains('swipe-scroll-up')) delta = -delta;
    smoothScroll(viewport, delta, 600);
  });

  function initViewport(viewport) {
    if (viewport.dataset.scrollInit) return;
    viewport.dataset.scrollInit = '1';
    var layer = viewport.closest('.swipe-layer');
    var btnUp = layer.querySelector('.swipe-scroll-up');
    var btnDown = layer.querySelector('.swipe-scroll-down');
    if (!btnUp || !btnDown) return;

    function updateButtons() {
      var atTop = viewport.scrollTop <= 1;
      var atBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;
      btnUp.classList.toggle('is-hidden', atTop);
      btnDown.classList.toggle('is-hidden', atBottom);
    }

    viewport.addEventListener('scroll', updateButtons);
    viewport.addEventListener('touchmove', function(e) {
      if (viewport.scrollHeight > viewport.clientHeight + 2) e.stopPropagation();
    }, { passive: true });

    requestAnimationFrame(function check() {
      if (!layer.parentNode) return requestAnimationFrame(check);
      var overflows = viewport.scrollHeight > viewport.clientHeight + 2;
      btnDown.classList.toggle('is-hidden', !overflows);
      btnUp.classList.add('is-hidden');
      if (!overflows) {
        btnDown.classList.add('is-permanent-hidden');
        btnUp.classList.add('is-permanent-hidden');
      }
    });
  }

  var viewports = track.querySelectorAll('.swipe-text-viewport');
  for (var i = 0; i < viewports.length; i++) initViewport(viewports[i]);

  // --- Read tracking ---

  function getCurrentFrame() {
    var allFrames = track.querySelectorAll('.swipe-frame');
    var current = allFrames[0];
    for (var i = 1; i < allFrames.length; i++) {
      if (allFrames[i].offsetTop <= track.scrollTop + track.clientHeight / 2) current = allFrames[i];
    }
    return current;
  }

  var obs = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (entry.target.classList.contains('swipe-frame-completion')) {
          document.dispatchEvent(new CustomEvent('digest-mark-read', { detail: { date: postDate } }));
        }
        var visIdx = visibleFrames.indexOf(entry.target);
        if (visIdx >= 0) {
          var n = visIdx + 1;
          if (progressText) progressText.textContent = n + ' / ' + totalArticles;
          if (progressFill) progressFill.style.width = (n / totalArticles * 100) + '%';
        }
      }
      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
        var aid = entry.target.dataset.articleId || entry.target.dataset.activeArticle;
        if (aid) {
          document.dispatchEvent(new CustomEvent('digest-mark-article-read', { detail: { date: postDate, articleId: aid } }));
        }
      }
    }
  }, { root: track, threshold: [0, 0.5] });

  var allTrackFrames = track.querySelectorAll('.swipe-frame');
  for (var i = 0; i < allTrackFrames.length; i++) obs.observe(allTrackFrames[i]);

  for (var i = 0; i < visibleFrames.length; i++) {
    if (visibleFrames[i].classList.contains('swipe-frame-bullets')) continue;
    var evt = new CustomEvent('digest-is-article-read', {
      detail: { date: postDate, articleId: visibleFrames[i].dataset.articleId, result: false }
    });
    document.dispatchEvent(evt);
    if (!evt.detail.result) {
      if (i > 0) visibleFrames[i].scrollIntoView();
      break;
    }
  }

  // --- Share button ---

  var shareBtn = root.querySelector('.swipe-share-fab');

  function updateShare() {
    if (!shareBtn) return;
    var frame = getCurrentFrame();
    if (!frame || frame.classList.contains('swipe-frame-completion') || frame.classList.contains('swipe-frame-bullets')) {
      shareBtn.style.display = 'none';
      return;
    }
    shareBtn.style.display = '';
    var aid = frame.dataset.articleId || frame.dataset.activeArticle;
    shareBtn.dataset.shareArticle = aid || '';
    shareBtn.title = (frame.querySelector('.swipe-card-title') || {}).textContent || '';
  }

  track.addEventListener('scroll', updateShare);
  updateShare();

  // --- Hide loading indicator once first background is ready ---
  var loader = root.querySelector('.swipe-loading');
  if (loader) {
    var firstBg = root.querySelector('.swipe-frame-bg');
    var bgUrl = firstBg && firstBg.style.backgroundImage.replace(/^url\(["']?|["']?\)$/g, '');
    if (bgUrl) {
      var img = new Image();
      img.onload = img.onerror = function() { loader.remove(); };
      img.src = bgUrl;
    } else {
      loader.remove();
    }
  }

  // --- Keyboard navigation ---

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.location.href = root.dataset.backUrl;
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var frame = getCurrentFrame();
      var sibling = e.key === 'ArrowDown' ? frame.nextElementSibling : frame.previousElementSibling;
      if (sibling) sibling.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (e.key === 'o' || e.key === 'O') {
      var bf = track.querySelector('.swipe-frame-bullets');
      if (bf) bf.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      var layers = getCurrentFrame().querySelector('.swipe-layers');
      if (!layers) return;
      var layerIdx = Math.round(layers.scrollLeft / layers.clientWidth);
      var target = e.key === 'ArrowRight' ? layerIdx + 1 : layerIdx - 1;
      if (target >= 0 && target < layers.children.length) {
        layers.children[target].scrollIntoView({ behavior: 'smooth', inline: 'start' });
      }
    }
  });
});
