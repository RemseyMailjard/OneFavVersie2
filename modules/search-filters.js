/**
 * ============================================
 * RECENT SEARCHES MODULE
 * ============================================
 * Beheer en toon recent gezochte apps
 */

class RecentSearches {
  constructor(options = {}) {
    this.storageKey = options.storageKey || "onefav_recent_searches";
    this.maxItems = options.maxItems || 10;
    this.enabled = options.enabled !== false;
    this.searches = this.load();
  }

  /**
   * Load recent searches from storage
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading recent searches:", error);
      return [];
    }
  }

  /**
   * Save to storage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.searches));
    } catch (error) {
      console.error("Error saving recent searches:", error);
    }
  }

  /**
   * Add search to history
   */
  add(item) {
    if (!this.enabled || !item) return;

    // Remove duplicates (case-insensitive)
    this.searches = this.searches.filter(
      (search) => search.toLowerCase() !== item.toLowerCase()
    );

    // Add to beginning
    this.searches.unshift(item);

    // Limit size
    if (this.searches.length > this.maxItems) {
      this.searches = this.searches.slice(0, this.maxItems);
    }

    this.save();
  }

  /**
   * Get all recent searches
   */
  getAll() {
    return [...this.searches];
  }

  /**
   * Remove specific search
   */
  remove(item) {
    this.searches = this.searches.filter((search) => search !== item);
    this.save();
  }

  /**
   * Clear all
   */
  clear() {
    this.searches = [];
    this.save();
  }

  /**
   * Check if item is in recent searches
   */
  has(item) {
    return this.searches.some(
      (search) => search.toLowerCase() === item.toLowerCase()
    );
  }
}

/**
 * ============================================
 * TAG FILTERING MODULE
 * ============================================
 * Filter apps op meerdere tags met AND/OR logica
 */

class TagFilter {
  constructor(options = {}) {
    this.selectedTags = [];
    this.mode = options.mode || "OR"; // 'AND' or 'OR'
    this.enabled = options.enabled !== false;
  }

  /**
   * Set filter mode
   */
  setMode(mode) {
    if (mode === "AND" || mode === "OR") {
      this.mode = mode;
    }
  }

  /**
   * Toggle tag selection
   */
  toggleTag(tag) {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    return this.selectedTags;
  }

  /**
   * Select tag
   */
  selectTag(tag) {
    if (!this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag);
    }
    return this.selectedTags;
  }

  /**
   * Deselect tag
   */
  deselectTag(tag) {
    this.selectedTags = this.selectedTags.filter((t) => t !== tag);
    return this.selectedTags;
  }

  /**
   * Clear all selected tags
   */
  clearAll() {
    this.selectedTags = [];
  }

  /**
   * Get selected tags
   */
  getSelected() {
    return [...this.selectedTags];
  }

  /**
   * Check if tag is selected
   */
  isSelected(tag) {
    return this.selectedTags.includes(tag);
  }

  /**
   * Filter apps based on selected tags
   */
  filter(apps) {
    if (!this.enabled || this.selectedTags.length === 0) {
      return apps;
    }

    return apps.filter((app) => {
      const appTags = app.tags || [];

      if (this.mode === "AND") {
        // App moet ALLE geselecteerde tags hebben
        return this.selectedTags.every((tag) => appTags.includes(tag));
      } else {
        // App moet MINIMAAL 1 geselecteerde tag hebben
        return this.selectedTags.some((tag) => appTags.includes(tag));
      }
    });
  }

  /**
   * Get all unique tags from apps
   */
  static getAllTags(apps) {
    const tagSet = new Set();
    apps.forEach((app) => {
      if (app.tags && Array.isArray(app.tags)) {
        app.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Get tag counts
   */
  static getTagCounts(apps) {
    const counts = {};
    apps.forEach((app) => {
      if (app.tags && Array.isArray(app.tags)) {
        app.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return counts;
  }

  /**
   * Get popular tags (most used)
   */
  static getPopularTags(apps, limit = 10) {
    const counts = this.getTagCounts(apps);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }
}

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RecentSearches, TagFilter };
}

// Make globally available for browser
if (typeof window !== "undefined") {
  window.RecentSearches = RecentSearches;
  window.TagFilter = TagFilter;
}
