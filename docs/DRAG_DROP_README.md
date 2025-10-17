# 🎯 Drag & Drop Functionaliteit

## ✨ Features

### 1. **Apps naar Desktop Slepen** 
Sleep een app uit het menu naar je desktop/bestandsverkenner om een snelkoppeling te maken.

**Hoe te gebruiken:**
1. Open het app menu (waffle icon)
2. Klik en houd een app vast
3. Sleep naar je desktop of een map
4. Laat los → Er wordt een link/shortcut aangemaakt

**Technisch:**
- Gebruikt native browser drag API
- Maakt `.url` bestanden op Windows
- Werkt met `text/uri-list` en `DownloadURL` formats
- Visual feedback tijdens drag (50% opacity)

### 2. **Links naar App Menu Slepen**
Sleep een URL/link van buiten (browser, desktop, etc.) naar het app menu om automatisch een nieuwe app aan te maken.

**Hoe te gebruiken:**
1. Open het app menu
2. Sleep een link/URL van:
   - Een browser tab
   - Een bookmark
   - Een .url bestand
   - Tekst met een URL
3. Drop in het app menu
4. Custom app modal opent met pre-filled data:
   - **Naam**: Automatisch van domein (bijv. "Github" van github.com)
   - **URL**: De gedropte link
5. Pas aan en sla op!

**Visual Feedback:**
- 📥 Drop zone indicator verschijnt bij drag over menu
- Blauwe gestippelde border
- "Sleep een link hiernaartoe" bericht
- Auto-hide na drop

## 🎨 Drag States

| State | Visual | Gedrag |
|-------|--------|--------|
| **Hover** | `cursor: grab` | App is draggable |
| **Dragging** | `opacity: 0.5` | App wordt gesleept |
| **Drop Zone Active** | Blauwe border + tekst | Klaar om te droppen |
| **Drop Success** | Modal opent | Auto-fill formulier |

## 🔧 Technische Details

### Drag Events
```javascript
// App → Desktop
dragstart: Stel dataTransfer in met URL
dragend: Reset opacity

// Link → App Menu  
dragenter: Toon drop indicator
dragover: Allow drop (preventDefault)
drop: Verwerk URL, open modal
dragleave: Verberg indicator
```

### Data Formats
Apps worden geëxporteerd met:
- `text/uri-list`: Voor browsers en tools
- `text/plain`: Fallback plain text URL
- `DownloadURL`: Voor bestandssysteem downloads

### Auto-detect App Name
```javascript
URL: https://www.github.com/user/repo
↓
Hostname: github.com
↓  
Domain: github
↓
App Name: "Github"
```

## 💡 Use Cases

### Quick Add Favorite Sites
1. Surf naar je favoriete site
2. Sleep de URL uit adresbalk
3. Drop in app menu → Instant app!

### Export App Collections
1. Sleep apps naar een map
2. Deel de .url bestanden
3. Anderen kunnen ze importeren

### Organize Desktop
1. Maak een "Fav Apps" map op desktop
2. Sleep je meest gebruikte apps erheen
3. Dubbel-klik om te openen

## ⚠️ Browser Compatibiliteit

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Drag to Desktop | ✅ | ✅ | ✅ | ✅ |
| Drop Links | ✅ | ✅ | ✅ | ✅ |
| .url File Creation | ✅ (Windows) | ✅ | ⚠️ (Webloc) | ✅ |

**Safari Note:** Maakt `.webloc` bestanden in plaats van `.url`

## 🚀 Keyboard Modifiers

Tijdens slepen:
- **Ctrl** (Windows) / **Cmd** (Mac): Kopieer mode
- **Shift**: Verplaats mode (indien ondersteund)

## 🎯 Tips

1. **Bulk Import**: Sleep meerdere links tegelijk door ze in een tekstbestand te plaatsen
2. **Quick Bookmarks**: Gebruik als visuele bookmark manager
3. **Team Sharing**: Export app .url bestanden en deel met team
4. **Backup**: Sleep alle apps naar een map voor instant backup

## 🔍 Troubleshooting

**"Link wordt niet gedropt"**
→ Zorg dat je een geldige http/https URL sleept

**"App naam is verkeerd"**
→ Naam wordt auto-gegenereerd, je kunt het altijd aanpassen in de modal

**"Werkt niet op mobiel"**
→ Drag & drop is een desktop feature, gebruik "+" knop op mobiel

**"Bestand wordt niet aangemaakt"**
→ Sommige browsers vragen toestemming voor downloads, check notifications

## 🎨 Aanpassingen

Wijzig drop zone styling in `styles.css`:
```css
/* Wijzig drop zone kleuren */
@keyframes dropZonePulse {
    0%, 100% { border-color: rgb(96, 165, 250); }
    50% { border-color: rgb(59, 130, 246); }
}
```

Wijzig drag opacity in `script.js`:
```javascript
button.addEventListener('dragstart', (e) => {
    button.style.opacity = "0.3"; // Meer transparant
});
```

## 📝 Console Logging

Debug drag & drop in de browser console:
```
🔗 Drag started: Gmail - https://mail.google.com
✅ Link gedropt: Github - https://github.com
```

Handig voor troubleshooting!
