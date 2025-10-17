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

### **localStorage (customCollections)** - Persoonlijke Collections
- Zelf aangemaakte collections
- Gewijzigde default collections
- Worden gemerged met JSON collections

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

## 🔧 Troubleshooting

**Collection apps tonen niet?**
→ Check of app namen exact matchen met apps.json

**Collections verdwijnen na reload?**
→ Check of collections.json correct is en geen syntax errors heeft

**Kan default collection niet bewerken?**
→ Je kunt ze wel bewerken, wijzigingen worden in localStorage opgeslagen

## 🚀 Tips

- Gebruik JSON voor gedeelde/standaard collections
- Gebruik UI voor persoonlijke collections  
- Export regelmatig je configuratie als backup
- Test nieuwe collections eerst in de UI
