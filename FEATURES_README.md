# OneFav Enhanced Features

## 📚 Overzicht

Dit document beschrijft alle enhanced features en hoe je deze kunt in-/uitschakelen.

## 🎛️ Feature Configuratie

Alle features kunnen worden geconfigureerd via:
1. **Settings Modal** → Klik op het tandwiel icoon → "✨ Geavanceerde Features"
2. **features-config.js** → Bewerk het `FEATURES` object direct

## 🚀 Features Lijst

### 🔍 Zoek & Filter Features

#### Fuzzy Search
- **Wat**: Slimme zoekfunctie met tolerantie voor typefouten
- **Voorbeelden**: 
  - `gml` vindt Gmail
  - `ytube` vindt YouTube  
  - `chat` vindt ChatGPT
- **Configuratie**: `FEATURES.fuzzySearch`
- **Settings**: "Fuzzy Search" toggle

#### Tag Filtering
- **Wat**: Filter apps op meerdere tags met AND/OR logica
- **Gebruik**: Selecteer meerdere tags om te filteren
- **Configuratie**: `FEATURES.tagFiltering`
- **Settings**: "Tag Filtering" toggle

#### Recent Searches
- **Wat**: Toon de laatste 10 gezochte apps voor snelle toegang
- **Gebruik**: Recent searches verschijnen onder de zoekbalk
- **Configuratie**: `FEATURES.recentSearches`
- **Settings**: "Recent Searches" toggle
- **Opties**: `FEATURE_SETTINGS.recentSearches.maxItems` (aantal items)

#### Smart Suggestions
- **Wat**: AI-achtige suggesties op basis van gebruikspatronen
- **Hoe werkt het**:
  - Leert van je gedrag
  - Suggereert apps op basis van tijdstip
  - Gebruikt gebruiksfrequentie
  - Herkent app-sequenties
- **Configuratie**: `FEATURES.smartSuggestions`
- **Settings**: "Smart Suggestions" toggle
- **Opties**: `FEATURE_SETTINGS.smartSuggestions`

---

### 🎨 Visuele Feedback

#### Recent Badge
- **Wat**: Toont 🔥 badge op apps die recent zijn geopend
- **Timing**: Verschijnt bij apps geopend in laatste 24 uur
- **Configuratie**: `FEATURES.recentBadge`
- **Settings**: "Recent Badge" toggle

#### Usage Counter
- **Wat**: Toont hoe vaak een app is geopend
- **Weergave**: Kleine badge rechtsonder op app icoon
- **Configuratie**: `FEATURES.usageCounter`
- **Settings**: "Usage Counter" toggle

#### Enhanced Hover Effects
- **Wat**: Lift effect wanneer je over een app hovert
- **Effect**: App beweegt omhoog met schaduwen
- **Configuratie**: `FEATURES.hoverEffects`
- **Settings**: "Enhanced Hover" toggle
- **Opties**: `FEATURE_SETTINGS.hoverEffects`

#### Loading Skeleton
- **Wat**: Mooie skeleton loader tijdens laden
- **Configuratie**: `FEATURES.loadingSkeleton`
- **Opties**: `FEATURE_SETTINGS.loadingSkeleton`

---

### 🏠 Homepage Features

#### Most Used Section
- **Wat**: Sectie die je meest gebruikte apps toont
- **Positie**: Bovenaan de homepage
- **Configuratie**: `FEATURES.mostUsed`
- **Settings**: "Most Used Section" toggle
- **Opties**: 
  - `FEATURE_SETTINGS.mostUsed.maxApps` (aantal apps)
  - `FEATURE_SETTINGS.mostUsed.minOpens` (minimum keer geopend)

#### Usage Statistics Widget
- **Wat**: Dashboard met gebruiksstatistieken
- **Toont**:
  - Totaal aantal opens
  - Meest actieve uur
  - Meest actieve dag
  - Top apps
- **Configuratie**: `FEATURES.usageStats`
- **Settings**: "Usage Statistics" toggle

---

### ⚡ Productiviteit Features

#### Quick Launch Shortcuts
- **Wat**: Sneltoetsen om apps te openen
- **Gebruik**: Alt+1 t/m Alt+9
- **Configuratie**: `FEATURES.quickLaunchShortcuts`
- **Settings**: "Quick Launch Shortcuts" toggle
- **Opties**: `FEATURE_SETTINGS.quickLaunchShortcuts`
  - `modifier`: 'Alt', 'Ctrl', of 'Shift'
  - `maxShortcuts`: Maximum aantal shortcuts

