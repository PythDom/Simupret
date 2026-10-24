# Simulateur de crédit hypothécaire

Simulateur et optimiseur de crédit hypothécaire selon les conventions belges (Wallonie),
disponible en **application Android (APK)**, en **exécutable Windows portable** et en **version web**.

> ⚠️ **Simulation indicative.** Cette application ne constitue ni une offre de crédit ni un
> conseil financier. Les taux et frais proposés par défaut sont des valeurs indicatives
> (octobre 2026). Seule l'offre du prêteur fait foi.

## Fonctionnalités

- Taux mensuel équivalent `(1 + r)^(1/12) − 1` (pratique belge), avec comparaison en `r/12`
- Plusieurs tranches en parallèle (montant, durée, taux, mois de départ), mensualités
  constantes ou amortissement constant du capital
- Remboursements anticipés ponctuels ou récurrents, avec indemnité de remploi réglable
- Refinancement avec seuil de rentabilité
- Frais de dossier, expertise, frais d'acte (inscription / mandat hypothécaire),
  assurance solde restant dû, tranche à 0 % (type Rénopack SWCS)
- TAEG calculé sur les flux réels, coût d'opportunité « rembourser ou investir »
- Optimiseur de tranches sous contrainte de budget mensuel, pour une banque ou toutes
- Banques : moyennes du marché publiées par la Banque nationale de Belgique (mise à jour en un geste),
  profils de banques avec leurs taux, frais et assurances
- Frais de dossier, d'expertise et d'acte, assurances, TAEG sur les flux réels
- Coût d'opportunité : rembourser anticipativement ou investir la différence
- Comparateur, tableau d'amortissement, graphiques, export CSV / PDF
- Mode clair et mode sombre ; données stockées uniquement sur l'appareil

## Écrans

1. **Paramètres** : montant, valeur du bien et quotité, budget, durée maximale, marge, indemnité de remploi, convention de taux, rendement d'un placement.
2. **Banques** : moyennes du marché (BNB) avec bouton « Mettre à jour », banques personnelles (nouvelle, dupliquer, supprimer, par défaut) avec grille de taux, frais et assurances.
3. **Scénarios** : tranches, remboursements anticipés, refinancement (avec seuil de rentabilité) ; créer, renommer, dupliquer, supprimer.
4. **Comparateur** : 2 à 4 scénarios côte à côte.
5. **Optimiseur** : 5 meilleures configurations et variante « flexibilité maximale » ; un geste pour en faire un scénario.
6. **Tableau d'amortissement** : consolidé ou par tranche, mensuel ou annuel.
7. **Graphiques** : solde restant dû, mensualités par tranche avec budget, intérêts cumulés et capital remboursé, comparaison des coûts.
8. **Export** : tableau d'amortissement en CSV (format tableur belge), résumé PDF, partage via la feuille de partage Android.
9. **À propos** : avertissement et conventions de calcul.

Les scénarios et paramètres sont enregistrés automatiquement sur l'appareil.

## Moyennes du marché (Banque nationale de Belgique)

Le profil « Moyenne du marché (BNB) » utilise les statistiques MIR de la Banque nationale de Belgique :
taux moyens des nouveaux crédits hypothécaires aux ménages, par période de fixation du taux, et TAEG
moyen. Elles sont diffusées par l'API publique du
[portail de données de la BCE](https://data.ecb.europa.eu/data/datasets/MIR) (séries
`MIR.M.BE.B.A2C.*`), sans clé ni compte, et publiées environ 5 à 6 semaines après la fin du mois.

- Le bouton **Mettre à jour** (écran Banques) récupère les derniers chiffres. Sans connexion, la copie
  embarquée dans l'application est utilisée ; elle est actualisée à chaque publication.
- La BNB publie des taux par période de fixation, pas par durée ni par quotité : la grille utilise la
  fixation de 5 à 10 ans pour 10 ans, et celle de plus de 10 ans pour 15, 20 et 25 ans, pour toutes les
  quotités.
- Ce sont des moyennes, pas des offres. Pour comparer des banques, créez une banque (elle part des
  moyennes) et saisissez les conditions de son offre (fiche ESIS).

## Captures d'écran

| Paramètres | Optimiseur | Graphiques |
| --- | --- | --- |
| _(à venir)_ | _(à venir)_ | _(à venir)_ |

## Développement

Prérequis : Node.js 22 (voir `.nvmrc`).

```bash
npm install        # installe les dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm run lint       # ESLint
npm run typecheck  # vérification TypeScript stricte
npm test           # tests unitaires (Vitest)
npm run build      # build web de production dans dist/
```

## Structure

```
src/
├─ engine/   moteur financier en TypeScript pur (aucune dépendance UI), testé avec Vitest
├─ format/   formatage fr-BE (montants « 1 464,00 € », dates JJ/MM/AAAA)
├─ state/    état de l'application, scénarios, valeurs par défaut
├─ storage/  sauvegarde locale (Capacitor Preferences)
├─ screens/  écrans de l'application
├─ components/  champs de saisie, graphiques (Recharts)
└─ export/   CSV, résumé PDF, partage
android/     projet Android (Capacitor)
desktop/     version Windows portable (Electron)
assets/      icône et écran de démarrage (sources)
```

