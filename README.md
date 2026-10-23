# Simulateur de crédit hypothécaire

Simulateur et optimiseur de crédit hypothécaire selon les conventions belges (Wallonie),
disponible en **application Android (APK)** et en **version web**.

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
- Optimiseur de tranches sous contrainte de budget mensuel
- Frais de dossier, d'expertise et d'acte, assurances, TAEG sur les flux réels
- Coût d'opportunité : rembourser anticipativement ou investir la différence
- Comparateur, tableau d'amortissement, graphiques, export CSV / PDF
- Mode clair et mode sombre ; données stockées uniquement sur l'appareil

## Écrans

1. **Paramètres** : montant, valeur du bien et quotité, budget, durée maximale, marge, grille de taux, indemnité de remploi, convention de taux.
2. **Scénarios** : tranches, remboursements anticipés, refinancement (avec seuil de rentabilité) ; créer, renommer, dupliquer, supprimer.
3. **Comparateur** : 2 à 4 scénarios côte à côte.
4. **Optimiseur** : 5 meilleures configurations et variante « flexibilité maximale » ; un geste pour en faire un scénario.
5. **Tableau d'amortissement** : consolidé ou par tranche, mensuel ou annuel.
6. **Graphiques** : solde restant dû, mensualités par tranche avec budget, intérêts cumulés et capital remboursé, comparaison des coûts.
7. **Export** : tableau d'amortissement en CSV (format tableur belge), résumé PDF, partage via la feuille de partage Android.
8. **À propos** : avertissement et conventions de calcul.

Les scénarios et paramètres sont enregistrés automatiquement sur l'appareil.

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
└─ components/  champs de saisie, graphiques (Recharts)
```

## Application Android

_Section complétée lors de l'intégration Capacitor : génération du keystore, secrets
GitHub à créer, publication d'une version via un tag `v*` et installation de l'APK._

## Licence

[MIT](LICENSE)
