/**
 * ============================================
 * ONEFAV FEATURES CONFIGURATION
 * ============================================
 * Centraal configuratiebestand voor alle features
 * Beheer hier welke features actief zijn
 */

// Feature toggles - eenvoudig aan/uit te zetten
const FEATURES = {
  // Zoek & Filter Features
  fuzzySearch: true, // Slimme zoekfunctie (gml → Gmail)
  tagFiltering: true, // Filter op meerdere tags tegelijk
  recentSearches: true, // Toon recent gezochte apps
  smartSuggestions: true, // AI-achtige suggesties op basis van gedrag

  // Visuele Feedback
  recentBadge: true, // Toon "Recent" badge op apps
  usageCounter: true, // Toon hoe vaak app is geopend
  hoverEffects: true, // Lift effect op hover
  loadingSkeleton: true, // Skeleton loader ipv spinner

  // Homepage Features
  mostUsed: true, // Toon meest gebruikte apps sectie
  timeBasedSuggestions: true, // Verschillende apps per tijdstip
  usageStats: true, // Usage statistics widget
  customBackground: false, // Custom achtergrond (nog niet geïmplementeerd)

  // Productiviteit
  quickLaunchShortcuts: true, // Alt+1, Alt+2, etc voor snelle launch
  appGroups: true, // Open meerdere apps tegelijk
  scheduledLaunches: false, // Auto-open apps (nog niet geïmplementeerd)
  focusMode: false, // Verberg afleidende apps (nog niet geïmplementeerd)

  // Data & Analytics
  detailedAnalytics: true, // Gedetailleerde statistieken
  autoBackup: true, // Automatische backups naar localStorage
  exportEnhanced: true, // Verbeterde export opties

  // Customization
  customAppIcons: true, // Upload eigen iconen
  layoutOptions: true, // Verschillende layout opties
  appCardStyles: true, // Verschillende card designs
  colorCustomization: true, // Custom kleuren per app

  // Smart Features
  appNotes: true, // Notities per app
  bulkActions: true, // Selecteer meerdere apps tegelijk
  soundEffects: false, // Klik geluiden (opt-in)

  // Performance
  lazyLoading: true, // Lazy load app icons
  cacheEnabled: true, // Cache app data
};

// Feature settings - configuratie opties per feature
const FEATURE_SETTINGS = {
  fuzzySearch: {
    minScore: 0.3, // Minimum match score (0-1)
    maxResults: 10, // Max aantal resultaten
  },

  recentSearches: {
    maxItems: 10, // Aantal recent searches
    showInSearch: true, // Toon in zoekbalk
  },

  smartSuggestions: {
    maxSuggestions: 6, // Aantal suggesties
    updateInterval: 300000, // Update elke 5 minuten (ms)
    learningEnabled: true, // Leer van gebruikspatronen
  },

  mostUsed: {
    maxApps: 8, // Aantal apps in "Most Used"
    minOpens: 2, // Minimum aantal keer geopend
  },

  usageStats: {
    trackingEnabled: true, // Track app opens
    retentionDays: 90, // Bewaar data voor X dagen
  },

  autoBackup: {
    enabled: true,
    interval: 3600000, // Elke uur (ms)
    maxBackups: 5, // Max aantal backups
  },

  quickLaunchShortcuts: {
    enabled: true,
    modifier: "Alt", // Alt, Ctrl, of Shift
    maxShortcuts: 9, // Alt+1 t/m Alt+9
  },

  appGroups: {
    enabled: true,
    maxAppsPerGroup: 10, // Max apps per groep
  },

  hoverEffects: {
    liftAmount: "4px", // Hoeveel omhoog bij hover
    shadowIntensity: "medium", // low, medium, high
  },

  loadingSkeleton: {
    animationSpeed: 1.5, // Seconden
    showCount: 8, // Aantal skeleton items
  },
};

// Analytics tracking configuration
const ANALYTICS_CONFIG = {
  trackAppOpens: true,
  trackSearchQueries: true,
  trackWorkspaceUsage: true,
  trackTimeOfDay: true,
  trackDayOfWeek: true,
  trackAppSequences: true, // Welke apps worden na elkaar geopend
};

// UI Preferences
const UI_PREFERENCES = {
  defaultView: "grid", // 'grid', 'list', 'compact'
  animationSpeed: "normal", // 'slow', 'normal', 'fast', 'none'
  showTooltips: true,
  showBadges: true,
  showAppCount: true,
  compactMode: false,
};

// Export configuration
export { FEATURES, FEATURE_SETTINGS, ANALYTICS_CONFIG, UI_PREFERENCES };

// Voor backwards compatibility (als modules niet worden gebruikt)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FEATURES,
    FEATURE_SETTINGS,
    ANALYTICS_CONFIG,
    UI_PREFERENCES,
  };
}
