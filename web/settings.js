document.addEventListener('DOMContentLoaded', function() {
  var starsEl = document.getElementById('settings-stars');
  if (!starsEl) return;

  var KNOWN_TAGS = (starsEl.dataset.tags || '').split(',').filter(Boolean);
  var LEVELS = [
    { value: 5, label: 'Only the best', approx: '~5 articles/day' },
    { value: 4, label: 'Recommended', approx: '~15 articles/day' },
    { value: 3, label: 'More coverage', approx: '~30 articles/day' },
    { value: 2, label: 'Most articles', approx: '~45 articles/day' },
    { value: 1, label: 'Everything', approx: 'all articles' }
  ];
  var DEFAULT_THRESHOLD = 4;

  var threshold = parseInt(localStorage.getItem('digest-rating-threshold') || String(DEFAULT_THRESHOLD));
  var hiddenTags = JSON.parse(localStorage.getItem('digest-hidden-tags') || '[]');
  var descEl = document.getElementById('settings-star-desc');
  var tagsEl = document.getElementById('settings-tags');

  function renderStars() {
    starsEl.textContent = '';
    for (var i = 0; i < LEVELS.length; i++) {
      var lev = LEVELS[i];
      var btn = document.createElement('button');
      btn.className = 'settings-star-btn';
      if (lev.value === threshold) btn.classList.add('is-active');
      btn.dataset.value = lev.value;

      var stars = '';
      for (var s = 0; s < lev.value; s++) stars += '★';
      for (var s = lev.value; s < 5; s++) stars += '☆';

      var starsSpan = document.createElement('span');
      starsSpan.className = 'settings-star-icons';
      starsSpan.textContent = stars;
      btn.appendChild(starsSpan);

      var label = document.createElement('span');
      label.className = 'settings-star-label';
      label.textContent = lev.label;
      btn.appendChild(label);

      btn.addEventListener('click', (function(val) {
        return function() {
          threshold = val;
          localStorage.setItem('digest-rating-threshold', String(val));
          renderStars();
        };
      })(lev.value));

      starsEl.appendChild(btn);
    }
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].value === threshold) {
        descEl.textContent = LEVELS[i].approx;
        break;
      }
    }
  }

  function renderTags() {
    tagsEl.textContent = '';
    var sorted = KNOWN_TAGS.slice().sort();
    for (var i = 0; i < sorted.length; i++) {
      var tag = sorted[i];
      var chip = document.createElement('button');
      chip.className = 'settings-tag-chip';
      if (hiddenTags.indexOf(tag) !== -1) chip.classList.add('is-hidden');
      chip.textContent = tag;
      chip.dataset.tag = tag;
      chip.addEventListener('click', function() {
        var t = this.dataset.tag;
        var idx = hiddenTags.indexOf(t);
        if (idx === -1) {
          hiddenTags.push(t);
          this.classList.add('is-hidden');
        } else {
          hiddenTags.splice(idx, 1);
          this.classList.remove('is-hidden');
        }
        localStorage.setItem('digest-hidden-tags', JSON.stringify(hiddenTags));
      });
      tagsEl.appendChild(chip);
    }
  }

  // Reading Order
  var orderEl = document.getElementById('settings-order');
  var nextRead = localStorage.getItem('digest-next-read') || 'oldest';
  var ORDER_OPTIONS = [
    { value: 'oldest', label: 'Oldest first' },
    { value: 'newest', label: 'Newest first' }
  ];

  function renderOrder() {
    orderEl.textContent = '';
    for (var i = 0; i < ORDER_OPTIONS.length; i++) {
      var opt = ORDER_OPTIONS[i];
      var btn = document.createElement('button');
      btn.className = 'settings-star-btn';
      if (opt.value === nextRead) btn.classList.add('is-active');
      btn.textContent = opt.label;
      btn.addEventListener('click', (function(val) {
        return function() {
          nextRead = val;
          localStorage.setItem('digest-next-read', val);
          renderOrder();
        };
      })(opt.value));
      orderEl.appendChild(btn);
    }
  }

  // Catch Up
  var catchupEl = document.getElementById('settings-catchup');
  var POST_DATES = (catchupEl.dataset.dates || '').split(',').filter(Boolean);

  function isPostRead(date) {
    var evt = new CustomEvent('digest-is-post-read', { detail: { date: date, result: false } });
    document.dispatchEvent(evt);
    return evt.detail.result;
  }

  function renderCatchup() {
    catchupEl.textContent = '';
    var effectiveReadBefore = '';
    for (var i = POST_DATES.length - 1; i >= 0; i--) {
      if (isPostRead(POST_DATES[i])) effectiveReadBefore = POST_DATES[i];
      else break;
    }
    var select = document.createElement('select');
    select.className = 'settings-catchup-select';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a date...';
    placeholder.disabled = true;
    if (!effectiveReadBefore) placeholder.selected = true;
    select.appendChild(placeholder);
    for (var i = 0; i < POST_DATES.length; i++) {
      var date = POST_DATES[i];
      var d = new Date(date + 'T00:00:00');
      var opt = document.createElement('option');
      opt.value = date;
      opt.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (date === effectiveReadBefore) opt.selected = true;
      select.appendChild(opt);
    }
    var btnLabel = effectiveReadBefore ? 'Update' : 'Mark as devoured';
    var btn = document.createElement('button');
    btn.className = 'settings-catchup-btn';
    btn.textContent = btnLabel;
    btn.addEventListener('click', function() {
      if (!select.value) return;
      document.dispatchEvent(new CustomEvent('digest-mark-all-read', { detail: { date: select.value } }));
      btn.textContent = 'Done!';
      setTimeout(function() { renderCatchup(); }, 2000);
    });
    catchupEl.appendChild(select);
    catchupEl.appendChild(btn);
  }

  document.getElementById('settings-reset').addEventListener('click', function() {
    localStorage.removeItem('digest-rating-threshold');
    localStorage.removeItem('digest-hidden-tags');
    localStorage.removeItem('digest-tag-priorities');
    localStorage.removeItem('digest-tag-order');
    localStorage.removeItem('digest-unsorted-priority');
    localStorage.removeItem('digest-next-read');
    threshold = DEFAULT_THRESHOLD;
    hiddenTags = [];
    nextRead = 'oldest';
    renderStars();
    renderTags();
    renderOrder();
    renderCatchup();
  });

  renderStars();
  renderTags();
  renderOrder();
  renderCatchup();
});