#### App Notes
- **Wat**: Voeg notities toe aan apps
- **Gebruik**: Rechtermuisknop → "Add Note"
- **Configuratie**: `FEATURES.appNotes`
- **Settings**: "App Notes" toggle

---

### 📊 Data & Analytics

#### Usage Tracking
- **Wat**: Track wanneer en hoe vaak apps worden geopend
- **Data**: 
  - Per uur patroon
  - Per dag patroon
  - App sequenties
- **Configuratie**: `ANALYTICS_CONFIG.trackAppOpens`
- **Settings**: "Track App Usage" toggle
- **Privacy**: Alle data blijft lokaal in je browser

#### Auto Backup
- **Wat**: Automatische backups naar localStorage
- **Frequentie**: Elk uur (configureerbaar)
- **Configuratie**: `FEATURES.autoBackup`
- **Settings**: "Auto Backup" toggle
- **Opties**: `FEATURE_SETTINGS.autoBackup`

---

## 🔧 Configuratie Bestanden

### features-config.js
Centraal configuratiebestand met alle feature toggles en settings.

```javascript
const FEATURES = {
  fuzzySearch: true,
  tagFiltering: true,
  recentSearches: true,
  // ... etc
};
```

### Modules

#### modules/fuzzy-search.js
- `FuzzySearch` class
- Methodes: `search()`, `fuzzyMatch()`, `highlightMatches()`

#### modules/analytics.js
- `AppAnalytics` class
- Methodes: `trackAppOpen()`, `getSmartSuggestions()`, `getMostUsedApps()`

#### modules/search-filters.js
- `RecentSearches` class
- `TagFilter` class

#### modules/ui-enhancements.js
- `UIEnhancements` class
- `KeyboardShortcuts` class
- `AppNotes` class

---

## 🎨 CSS Classes

### Feature Specific Classes
- `.recent-badge` - 🔥 Recent badge
- `.usage-counter` - Usage counter badge
- `.app-hover-enhanced` - Enhanced hover effect
- `.tag-chip` - Tag filter chip
- `.recent-search-chip` - Recent search chip
- `.smart-suggestions-container` - Smart suggestions wrapper
- `.usage-stats-widget` - Statistics widget
- `.toast` - Toast notification
- `.app-skeleton` - Loading skeleton

---

## 💾 localStorage Keys

- `onefav_features` - Feature toggles
- `onefav_analytics` - Analytics data
- `onefav_recent_searches` - Recent searches
- `onefav_app_notes` - App notes
- `lastOpenedApp` - Last opened app ID

---

## 🎯 Hoe Features Uitschakelen

### Via Settings
1. Klik op ⚙️ Settings button (rechtsboven)
2. Open "✨ Geavanceerde Features"
3. Toggle de feature die je wilt in/uitschakelen
4. Sommige features vereisen een page reload

### Via Code
Bewerk `features-config.js`:

```javascript
const FEATURES = {
  fuzzySearch: false,  // Uitgeschakeld
  tagFiltering: true,  // Ingeschakeld
  // ... etc
};
```

### Reset naar Standaard
1. Settings → Geavanceerde Features
2. Klik "Reset Features naar Standaard"
3. Of: `localStorage.removeItem('onefav_features')`

---

## 🔄 Feature Dependencies

Sommige features zijn afhankelijk van andere:

- **Smart Suggestions** vereist **Usage Tracking**
- **Most Used** vereist **Usage Tracking**
- **Recent Badge** vereist **Usage Tracking**

---

## 📈 Performance

### Optimalisaties
- Lazy loading van app icons
- Debounced search
- Efficient caching
- Minimal DOM manipulatie

### Data Retention
- Analytics data: 90 dagen (configureerbaar)
- Recent searches: laatste 10
- Backups: laatste 5

---

## 🐛 Troubleshooting

### Features werken niet
1. Check browser console voor errors
2. Verifieer dat module bestanden zijn geladen
3. Check localStorage quota
4. Try `localStorage.clear()` en reload

### Performance Issues
1. Verlaag `retentionDays` in analytics
2. Schakel `loadingSkeleton` uit
3. Verlaag `maxResults` in fuzzy search

---

## 🚀 Toekomstige Features (Roadmap)

- [ ] Cloud sync
- [ ] Custom themes
- [ ] Advanced analytics dashboard
- [ ] App groups/chains
- [ ] Scheduled launches
- [ ] Focus mode
- [ ] Export to CSV/PDF
- [ ] Browser extension

---

## 📝 Notes

- Alle data blijft lokaal in je browser
- Geen externe API calls
- Privacy-first design
- Modulair en uitbreidbaar
- Gemakkelijk aan/uit te zetten

---

**Gemaakt met ❤️ voor OneFav**
