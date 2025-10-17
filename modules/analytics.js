/**
 * ============================================
 * ANALYTICS & TRACKING MODULE
 * ============================================
 * Track app usage, leer patronen, en genereer smart suggestions
 */

class AppAnalytics {
  constructor(options = {}) {
    this.storageKey = options.storageKey || "onefav_analytics";
    this.enabled = options.enabled !== false;
    this.retentionDays = options.retentionDays || 90;
    this.data = this.loadData();
  }

  /**
   * Load analytics data from storage
   */
  loadData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return this.getDefaultData();

      const data = JSON.parse(stored);
      this.cleanOldData(data);
      return data;
    } catch (error) {
      console.error("Error loading analytics:", error);
      return this.getDefaultData();
    }
  }

  /**
   * Get default data structure
   */
  getDefaultData() {
    return {
      apps: {}, // Per-app statistics
      sessions: [], // User sessions
      searches: [], // Search history
      lastCleanup: Date.now(),
    };
  }

  /**
   * Save data to storage
   */
  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.error("Error saving analytics:", error);
    }
  }

  /**
   * Track app open
   */
  trackAppOpen(app) {
    if (!this.enabled || !app) return;

    const appId = app.id;
    const now = new Date();

    // Initialize app data if needed
    if (!this.data.apps[appId]) {
      this.data.apps[appId] = {
        id: appId,
        name: app.name,
        totalOpens: 0,
        firstOpened: now.toISOString(),
        lastOpened: null,
        hourlyPattern: new Array(24).fill(0),
        weekdayPattern: new Array(7).fill(0),
        monthlyPattern: new Array(12).fill(0),
        openHistory: [],
        followedBy: {}, // Which apps are opened after this one
        averageSessionTime: 0,
      };
    }

    const appData = this.data.apps[appId];

    // Update statistics
    appData.totalOpens++;
    appData.lastOpened = now.toISOString();
    appData.hourlyPattern[now.getHours()]++;
    appData.weekdayPattern[now.getDay()]++;
    appData.monthlyPattern[now.getMonth()]++;

    // Add to history (keep last 100 opens)
    appData.openHistory.push({
      timestamp: now.toISOString(),
      hour: now.getHours(),
      day: now.getDay(),
    });

    if (appData.openHistory.length > 100) {
      appData.openHistory = appData.openHistory.slice(-100);
    }

    // Track app sequence (what app was opened before this)
    const lastApp = localStorage.getItem("lastOpenedApp");
    if (lastApp && lastApp !== appId) {
      if (!this.data.apps[lastApp]) {
        this.data.apps[lastApp] = this.data.apps[appId]; // Copy structure
      }
      if (!this.data.apps[lastApp].followedBy[appId]) {
        this.data.apps[lastApp].followedBy[appId] = 0;
      }
      this.data.apps[lastApp].followedBy[appId]++;
    }

    localStorage.setItem("lastOpenedApp", appId);

    this.saveData();

    // Emit event for other modules
    this.emit("appOpened", { app, appData });
  }

  /**
   * Track search query
   */
  trackSearch(query, resultCount = 0) {
    if (!this.enabled || !query) return;

    this.data.searches.push({
      query,
      resultCount,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 searches
    if (this.data.searches.length > 100) {
      this.data.searches = this.data.searches.slice(-100);
    }

    this.saveData();
  }

  /**
   * Get most used apps
   */
  getMostUsedApps(limit = 10, minOpens = 1) {
    return Object.values(this.data.apps)
      .filter((app) => app.totalOpens >= minOpens)
      .sort((a, b) => b.totalOpens - a.totalOpens)
      .slice(0, limit);
  }

  /**
   * Get recently opened apps
   */
  getRecentlyOpened(limit = 10) {
    return Object.values(this.data.apps)
      .filter((app) => app.lastOpened)
      .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
      .slice(0, limit);
  }

  /**
   * Get smart suggestions based on current context
   */
  getSmartSuggestions(options = {}) {
    const {
      limit = 6,
      timeWeight = 2,
      frequencyWeight = 1,
      recentWeight = 1.5,
      sequenceWeight = 1.2,
    } = options;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const lastApp = localStorage.getItem("lastOpenedApp");

    const suggestions = Object.values(this.data.apps)
      .map((app) => {
        let score = 0;

        // Time-based score (apps used around this time)
        const hourScore = app.hourlyPattern[currentHour] || 0;
        const dayScore = app.weekdayPattern[currentDay] || 0;
        score += (hourScore + dayScore) * timeWeight;

        // Frequency score
        score += app.totalOpens * frequencyWeight;

        // Recency score (recently used apps)
        if (app.lastOpened) {
          const hoursSinceOpen =
            (Date.now() - new Date(app.lastOpened)) / (1000 * 60 * 60);
          if (hoursSinceOpen < 24) {
            score += (24 - hoursSinceOpen) * recentWeight;
          }
        }

        // Sequence score (apps often opened after last app)
        if (lastApp && this.data.apps[lastApp]?.followedBy[app.id]) {
          score += this.data.apps[lastApp].followedBy[app.id] * sequenceWeight;
        }

        return { ...app, suggestionScore: score };
      })
      .filter((app) => app.suggestionScore > 0)
      .sort((a, b) => b.suggestionScore - a.suggestionScore)
      .slice(0, limit);

    return suggestions;
  }

  /**
   * Get time-based suggestions
   */
  getTimeBasedSuggestions(hour = new Date().getHours(), limit = 5) {
    return Object.values(this.data.apps)
      .map((app) => ({
        ...app,
        hourScore: app.hourlyPattern[hour] || 0,
      }))
      .filter((app) => app.hourScore > 0)
      .sort((a, b) => b.hourScore - a.hourScore)
      .slice(0, limit);
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const apps = Object.values(this.data.apps);
    const totalOpens = apps.reduce((sum, app) => sum + app.totalOpens, 0);
    const totalApps = apps.length;
    const activeApps = apps.filter((app) => app.totalOpens > 0).length;

    // Most active hours
    const hourlyTotal = new Array(24).fill(0);
    apps.forEach((app) => {
      app.hourlyPattern.forEach((count, hour) => {
        hourlyTotal[hour] += count;
      });
    });
    const mostActiveHour = hourlyTotal.indexOf(Math.max(...hourlyTotal));

    // Most active day
    const daylyTotal = new Array(7).fill(0);
    apps.forEach((app) => {
      app.weekdayPattern.forEach((count, day) => {
        daylyTotal[day] += count;
      });
    });
    const mostActiveDay = daylyTotal.indexOf(Math.max(...daylyTotal));

    const dayNames = [
      "Zondag",
      "Maandag",
      "Dinsdag",
      "Woensdag",
      "Donderdag",
      "Vrijdag",
      "Zaterdag",
    ];

    return {
      totalOpens,
      totalApps,
      activeApps,
      mostActiveHour,
      mostActiveDay: dayNames[mostActiveDay],
      averageOpensPerDay: this.getAverageOpensPerDay(),
      topApps: this.getMostUsedApps(5),
    };
  }

  /**
   * Get average opens per day
   */
  getAverageOpensPerDay() {
    const apps = Object.values(this.data.apps);
    if (apps.length === 0) return 0;

    const oldestApp = apps.reduce((oldest, app) => {
      const appDate = new Date(app.firstOpened);
      return appDate < oldest ? appDate : oldest;
    }, new Date());

    const daysSinceStart = Math.max(
      1,
      Math.ceil((Date.now() - oldestApp) / (1000 * 60 * 60 * 24))
    );
    const totalOpens = apps.reduce((sum, app) => sum + app.totalOpens, 0);

    return Math.round(totalOpens / daysSinceStart);
  }

  /**
   * Clean old data based on retention period
   */
  cleanOldData(data) {
    const cutoffDate = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    // Clean search history
    if (data.searches) {
      data.searches = data.searches.filter(
        (search) => new Date(search.timestamp) > cutoffDate
      );
    }

    // Clean app history
    Object.values(data.apps || {}).forEach((app) => {
      if (app.openHistory) {
        app.openHistory = app.openHistory.filter(
          (entry) => new Date(entry.timestamp) > cutoffDate
        );
      }
    });

    data.lastCleanup = Date.now();
  }

  /**
   * Simple event emitter
   */
  emit(event, data) {
    const customEvent = new CustomEvent(`analytics:${event}`, { detail: data });
    document.dispatchEvent(customEvent);
  }

  /**
   * Export analytics data
   */
  exportData() {
    return {
      ...this.data,
      exportDate: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * Reset all analytics
   */
  reset() {
    this.data = this.getDefaultData();
    this.saveData();
    localStorage.removeItem("lastOpenedApp");
  }
}

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = AppAnalytics;
}
