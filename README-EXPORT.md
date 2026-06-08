# Export du Guide de Configuration en PDF

## 📁 Fichiers générés

✅ **PDF disponible**: `exports/Guide-Configuration-Circuits-BSIC.pdf` (173 KB)

## 🚀 Méthodes d'exportation

### Méthode 1: Automatique (Recommandée)
```bash
# Exécuter le script de conversion
.\convert-to-pdf.bat
```

### Méthode 2: PowerShell
```powershell
# Conversion directe avec PowerShell
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("Guide-Configuration-Circuits-BSIC.html")
$doc.SaveAs("exports\Guide-Configuration-Circuits-BSIC.pdf", 17)
$doc.Close()
$word.Quit()
```

### Méthode 3: Navigateur
1. Ouvrir `Guide-Configuration-Circuits-BSIC.html`
2. Ctrl+P → Imprimer en PDF
3. Enregistrer dans le dossier `exports`

### Méthode 4: Outils en ligne
- https://md2pdf.netlify.app/
- https://markdowntopdf.com/
- https://www.markdowntopdf.com/

## 📋 Contenu du PDF

Le guide complet inclut:
- Vue d'ensemble des composants
- Processus de configuration détaillé
- Templates disponibles
- Bonnes pratiques
- Intégration technique
- Dépannage

## 🎨 Design

Le PDF utilise le design BSIC:
- Couleurs corporatives (bleu marine, orange BSIC)
- Typographie moderne (Inter)
- Mise en page professionnelle
- Optimisé pour l'impression

## 📊 Statistiques

- **Pages**: ~15 pages
- **Taille**: 173 KB
- **Format**: A4 optimisé
- **Qualité**: Haute définition

## 🔧 Personnalisation

Pour modifier le style:
1. Éditer `export-readme-pdf.js`
2. Modifier les styles CSS dans `createFullHTML()`
3. Régénérer avec `.\convert-to-pdf.bat`

---
*Document généré le 06/03/2026 - Système BSIC*
