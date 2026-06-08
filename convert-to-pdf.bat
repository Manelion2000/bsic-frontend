@echo off
echo Conversion du README.md en PDF...
echo.

REM Vérifier si le fichier README existe
if not exist "src\app\pages\bacircuit\README.md" (
    echo Erreur: Fichier README.md non trouvé
    pause
    exit /b 1
)

REM Créer le répertoire de sortie s'il n'existe pas
if not exist "exports" mkdir exports

REM Méthode 1: Utiliser PowerShell (Windows 10+)
echo Tentative de conversion avec PowerShell...
powershell -Command "& {try {$word = New-Object -ComObject Word.Application; $word.Visible = $false; $doc = $word.Documents.Open('%cd%\Guide-Configuration-Circuits-BSIC.html'); $doc.SaveAs([ref]('%cd%\exports\Guide-Configuration-Circuits-BSIC.pdf'), [ref]17); $doc.Close(); $word.Quit(); Write-Host 'PDF généré avec succès: exports\Guide-Configuration-Circuits-BSIC.pdf'} catch { Write-Host 'Erreur lors de la conversion PowerShell:' $_.Exception.Message }}"

REM Vérifier si le PDF a été créé
if exist "exports\Guide-Configuration-Circuits-BSIC.pdf" (
    echo.
    echo ✅ PDF généré avec succès!
    echo 📍 Fichier: exports\Guide-Configuration-Circuits-BSIC.pdf
    echo 📂 Ouvrir le dossier? (O/N)
    set /p choice=
    if /i "%choice%"=="O" start exports
    goto end
)

REM Méthode 2: Instructions alternatives
echo.
echo ❌ La conversion automatique a échoué.
echo.
echo 📋 Instructions alternatives pour générer le PDF:
echo.
echo Méthode 1: Navigateur (recommandé)
echo   1. Ouvrez le fichier: Guide-Configuration-Circuits-BSIC.html
echo   2. Dans le navigateur, faites Ctrl+P
echo   3. Choisissez "Imprimer en PDF"
echo   4. Enregistrez dans le dossier exports
echo.
echo Méthode 2: Outils en ligne
echo   - https://md2pdf.netlify.app/
echo   - https://markdowntopdf.com/
echo   - https://www.markdowntopdf.com/
echo.
echo Méthode 3: Installation d'outils
echo   npm install -g markdown-pdf
echo   markdown-pdf src/app/pages/bacircuit/README.md -o exports/Guide-Configuration-Circuits-BSIC.pdf
echo.

:end
echo.
echo Appuyez sur une touche pour quitter...
pause > nul
