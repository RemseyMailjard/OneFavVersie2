# Collections Beheer - JSON Configuratie

## 📁 Bestandsstructuur

```
Prototypes/
├── index.html
├── script.js
├── styles.css
├── apps.json          ← Standaard apps
└── collections.json   ← Standaard collections (nieuw!)
```

## 🎯 Hoe het werkt

### **collections.json** - Standaard Collections
Dit bestand bevat vooraf gedefinieerde collections die automatisch worden geladen:

```json
{
    "collections": [
        {
            "id": "morning-routine",
            "name": "Morning Routine",
            "description": "Apps die ik elke ochtend gebruik",
            "color": "blue",
            "apps": ["Gmail", "Calendar", "YouTube"]
        }
    ]
}
```

**✨ Nieuw: App Integratie**
- Collection app namen worden automatisch opgezocht in `apps.json`
- Volledige app objecten (icon, kleur, URL) zijn beschikbaar
- App iconen worden getoond als preview in de collection lijst
- Waarschuwing als een app niet bestaat in apps.json

### **localStorage (customCollections)** - Persoonlijke Collections
- Zelf aangemaakte collections
- Gewijzigde default collections
- Worden gemerged met JSON collections

## 🎨 Visuele Features

### **App Icon Preview**
Collections tonen nu de eerste 5 app iconen:
- Kleuren en iconen uit apps.json
- "+X meer" badge voor extra apps
- Hover tooltips met app namen

### **Validatie Badges**
- 📘 **Default**: Collection komt uit collections.json
- ⚠️ **X missing**: Sommige apps niet gevonden in apps.json

## 📝 Collection Structuur

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | string | Unieke identifier (gebruik kebab-case) |
| `name` | string | Weergave naam |
| `description` | string | Optionele beschrijving |
| `color` | string | Kleur theme: blue, purple, pink, red, orange, yellow, green, teal |
| `apps` | array | Lijst van app namen (moet exact matchen met apps.json) |

## 🔄 Merge Logica

1. **collections.json** wordt eerst geladen (default collections)
2. **localStorage** wordt geladen (custom collections)
3. Collections worden gemerged:
   - Zelfde ID? → localStorage overschrijft JSON
   - Nieuwe ID? → Wordt toegevoegd aan lijst
4. Alles wordt getoond in de UI

## ✏️ Collections Bewerken

### Via UI (Aanbevolen)
1. Klik op Collections knop of Ctrl+G
2. Bewerk met ✏️ knop
3. Wordt automatisch opgeslagen in localStorage

### Via collections.json (Voor defaults)
1. Bewerk `collections.json`
2. Herlaad de pagina
3. Default collections worden bijgewerkt (tenzij lokaal overschreven)

## 💾 Export/Import

**Exporteren:**
- Settings → Export Configuration
- Bevat: apps, collections, pinned apps, theme, volgorde

**Importeren:**
- Settings → Import Configuration
- Selecteer JSON bestand
- Collections worden samengevoegd

## 🎨 Beschikbare Kleuren

```
blue, purple, pink, red, orange, yellow, green, teal
```

## 📋 Voorbeeld: Nieuwe Collection Toevoegen

**In collections.json:**
```json
{
    "id": "design-tools",
    "name": "Design Tools",
    "description": "Mijn design workflow",
    "color": "pink",
    "apps": ["Drive", "Photos", "Slides"]
}
```

**App namen moeten exact matchen met apps.json!**

## ⚠️ Belangrijke Opmerkingen

1. **App Namen**: Moeten exact overeenkomen met `name` in `apps.json`
2. **Collection IDs**: Gebruik kebab-case (lowercase-met-streepjes)
3. **Default Badge**: Collections uit JSON krijgen een "Default" badge
4. **Verwijderen**: Default collections verwijderen? Ze komen terug na reload (zit in JSON)
5. **App Icons**: Worden automatisch uit apps.json gehaald en getoond als preview
6. **Validatie**: Console toont waarschuwing als apps niet gevonden worden

## 🔧 Troubleshooting

**Collection apps tonen niet?**
→ Check of app namen exact matchen met apps.json
→ Open browser console (F12) voor waarschuwingen

**Collections verdwijnen na reload?**
→ Check of collections.json correct is en geen syntax errors heeft

**Kan default collection niet bewerken?**
→ Je kunt ze wel bewerken, wijzigingen worden in localStorage opgeslagen

**"⚠️ X missing" badge verschijnt?**
→ Een of meer apps uit de collection bestaan niet in apps.json
→ Check spelfouten in app namen
→ Console toont welke apps ontbreken

**App iconen laden niet?**
→ Collections gebruiken app objecten uit apps.json
→ Check of apps.json correct geladen is
→ Herlaad de pagina

## 🚀 Tips

- Gebruik JSON voor gedeelde/standaard collections
- Gebruik UI voor persoonlijke collections  
- Export regelmatig je configuratie als backup
- Test nieuwe collections eerst in de UI
- Browser console (F12) toont nuttige info over collections
- App iconen maken collections visueel herkenbaar

## 🔨 Developer API

Voor ontwikkelaars die collections programmatisch willen gebruiken:

### **getCollectionApps(collection)**
Haalt volledige app objecten op uit apps.json:
```javascript
const collection = collections.find(c => c.id === 'morning-routine');
const apps = getCollectionApps(collection);
// Returns: [{ name: "Gmail", icon: {...}, color: {...}, url: "..." }, ...]
```

### **validateCollectionApps(collection)**
Valideert of alle apps bestaan:
```javascript
const { validApps, missingApps } = validateCollectionApps(collection);
console.log(`Gevonden: ${validApps.length}, Ontbrekend: ${missingApps.length}`);
```

### **isDefaultCollection(collectionId)**
Check of collection uit JSON komt:
```javascript
if (isDefaultCollection('morning-routine')) {
  console.log('Dit is een default collection');
}
```

Deze functies zorgen ervoor dat collections altijd toegang hebben tot de volledige app data uit apps.json! 🎉