## Application Android

L'application Android est construite avec [Capacitor](https://capacitorjs.com/) à partir de la version web.

### Installer l'APK

1. Ouvrez la page **Releases** du dépôt depuis votre téléphone et téléchargez le fichier `simupret-x.y.z.apk`.
2. Ouvrez le fichier. Android demande d'autoriser l'installation depuis cette source (navigateur ou
   gestionnaire de fichiers) : acceptez pour cette application uniquement.
3. Lancez « Simulateur de crédit ». Les données restent sur le téléphone.

Un APK nommé `…-debug.apk` est une version de test non signée avec la clé de publication : une version
signée ultérieure ne pourra pas la mettre à jour, il faudra d'abord la désinstaller.

### Publier une version

Le workflow **Publication (APK et EXE)** construit l'APK Android et l'exécutable Windows portable, puis
les attache à une GitHub Release.

- **Sans ligne de commande** : onglet **Actions** → **Publication (APK et EXE)** → **Run workflow**,
  saisissez la version (ex. `1.0.1`) : le workflow crée le tag `v1.0.1` et la release.
- **Avec un tag** :

  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```

Utilisez un numéro `MAJEUR.MINEUR.CORRECTIF` : le `versionCode` Android est calculé ainsi
(`1.2.3` → `10203`) et doit augmenter à chaque version. Lancé à la main sans version, le workflow
fournit seulement les fichiers comme artefacts, sans release.

### Signature de l'APK

Sans secrets de signature, le workflow produit un APK **debug** (installable, mais non destiné à la
publication). Pour un APK release signé :

1. Générez une fois un keystore (gardez-le précieusement, hors du dépôt : il sera nécessaire pour
   toutes les mises à jour) :

   ```bash
   keytool -genkeypair -v \
     -keystore simupret-release.keystore \
     -alias simupret \
     -keyalg RSA -keysize 4096 -validity 10000 \
     -dname "CN=Simupret, C=BE"
   ```

   `keytool` est fourni avec Java (JDK). Il demande le mot de passe du keystore puis celui de la clé.

2. Encodez-le en base64 :

   ```bash
   base64 -w 0 simupret-release.keystore > keystore.b64   # Linux
   base64 -i simupret-release.keystore -o keystore.b64    # macOS
   ```

3. Dans GitHub : **Settings** → **Secrets and variables** → **Actions** → **New repository secret**,
   créez ces quatre secrets :

   | Secret | Valeur |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | contenu du fichier `keystore.b64` |
   | `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
   | `ANDROID_KEY_ALIAS` | alias de la clé (`simupret` dans l'exemple) |
   | `ANDROID_KEY_PASSWORD` | mot de passe de la clé |

   Avec la commande `gh` :

   ```bash
   gh secret set ANDROID_KEYSTORE_BASE64 < keystore.b64
   gh secret set ANDROID_KEYSTORE_PASSWORD
   gh secret set ANDROID_KEY_ALIAS --body simupret
   gh secret set ANDROID_KEY_PASSWORD
   ```

Supprimez ensuite `keystore.b64`.

### Construire l'APK en local

Prérequis : JDK 21 et Android SDK (Android Studio).

```bash
npm run android:sync   # build web + copie dans le projet Android
cd android && ./gradlew assembleDebug
# APK : android/app/build/outputs/apk/debug/app-debug.apk
```

Ou `npm run android:open` pour ouvrir le projet dans Android Studio.

## Windows (exécutable portable)

Téléchargez `Simupret-x.y.z-portable.exe` depuis la page **Releases** et lancez-le : aucune
installation n'est nécessaire. Les scénarios et paramètres sont enregistrés dans le dossier
`Simupret-données` créé à côté de l'exécutable (l'ensemble peut être copié sur une clé USB).

L'exécutable n'est pas signé : au premier lancement, Windows SmartScreen peut afficher « Windows a
protégé votre ordinateur ». Cliquez sur **Informations complémentaires** puis **Exécuter quand même**.

L'exécutable est construit avec [Electron](https://www.electronjs.org/) à partir de la version web
(dossier `desktop/`). Pour le construire sur un PC Windows :

```bash
npm ci && npm run build
cd desktop
npm ci
rm -rf app && cp -r ../dist app      # PowerShell : Remove-Item app -Recurse; Copy-Item ../dist app -Recurse
npm run dist:win                      # → desktop/release/Simupret-<version>-portable.exe
```

## Version web (GitHub Pages)

Le workflow **GitHub Pages** publie la version web à chaque push sur `main` (ou à la demande depuis
l'onglet Actions). À activer une fois : **Settings** → **Pages** → **Source** : **GitHub Actions**.
L'application est alors disponible sur `https://<utilisateur>.github.io/<dépôt>/`.

## Intégration continue

À chaque push et pull request : lint (ESLint), vérification des types (TypeScript strict), tests
(Vitest) et build web.

## Licence

[MIT](LICENSE)
