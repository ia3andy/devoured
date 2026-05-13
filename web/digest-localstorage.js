const KEYS = {
  RATING_THRESHOLD: 'digest-rating-threshold',
  HIDDEN_TAGS: 'digest-hidden-tags',
  NEXT_READ: 'digest-next-read',
  TAG_PRIORITIES: 'digest-tag-priorities',
  TAG_ORDER: 'digest-tag-order',
  UNSORTED_PRIORITY: 'digest-unsorted-priority'
};

class DigestStorage {
  getRatingThreshold() {
    return parseInt(localStorage.getItem(KEYS.RATING_THRESHOLD) || '4');
  }
  setRatingThreshold(val) {
    localStorage.setItem(KEYS.RATING_THRESHOLD, String(val));
  }

  getHiddenTags() {
    return JSON.parse(localStorage.getItem(KEYS.HIDDEN_TAGS) || '[]');
  }
  setHiddenTags(arr) {
    localStorage.setItem(KEYS.HIDDEN_TAGS, JSON.stringify(arr));
  }

  getNextRead() {
    return localStorage.getItem(KEYS.NEXT_READ) || 'oldest';
  }
  setNextRead(val) {
    localStorage.setItem(KEYS.NEXT_READ, val);
  }

  getLegacyTagPriorities() {
    return localStorage.getItem(KEYS.TAG_PRIORITIES);
  }
  removeLegacy() {
    localStorage.removeItem(KEYS.TAG_PRIORITIES);
    localStorage.removeItem(KEYS.TAG_ORDER);
    localStorage.removeItem(KEYS.UNSORTED_PRIORITY);
  }

  resetAll() {
    localStorage.removeItem(KEYS.RATING_THRESHOLD);
    localStorage.removeItem(KEYS.HIDDEN_TAGS);
    localStorage.removeItem(KEYS.TAG_PRIORITIES);
    localStorage.removeItem(KEYS.TAG_ORDER);
    localStorage.removeItem(KEYS.UNSORTED_PRIORITY);
    localStorage.removeItem(KEYS.NEXT_READ);
  }
}

export default new DigestStorage();
