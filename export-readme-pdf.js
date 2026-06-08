const fs = require('fs');
const path = require('path');

// Script pour convertir le README.md en PDF
// Ce script utilise une approche simple avec HTML + CSS

const readmePath = path.join(__dirname, 'src', 'app', 'pages', 'bacircuit', 'README.md');
const outputPath = path.join(__dirname, 'Guide-Configuration-Circuits-BSIC.pdf');

console.log('Lecture du fichier README.md...');

try {
  // Lire le contenu du README
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  // Convertir Markdown en HTML de base
  let htmlContent = convertMarkdownToHTML(readmeContent);
  
  // Créer le HTML complet avec le style BSIC
  const fullHTML = createFullHTML(htmlContent);
  
  console.log('Conversion en HTML terminée...');
  console.log('Pour générer le PDF, vous avez plusieurs options :');
  console.log('');
  console.log('Option 1: Utiliser un navigateur (recommandé)');
  console.log('1. Copiez le code HTML ci-dessous');
  console.log('2. Collez-le dans un fichier .html');
  console.log('3. Ouvrez dans un navigateur et imprimez en PDF');
  console.log('');
  console.log('Option 2: Utiliser Puppeteer (si installé)');
  console.log('npm install puppeteer');
  console.log('node export-readme-pdf.js');
  console.log('');
  console.log('Option 3: Utiliser un outil en ligne');
  console.log('Copiez le contenu Markdown et utilisez:');
  console.log('- https://md2pdf.netlify.app/');
  console.log('- https://markdowntopdf.com/');
  console.log('- https://www.markdowntopdf.com/');
  console.log('');
  
  // Sauvegarder le HTML pour référence
  const htmlPath = path.join(__dirname, 'Guide-Configuration-Circuits-BSIC.html');
  fs.writeFileSync(htmlPath, fullHTML);
  console.log(`Fichier HTML sauvegardé: ${htmlPath}`);
  
  // Afficher le contenu HTML pour copier-coller
  console.log('='.repeat(80));
  console.log('CONTENU HTML À COPIER:');
  console.log('='.repeat(80));
  console.log(fullHTML);
  
} catch (error) {
  console.error('Erreur:', error.message);
}

function convertMarkdownToHTML(markdown) {
  let html = markdown;
  
  // Titres
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  
  // Gras
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italique
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Code inline
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Liens
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Listes non ordonnées
  html = html.replace(/^\* (.+)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Listes ordonnées
  html = html.replace(/^\d+\. (.+)/gim, '<li>$1</li>');
  
  // Paragraphes
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Nettoyer les paragraphes autour des titres et listes
  html = html.replace(/<p><h([1-6])>/g, '<h$1>');
  html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
  html = html.replace(/<p><ul>/g, '<ul>');
  html = html.replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><pre>/g, '<pre>');
  html = html.replace(/<\/pre><\/p>/g, '</pre>');
  
  return html;
}

function createFullHTML(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guide de Configuration des Circuits de Validation BSIC</title>
    <style>
        /* Styles BSIC */
        :root {
            --color-primary: #003d82;
            --color-primary-light: #0066cc;
            --color-secondary: #f58220;
            --color-gray-50: #f9fafb;
            --color-gray-100: #f3f4f6;
            --color-gray-200: #e5e7eb;
            --color-gray-300: #d1d5db;
            --color-gray-600: #4b5563;
            --color-gray-700: #374151;
            --color-gray-800: #1f2937;
            --color-gray-900: #111827;
            --color-white: #ffffff;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        body {
            font-family: var(--font-family);
            line-height: 1.6;
            color: var(--color-gray-800);
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: var(--color-white);
        }

        h1, h2, h3, h4, h5, h6 {
            color: var(--color-primary);
            margin-top: 2em;
            margin-bottom: 1em;
            font-weight: 600;
        }

        h1 {
            font-size: 2.5em;
            border-bottom: 3px solid var(--color-secondary);
            padding-bottom: 0.5em;
            margin-bottom: 1.5em;
        }

        h2 {
            font-size: 2em;
            border-bottom: 2px solid var(--color-primary-light);
            padding-bottom: 0.3em;
        }

        h3 {
            font-size: 1.5em;
            color: var(--color-primary-light);
        }

        h4 {
            font-size: 1.2em;
            color: var(--color-gray-700);
        }

        p {
            margin-bottom: 1em;
            text-align: justify;
        }

        strong {
            color: var(--color-primary);
            font-weight: 600;
        }

        em {
            color: var(--color-gray-600);
        }

        code {
            background: var(--color-gray-100);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            color: var(--color-primary);
        }

        pre {
            background: var(--color-gray-50);
            border: 1px solid var(--color-gray-200);
            border-radius: 8px;
            padding: 1em;
            overflow-x: auto;
            margin: 1em 0;
        }

        pre code {
            background: none;
            padding: 0;
            color: var(--color-gray-800);
        }

        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }

        li {
            margin-bottom: 0.5em;
        }

        a {
            color: var(--color-primary-light);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }

        a:hover {
            border-bottom-color: var(--color-primary-light);
        }

        blockquote {
            border-left: 4px solid var(--color-secondary);
            margin: 1em 0;
            padding: 1em 1.5em;
            background: var(--color-gray-50);
            font-style: italic;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }

        th, td {
            border: 1px solid var(--color-gray-200);
            padding: 0.75em;
            text-align: left;
        }

        th {
            background: var(--color-primary);
            color: var(--color-white);
            font-weight: 600;
        }

        /* Styles pour l'impression */
        @media print {
            body {
                padding: 20px;
                font-size: 12pt;
            }

            h1 {
                font-size: 2em;
                page-break-after: avoid;
            }

            h2, h3 {
                page-break-after: avoid;
            }

            pre, blockquote {
                page-break-inside: avoid;
            }

            a {
                color: var(--color-primary);
                text-decoration: underline;
            }
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 3em;
            padding: 2em;
            background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
            color: var(--color-white);
            border-radius: 12px;
        }

        .header h1 {
            color: var(--color-white);
            border: none;
            margin: 0;
        }

        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin-top: 0.5em;
        }

        /* Sections */
        .section {
            margin: 2em 0;
            padding: 1.5em;
            border: 1px solid var(--color-gray-200);
            border-radius: 8px;
            background: var(--color-white);
        }

        .step {
            margin: 1.5em 0;
            padding: 1em;
            border-left: 4px solid var(--color-secondary);
            background: var(--color-gray-50);
        }

        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 1em;
            margin: 1em 0;
        }

        .info {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 1em;
            margin: 1em 0;
        }

        /* Footer */
        .footer {
            margin-top: 3em;
            padding-top: 2em;
            border-top: 2px solid var(--color-gray-200);
            text-align: center;
            color: var(--color-gray-600);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Guide de Configuration des Circuits de Validation BSIC</h1>
        <div class="subtitle">Documentation complète pour la mise en place des workflows d'habilitation</div>
    </div>

    ${content}

    <div class="footer">
        <p><strong>BSIC - GESTSTOCK</strong><br>
        Système de Gestion des Habilitations<br>
        Document généré le ${new Date().toLocaleDateString('fr-FR')}</p>
    </div>
</body>
</html>`;
}
