/**
 * ============================================
 * UI ENHANCEMENTS MODULE
 * ============================================
 * Visuele verbeteringen: badges, hover effects, loading states
 */

class UIEnhancements {
  constructor(options = {}) {
    this.features = {
      recentBadge: options.recentBadge !== false,
      usageCounter: options.usageCounter !== false,
      hoverEffects: options.hoverEffects !== false,
      loadingSkeleton: options.loadingSkeleton !== false,
    };
  }

  /**
   * Add recent badge to app card
   */
  addRecentBadge(appElement, lastOpened) {
    if (!this.features.recentBadge || !lastOpened) return;

    const hoursSinceOpen =
      (Date.now() - new Date(lastOpened)) / (1000 * 60 * 60);

    // Only show if opened within last 24 hours
    if (hoursSinceOpen > 24) return;

    const badge = document.createElement("span");
    badge.className = "recent-badge";
    badge.innerHTML = "🔥";
    badge.title = `Geopend ${this.formatTimeAgo(lastOpened)}`;

    appElement.appendChild(badge);
  }

  /**
   * Add usage counter to app card
   */
  addUsageCounter(appElement, openCount) {
    if (!this.features.usageCounter || !openCount || openCount < 1) return;

    const counter = document.createElement("span");
    counter.className = "usage-counter";
    counter.textContent = openCount > 99 ? "99+" : openCount;
    counter.title = `${openCount}× geopend`;

    appElement.appendChild(counter);
  }

  /**
   * Apply hover effects to app cards
   */
  applyHoverEffects(appElement) {
    if (!this.features.hoverEffects) return;

    appElement.classList.add("app-hover-enhanced");
  }

  /**
   * Create loading skeleton
   */
  createLoadingSkeleton(count = 8) {
    if (!this.features.loadingSkeleton) {
      return '<div class="loading-spinner">Loading...</div>';
    }

    const skeletons = [];
    for (let i = 0; i < count; i++) {
      skeletons.push(`
        <div class="app-skeleton">
          <div class="skeleton-icon"></div>
          <div class="skeleton-text"></div>
        </div>
      `);
    }

    return skeletons.join("");
  }

  /**
   * Format time ago (helper)
   */
  formatTimeAgo(date) {
    const now = Date.now();
    const past = new Date(date).getTime();
    const diffMs = now - past;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return "zojuist";
    if (minutes < 60) return `${minutes}m geleden`;
    if (hours < 24) return `${hours}u geleden`;
    if (days < 7) return `${days}d geleden`;
    return new Date(date).toLocaleDateString("nl-NL");
  }

  /**
   * Enhance app card with all features
   */
  enhanceAppCard(appElement, appData) {
    if (appData.lastOpened) {
      this.addRecentBadge(appElement, appData.lastOpened);
    }

    if (appData.totalOpens) {
      this.addUsageCounter(appElement, appData.totalOpens);
    }

    this.applyHoverEffects(appElement);
  }

  /**
   * Create app note indicator
   */
  createNoteIndicator(hasNote) {
    if (!hasNote) return "";

    return `<span class="note-indicator" title="Deze app heeft een notitie">📝</span>`;
  }

  /**
   * Create app group indicator
   */
  createGroupIndicator(groupCount) {
    if (!groupCount || groupCount === 0) return "";

    return `<span class="group-indicator" title="Onderdeel van ${groupCount} groep(en)">🔗</span>`;
  }

