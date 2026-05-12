document.addEventListener('DOMContentLoaded', () => {

  const READ_KEY = 'digest-read-posts';
  const readState = JSON.parse(localStorage.getItem(READ_KEY) || '{}');

  function isPostRead(date) {
    const val = readState[date];
    if (val === true) return true;
    if (val === false) return false;
    if (typeof val === 'object') return false;
    return !!(readState.readBefore && date <= readState.readBefore);
  }

  function isArticleRead(date, articleId) {
    const val = readState[date];
    if (val === true) return true;
    if (typeof val === 'object' && val[articleId] === true) return true;
    if (val === false || typeof val === 'object') return false;
    return !!(readState.readBefore && date <= readState.readBefore);
  }

  function saveReadState() {
    localStorage.setItem(READ_KEY, JSON.stringify(readState));
  }

  function markAllRead(date) {
    readState.readBefore = date;
    for (const key of Object.keys(readState)) {
      if (key !== 'readBefore' && key <= date) delete readState[key];
    }
    saveReadState();
    updateReadUI();
  }

  function markArticleRead(date, articleId) {
    let val = readState[date];
    if (val === true) return;
    if (typeof val !== 'object') val = {};
    val[articleId] = true;
    readState[date] = val;
    markAllArticlesBefore(date, articleId);
    saveReadState();
    checkAutoPromote(date);
    updateReadUI();
  }

  function markAllArticlesBefore(date, articleId) {
    const articlePage = document.querySelector('.article-page[data-post-date="' + date + '"]');
    if (!articlePage) return;
    let val = readState[date];
    if (val === true) return;
    if (typeof val !== 'object') val = {};
    const articles = articlePage.querySelectorAll('.digest-article[data-article-id]:not([data-priority="5"])');
    for (const el of articles) {
      const id = el.dataset.articleId;
      if (id === articleId) break;
      val[id] = true;
    }
    readState[date] = val;
  }

  function checkAutoPromote(date) {
    const articlePage = document.querySelector('.article-page[data-post-date="' + date + '"]');
    if (!articlePage) return;
    const articles = articlePage.querySelectorAll('.digest-article[data-article-id]:not([data-priority="5"])');
    if (articles.length === 0) return;
    const allRead = Array.from(articles).every(el => isArticleRead(date, el.dataset.articleId));
    if (allRead) {
      readState[date] = true;
      saveReadState();
    }
  }



  function updateReadUI() {
    for (const el of document.querySelectorAll('[data-post-date]')) {
      const date = el.dataset.postDate;
      const read = isPostRead(date);
      el.classList.toggle('is-read', read);
      for (const btn of el.querySelectorAll('.digest-btn-mark-read')) {
        btn.classList.toggle('is-active', read);
      }
    }
    updateArticleReadUI();
  }

  function updateArticleReadUI() {
    const articlePage = document.querySelector('.article-page[data-post-date]');
    if (!articlePage) return;
    const date = articlePage.dataset.postDate;
    let anyRead = false;
    for (const el of articlePage.querySelectorAll('.digest-article[data-article-id]')) {
      const read = isArticleRead(date, el.dataset.articleId);
      el.classList.toggle('is-article-read', read);
      if (read) anyRead = true;
    }
    articlePage.classList.toggle('is-partial', anyRead && !isPostRead(date));
  }

  // Per-article scroll tracking on detail pages
  const articlePage = document.querySelector('.article-page[data-post-date]');
  const activeObservers = [];

  function setupArticleObservers() {
    for (const obs of activeObservers) obs.disconnect();
    activeObservers.length = 0;

    if (!articlePage) return;
    const date = articlePage.dataset.postDate;
    if (isPostRead(date)) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          const articleId = entry.target.dataset.articleId;
          if (articleId && !isArticleRead(date, articleId)) {
            markArticleRead(date, articleId);
          }
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0 });
    activeObservers.push(observer);

    const mainArticles = [];
    for (const el of articlePage.querySelectorAll('.digest-article[data-article-id]:not([data-priority="5"])')) {
      if (!el.closest('.digest-quick-links') && !isArticleRead(date, el.dataset.articleId)) {
        mainArticles.push(el);
        observer.observe(el);
      }
    }

    const footer = articlePage.querySelector('.page-footer');
    if (footer) {
      let footerReady = false;
      requestAnimationFrame(() => { footerReady = true; });
      const footerObs = new IntersectionObserver((entries) => {
        if (!footerReady) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            for (const el of articlePage.querySelectorAll('.digest-article[data-article-id]:not([data-priority="5"])')) {
              const id = el.dataset.articleId;
              if (!isArticleRead(date, id)) markArticleRead(date, id);
            }
            footerObs.disconnect();
          }
        }
      }, { threshold: 0 });
      activeObservers.push(footerObs);
      footerObs.observe(footer);
    }

    const quickLinks = articlePage.querySelector('.digest-quick-links');
    if (quickLinks && mainArticles.length > 0) {
      const lastMain = mainArticles[mainArticles.length - 1];
      const lastId = lastMain.dataset.articleId;
      const qlObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            if (entry.target.dataset.articleId === lastId) {
              let val = readState[date];
              if (val === true) return;
              if (typeof val !== 'object') val = {};
              for (const el of quickLinks.querySelectorAll('.digest-article[data-article-id]')) {
                val[el.dataset.articleId] = true;
              }
              readState[date] = val;
              saveReadState();
              checkAutoPromote(date);
              updateReadUI();
              qlObserver.disconnect();
            }
          }
        }
      }, { threshold: 0 });
      activeObservers.push(qlObserver);
      qlObserver.observe(lastMain);
    }
  }

  function toggleRead(date) {
    if (isPostRead(date)) {
      readState[date] = false;
    } else {
      readState[date] = true;
    }
    saveReadState();
    updateReadUI();
    setupArticleObservers();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.digest-btn-mark-read, .digest-btn-mark-all-read, .digest-btn-start-again');
    if (!btn) return;
    const container = btn.closest('[data-post-date]');
    if (!container) return;
    const date = container.dataset.postDate;
    if (btn.classList.contains('digest-btn-start-again')) {
      readState[date] = false;
      saveReadState();
      updateReadUI();
      setupArticleObservers();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (btn.classList.contains('digest-btn-devour-again')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const onScrollEnd = () => {
        toggleRead(date);
        window.removeEventListener('scrollend', onScrollEnd);
      };
      window.addEventListener('scrollend', onScrollEnd);
    } else if (btn.classList.contains('digest-btn-mark-all-read')) {
      markAllRead(date);
    } else {
      toggleRead(date);
    }
  });

  function scrollToReadingPosition() {
    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }

  function shareUrl(title, url) {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.activeElement;
        if (btn && btn.classList.contains('digest-share-btn')) {
          const original = btn.innerHTML;
          btn.classList.add('is-copied');
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg> Copied!';
          setTimeout(() => { btn.innerHTML = original; btn.classList.remove('is-copied'); }, 2000);
        }
      });
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.digest-share-btn');
    if (!btn) return;
    if (btn.dataset.shareArticle) {
      const swipeRoot = document.querySelector('.swipe-page-root');
      const basePath = swipeRoot ? swipeRoot.dataset.backUrl : window.location.pathname;
      const base = window.location.origin + basePath;
      shareUrl(btn.title, base + '#' + btn.dataset.shareArticle);
    } else {
      shareUrl(document.title, window.location.href.split('#')[0]);
    }
  });

  if (articlePage) {
    const digestContainer = document.querySelector('.digest-articles');
    if (digestContainer) {
      if (digestContainer.dataset.ready !== undefined) {
        setupArticleObservers();
      } else {
        new MutationObserver((mutations, obs) => {
          if (digestContainer.dataset.ready !== undefined) {
            obs.disconnect();
            setupArticleObservers();
          }
        }).observe(digestContainer, { attributes: true, attributeFilter: ['data-ready'] });
      }
    }
  }

  function findFirstUnread() {
    var stubs = document.querySelectorAll('.post-stub[data-post-date]');
    var items = stubs.length > 0 ? stubs : document.querySelectorAll('.card.post[data-post-date]');
    var nextRead = localStorage.getItem('digest-next-read') || 'oldest';
    var start = nextRead === 'newest' ? 0 : items.length - 1;
    var end = nextRead === 'newest' ? items.length : -1;
    var step = nextRead === 'newest' ? 1 : -1;
    for (var i = start; i !== end; i += step) {
      if (!isPostRead(items[i].dataset.postDate)) return items[i];
    }
    return null;
  }

  function updateHomeCta() {
    var cta = document.getElementById('digest-home-cta');
    if (!cta) return;
    var allDates = (cta.dataset.allDates || '').split(',').filter(Boolean);
    var readCount = 0;
    for (var j = 0; j < allDates.length; j++) { if (isPostRead(allDates[j])) readCount++; }
    var item = findFirstUnread();
    if (!item) {
      cta.querySelector('.digest-cta-label').textContent = 'All caught up! · ' + readCount + ' days digested';
      cta.querySelector('.digest-cta-date').textContent = '';
      cta.querySelector('.digest-cta-title').textContent = 'You\'ve devoured every digest. Come back tomorrow for more.';
      var btn = cta.querySelector('.digest-cta-btn');
      btn.style.display = 'none';
      cta.style.display = '';
      return;
    }
    var label = 'Next read for you';
    if (readCount > 0) label += ' · ' + readCount + ' days digested';
    cta.querySelector('.digest-cta-label').textContent = label;
    var dateEl = cta.querySelector('.digest-cta-date');
    var isDesktop = window.matchMedia('(min-width: 769px)').matches;
    if (dateEl) {
      var d = new Date(item.dataset.postDate + 'T00:00:00');
      dateEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    var link = item.querySelector('.post-title a');
    var desc = item.querySelector('.post-content p');
    var title = link ? link.textContent.trim() : (item.dataset.title || '');
    var description = desc ? desc.textContent.trim() : (item.dataset.desc || title);
    var postUrl = link ? link.href : (item.dataset.url || '');
    var swipeUrl = item.dataset.swipeUrl || '';
    cta.querySelector('.digest-cta-title').textContent = description;
    var btn = cta.querySelector('.digest-cta-btn');
    btn.style.display = '';
    btn.href = isDesktop ? (postUrl || swipeUrl) : swipeUrl;
    cta.querySelector('.digest-cta-btn-text').textContent = isDesktop ? 'Read' : 'Swipe mode';
    cta.style.display = '';
  }

  if (!articlePage) {
    var cta = document.getElementById('digest-home-cta');
    var startFrom = cta ? cta.querySelector('.digest-cta-start-from') : null;

    if (localStorage.getItem(READ_KEY) === null && startFrom) {
      var cards = document.querySelectorAll('.card.post[data-post-date]');
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Choose a start date...';
      placeholder.disabled = true;
      placeholder.selected = true;
      startFrom.appendChild(placeholder);
      for (var i = 0; i < cards.length; i++) {
        var date = cards[i].dataset.postDate;
        var title = cards[i].querySelector('.post-title a');
        var d = new Date(date + 'T00:00:00');
        var opt = document.createElement('option');
        opt.value = date;
        opt.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (title ? ' — ' + title.textContent.trim() : '');
        startFrom.appendChild(opt);
      }
      if (cta) {
        cta.querySelector('.digest-cta-label').textContent = 'Welcome to Devoured!';
        cta.querySelector('.digest-cta-title').textContent = 'Catch up from any day. Pick one below and we\'ll mark older digests as read.';
        cta.querySelector('.digest-cta-btn-text').textContent = 'Read from scratch';
        cta.querySelector('.digest-cta-btn').href = cards.length > 0 ? cards[cards.length - 1].querySelector('.post-title a')?.href : '#';
        startFrom.style.display = '';
        cta.style.display = '';
      }
      startFrom.addEventListener('change', function() {
        if (this.value) {
          markAllRead(this.value);
          startFrom.style.display = 'none';
          updateHomeCta();
        }
      });
    } else {
      updateHomeCta();
    }
  }

  if (articlePage) {
    var postCta = articlePage.querySelector('.digest-cta-post');
    if (postCta) {
      function updatePostCta() {
        var date = articlePage.dataset.postDate;
        if (isPostRead(date)) { postCta.style.display = 'none'; return; }
        var articles = articlePage.querySelectorAll('.digest-article[data-article-id]:not([data-priority="5"])');
        var firstUnread = null;
        for (var i = 0; i < articles.length; i++) {
          if (!isArticleRead(date, articles[i].dataset.articleId)) { firstUnread = articles[i]; break; }
        }
        if (!firstUnread) { postCta.style.display = 'none'; return; }
        postCta.querySelector('.digest-cta-title').textContent = firstUnread.dataset.oneliner || '';
        if (window.matchMedia('(min-width: 769px)').matches) {
          postCta.querySelector('.digest-cta-btn').href = '#' + firstUnread.id;
          postCta.querySelector('.digest-cta-btn-text').textContent = 'Start reading';
        }
        postCta.style.display = '';
      }
      var digestContainer = document.querySelector('.digest-articles');
      if (digestContainer && digestContainer.dataset.ready !== undefined) {
        updatePostCta();
      } else if (digestContainer) {
        new MutationObserver(function(_, obs) {
          if (digestContainer.dataset.ready !== undefined) { obs.disconnect(); updatePostCta(); }
        }).observe(digestContainer, { attributes: true, attributeFilter: ['data-ready'] });
      }
    }
  }

  document.addEventListener('digest-mark-article-read', function(e) {
    markArticleRead(e.detail.date, e.detail.articleId);
  });

  document.addEventListener('digest-mark-read', function(e) {
    readState[e.detail.date] = true;
    saveReadState();
    updateReadUI();
  });

  document.addEventListener('digest-mark-all-read', function(e) {
    markAllRead(e.detail.date);
  });

  document.addEventListener('digest-is-article-read', function(e) {
    e.detail.result = isArticleRead(e.detail.date, e.detail.articleId);
  });

  document.addEventListener('digest-is-post-read', function(e) {
    e.detail.result = isPostRead(e.detail.date);
  });

  updateReadUI();
  scrollToReadingPosition();
});