  /**
   * Smooth scroll to element
   */
  smoothScrollTo(element) {
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 10);

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Create progress indicator
   */
  createProgressBar(percentage) {
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
    `;
  }
}

/**
 * ============================================
 * KEYBOARD SHORTCUTS MODULE
 * ============================================
 * Quick launch shortcuts (Alt+1, Alt+2, etc.)
 */

class KeyboardShortcuts {
  constructor(options = {}) {
    this.shortcuts = new Map();
    this.modifier = options.modifier || "Alt";
    this.maxShortcuts = options.maxShortcuts || 9;
    this.enabled = options.enabled !== false;

    if (this.enabled) {
      this.init();
    }
  }

  /**
   * Initialize keyboard listener
   */
  init() {
    document.addEventListener("keydown", this.handleKeyPress.bind(this));
  }

  /**
   * Handle key press
   */
  handleKeyPress(event) {
    if (!this.enabled) return;

    const modifierPressed =
      this.modifier === "Alt"
        ? event.altKey
        : this.modifier === "Ctrl"
        ? event.ctrlKey
        : this.modifier === "Shift"
        ? event.shiftKey
        : false;

    if (!modifierPressed) return;

    const key = event.key;
    const shortcut = `${this.modifier}+${key}`;

    if (this.shortcuts.has(shortcut)) {
      event.preventDefault();
      const callback = this.shortcuts.get(shortcut);
      callback(event);
    }
  }

  /**
   * Register shortcut
   */
  register(key, callback, description = "") {
    const shortcut = `${this.modifier}+${key}`;
    this.shortcuts.set(shortcut, callback);

    return {
      shortcut,
      description,
      unregister: () => this.unregister(shortcut),
    };
  }

  /**
   * Unregister shortcut
   */
  unregister(shortcut) {
    this.shortcuts.delete(shortcut);
  }

  /**
   * Register numbered shortcuts for apps (Alt+1 through Alt+9)
   */
  registerNumberedShortcuts(apps) {
    // Clear existing numbered shortcuts
    for (let i = 1; i <= this.maxShortcuts; i++) {
      this.unregister(`${this.modifier}+${i}`);
    }

    // Register new shortcuts
    apps.slice(0, this.maxShortcuts).forEach((app, index) => {
      const num = index + 1;
      this.register(
        num.toString(),
        () => {
          this.emit("appLaunch", { app, shortcut: num });
        },
        `Open ${app.name}`
      );
    });
  }

  /**
   * Get all registered shortcuts
   */
  getAll() {
    return Array.from(this.shortcuts.entries()).map(([shortcut, callback]) => ({
      shortcut,
      callback,
    }));
  }

  /**
   * Emit event
   */
  emit(event, data) {
    const customEvent = new CustomEvent(`shortcuts:${event}`, { detail: data });
    document.dispatchEvent(customEvent);
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    document.removeEventListener("keydown", this.handleKeyPress.bind(this));
    this.shortcuts.clear();
  }
}

/**
 * ============================================
 * APP NOTES MODULE
 * ============================================
 * Add and manage notes per app
 */

class AppNotes {
  constructor(options = {}) {
    this.storageKey = options.storageKey || "onefav_app_notes";
    this.notes = this.load();
  }

  /**
   * Load notes from storage
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading app notes:", error);
      return {};
    }
  }

  /**
   * Save notes to storage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
    } catch (error) {
      console.error("Error saving app notes:", error);
    }
  }

  /**
   * Get note for app
   */
  get(appId) {
    return this.notes[appId] || null;
  }

  /**
   * Set note for app
   */
  set(appId, note) {
    if (note && note.trim()) {
      this.notes[appId] = {
        text: note.trim(),
        created: this.notes[appId]?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      };
    } else {
      delete this.notes[appId];
    }
    this.save();
  }

  /**
   * Delete note
   */
  delete(appId) {
    delete this.notes[appId];
    this.save();
  }

  /**
   * Check if app has note
   */
  has(appId) {
    return !!this.notes[appId];
  }

  /**
   * Get all notes
   */
  getAll() {
    return { ...this.notes };
  }

  /**
   * Export notes
   */
  export() {
    return {
      notes: this.notes,
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Import notes
   */
  import(data) {
    if (data && data.notes) {
      this.notes = { ...this.notes, ...data.notes };
      this.save();
    }
  }
}

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    UIEnhancements,
    KeyboardShortcuts,
    AppNotes,
  };
}
