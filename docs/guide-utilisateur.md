# Simulateur de crédit hypothécaire — Guide de l'utilisateur

Version 1.1 — octobre 2026

> **Simulation indicative.** L'application ne constitue ni une offre de crédit, ni un conseil financier,
> juridique ou fiscal. Seule l'offre remise par la banque, avec sa fiche européenne d'information
> standardisée (ESIS) et son TAEG, fait foi.

---

## Sommaire

1. [À quoi sert l'application ?](#1-à-quoi-sert-lapplication-)
2. [Installation](#2-installation)
3. [Premiers pas en 5 minutes](#3-premiers-pas-en-5-minutes)
4. [Les écrans un par un](#4-les-écrans-un-par-un)
5. [Notions clés](#5-notions-clés)
6. [Cas pratiques](#6-cas-pratiques)
7. [Saisie des montants et des dates](#7-saisie-des-montants-et-des-dates)
8. [Vos données](#8-vos-données)
9. [Questions fréquentes](#9-questions-fréquentes)
10. [Limites de la simulation](#10-limites-de-la-simulation)

---

## 1. À quoi sert l'application ?

Le simulateur vous aide à préparer un crédit hypothécaire en Belgique (conventions wallonnes) :

- calculer la mensualité, les intérêts, le coût total et le **TAEG** d'un crédit ;
- combiner **plusieurs tranches** (par exemple 10 ans + 15 ans) et une tranche à 0 % de type Rénopack ;
- simuler des **remboursements anticipés**, avec l'indemnité de remploi, et un **refinancement** ;
- comparer des **banques** à partir des taux moyens du marché publiés par la Banque nationale de Belgique (BNB) ;
- trouver automatiquement la **combinaison de tranches la moins chère** qui respecte votre budget ;
- comparer jusqu'à 4 scénarios, consulter le tableau d'amortissement et des graphiques ;
- exporter un tableau (CSV) ou un résumé (PDF).

L'application fonctionne **sans compte et sans serveur** : tout reste sur votre appareil.

---

## 2. Installation

### Android

1. Sur votre téléphone, ouvrez la page **Releases** du projet sur GitHub et téléchargez le fichier
   `simupret-x.y.z-debug.apk` de la dernière version.
2. Ouvrez le fichier téléchargé. Android demande d'autoriser l'installation depuis cette source
   (navigateur ou gestionnaire de fichiers) : acceptez pour cette application.
3. Lancez **Simulateur de crédit**.

**Mise à jour :** téléchargez et ouvrez simplement le nouvel APK ; il s'installe par-dessus l'ancien et
conserve vos données.

### Windows (exécutable portable)

1. Téléchargez `Simupret-x.y.z-portable.exe` depuis la page **Releases**.
2. Double-cliquez : aucune installation n'est nécessaire.
3. Au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur »
   (l'exécutable n'est pas signé) : cliquez sur **Informations complémentaires**, puis
   **Exécuter quand même**.

Vos scénarios sont enregistrés dans le dossier **Simupret-données**, créé à côté de l'exécutable. Pour
emporter l'application (clé USB, autre PC), copiez l'exécutable **et** ce dossier.

### Navigateur (version web)

Si la version web est publiée (GitHub Pages), elle s'utilise comme l'application, directement dans le
navigateur. Les données sont alors conservées dans ce navigateur uniquement.

---

## 3. Premiers pas en 5 minutes

1. **Paramètres** : saisissez le montant à emprunter, la valeur du bien et votre budget mensuel.
   La quotité s'affiche sous la valeur du bien.
2. **Banques** : touchez **Mettre à jour** pour charger les derniers taux moyens de la BNB
   (connexion Internet nécessaire).
3. **Optimiseur** : l'application propose les 5 combinaisons de tranches les moins chères compatibles
   avec votre budget. Touchez **Créer un scénario** sous celle qui vous intéresse.
4. **Scénarios** : affinez le scénario créé (taux, durées, remboursements anticipés…). La **Synthèse**
   se met à jour à chaque modification.
5. **Comparateur** : cochez 2 à 4 scénarios pour les voir côte à côte.

Le bouton en haut à droite (lune ou soleil) bascule entre le **mode clair** et le **mode sombre**.
Le menu en haut défile horizontalement sur téléphone : faites-le glisser pour voir tous les écrans.

---

## 4. Les écrans un par un

### 4.1 Paramètres

Les réglages communs à tous les scénarios.

**Projet**

| Champ | Rôle |
| --- | --- |
| Montant à emprunter | Montant total du crédit. Sert à l'optimiseur et aux nouveaux scénarios. |
| Valeur du bien | Prix d'achat ou valeur d'expertise. Sert à calculer la **quotité**. |
| Budget mensuel | Mensualité maximale que vous pouvez payer (défaut 2 500 €). |
| Durée maximale | Durée la plus longue acceptée (défaut 20 ans). |
| Marge de sécurité minimale | Montant qui doit rester libre chaque mois sous le budget. L'optimiseur vise une mensualité ≤ budget − marge. |
| Nombre maximal de tranches | 1 à 3, pour l'optimiseur. |
| Date de la première échéance | Sert à dater les échéances (tableau, graphiques, fin du crédit). |

**Indemnité de remploi** — pénalité due en cas de remboursement anticipé :

- **Mois d'intérêts** : 3 par défaut (maximum légal usuel en Belgique) ;
- **Franchise annuelle** : montant remboursable chaque année sans indemnité, en % du capital initial
  ou en montant fixe, si votre banque en accorde une.

**Convention de taux** — par défaut, le **taux équivalent** (pratique belge). L'option « r / 12 » sert
uniquement à comparer avec des simulateurs étrangers (voir § 5).

**Placement (coût d'opportunité)** — rendement annuel **net** (après frais et impôts) que vous
obtiendriez en plaçant votre argent plutôt qu'en remboursant anticipativement. Défaut : 3 %.

La grille de taux, les frais et les assurances se règlent dans l'écran **Banques**.

### 4.2 Banques

#### Moyennes du marché (BNB)

Ce bloc affiche les taux moyens des nouveaux crédits hypothécaires en Belgique, publiés chaque mois par
la Banque nationale de Belgique (statistiques MIR) :

- taux fixe plus de 10 ans, de 5 à 10 ans, de 1 à 5 ans, taux variable ;
- moyenne de tous les crédits au logement ;
- **TAEG moyen** (frais et assurances obligatoires compris) ;
- évolution sur un an et volume de nouveaux crédits du mois.

Touchez **Mettre à jour** pour récupérer les derniers chiffres (connexion Internet nécessaire). Les
chiffres sont publiés environ 5 à 6 semaines après la fin du mois : un mois de référence « en retard »
est normal. Sans connexion, l'application utilise la copie livrée avec la version installée.

#### Mes banques

- **Moyenne du marché (BNB)** : profil de référence, toujours présent. Sa grille de taux suit les
  moyennes BNB et ne se modifie pas à la main ; ses frais et assurances sont modifiables.
- **Nouvelle banque** : crée un profil à partir des moyennes du marché (taux, frais, assurances).
  Remplacez ensuite ces valeurs par celles de l'offre de la banque.
- **Dupliquer** : copie un profil (pratique pour tester une variante d'offre).
- **Par défaut** : banque utilisée pour les nouveaux scénarios et proposée par l'optimiseur.
- **Supprimer** : les scénarios liés à cette banque passent sur la moyenne du marché.

La mention **« à vérifier »** apparaît quand les taux d'une banque datent de plus de 3 mois.

#### Fiche d'une banque

- **Nom**, **Date des taux (offre)** et **Notes** (conditions de réduction, produits liés, contact…).
- **Grille de taux** : taux annuel en % par durée (10, 15, 20, 25 ans) et par tranche de quotité
  (≤ 80 %, 80–90 %, > 90 %). La ligne correspondant à votre quotité est surlignée. Touchez **×** si la
  banque ne propose pas une durée ; touchez « non proposé » pour la rétablir.
- **Frais et assurances** :
  - frais de dossier, frais d'expertise ;
  - frais d'acte de crédit, en deux parts : **inscription hypothécaire** et **mandat hypothécaire**
    (demandez le décompte à votre notaire) ;
  - **assurance solde restant dû** : prime annuelle en % du solde, prime unique ou aucune ;
  - **assurance incendie** et **compte bancaire** exigés par la banque, si c'est le cas.

Ces montants entrent dans le **coût total** et le **TAEG** des scénarios liés à la banque.

### 4.3 Scénarios

Un scénario est un montage de crédit complet. **Nouveau scénario** en crée un avec la banque par défaut ;
**Dupliquer** et **Supprimer** se trouvent sur chaque ligne de la liste. Touchez un scénario pour
l'ouvrir. Tout est enregistré automatiquement.

**Scénario**

- **Nom du scénario**.
- **Banque** : ses frais et assurances s'appliquent au scénario.
- **Appliquer les taux de cette banque aux tranches** : remplace le taux de chaque tranche par celui de la
  grille de la banque (durée la plus proche). Les tranches à 0 % ne sont pas modifiées.

**Synthèse** — mise à jour en direct : première mensualité, marge minimale, intérêts totaux,
indemnités de remploi, frais et assurances, coût total, **TAEG** (avec le TAEG moyen du marché en
repère) et date de fin. Si une saisie est incorrecte, la liste des points à corriger s'affiche ici.

**Tranches** — un crédit peut combiner plusieurs tranches remboursées en parallèle :

| Champ | Rôle |
| --- | --- |
| Montant | Capital de la tranche. |
| Durée | En mois (240 = 20 ans). |
| Taux annuel fixe | En %, par exemple 3,67. |
| Mois de la première échéance | 1 = dès le début. Une valeur plus grande décale la tranche (fonds débloqués le mois précédent). |
| Amortissement | **Mensualités constantes** (le plus courant) ou **amortissement constant du capital** (mensualités dégressives). |
| Réduction du montant à rembourser | Prime ou subside déduit du capital à rembourser (facultatif). |

**Tranche à 0 % (type Rénopack)** ajoute un prêt à taux zéro pour travaux économiseurs d'énergie
(30 000 € sur 10 ans par défaut, à adapter aux conditions de la SWCS).

**Remboursements anticipés**

- **Ponctuel** : un montant à un mois donné.
- **Récurrent** : tous les N mois, soit un **montant fixe**, soit **tout ce qui dépasse la mensualité
  jusqu'au budget** (l'écart entre votre budget et la mensualité est mis de côté chaque mois, puis versé).
  Cochez **Indemnité comprise dans le budget** pour que l'indemnité soit prélevée sur ce montant au lieu
  d'être payée en plus.
- **Tranche concernée** : par défaut, celle au taux le plus élevé (le plus rentable). Le surplus éventuel
  passe aux autres tranches.
- **Effet** : **réduire la durée** (même mensualité, fin plus tôt) ou **réduire la mensualité** (même
  date de fin).

Le remboursement a lieu après l'échéance du mois indiqué.

**Refinancement** — cochez **Refinancer le crédit** : au mois choisi, le solde est remboursé (avec
indemnité de remploi) et remplacé par un nouveau crédit au **nouveau taux** et à la **nouvelle durée**.
Indiquez les frais d'acte et de dossier du nouveau crédit ; cochez **Financer l'indemnité et les frais**
s'ils sont ajoutés au nouveau capital. L'application affiche :

- le **coût immédiat** (indemnité + frais) ;
- l'**économie** (ou le surcoût) totale ;
- le **seuil de rentabilité** : la date à partir de laquelle le refinancement est gagnant.

**Rembourser ou investir ?** — visible dès qu'un scénario contient des remboursements anticipés.
L'application compare, avec le même effort mensuel :

- rembourser anticipativement comme prévu ;
- ne pas rembourser et placer l'argent au rendement indiqué dans **Paramètres**.

Elle affiche le patrimoine final de chaque option, l'avantage de la meilleure et le **rendement
d'équilibre** : au-delà de ce rendement net, investir rapporte davantage que rembourser.

### 4.4 Comparateur

Cochez de 2 à 4 scénarios. Pour chacun : banque, première mensualité, mensualité maximale et minimale,
intérêts, indemnités, frais et assurances, réductions, coût total, **TAEG**, date de fin et marge
minimale. La meilleure valeur de chaque ligne est en **vert**.

### 4.5 Optimiseur

L'optimiseur teste toutes les combinaisons de 1 à 3 tranches (durées de la grille, montants par pas de
5 000 €) et retient celles dont la mensualité reste **toujours ≤ budget − marge**. Il les classe par
**coût total** (intérêts + frais + assurances).

- **Banque** : une banque précise ou **Toutes les banques** (le nom de la banque apparaît alors sur
  chaque résultat).
- Pour chacun des **5 meilleurs résultats** : coût total, TAEG, mensualité maximale, marge minimale et
  date de fin. **Créer un scénario** le transforme en scénario modifiable.
- **Variante « flexibilité maximale »** : le crédit le plus long, avec chaque année un remboursement
  anticipé de tout ce qui dépasse la mensualité jusqu'au budget. Son **prix de la flexibilité** est le
  surcoût par rapport à la meilleure configuration ; en échange, vous pouvez arrêter les versements à
  tout moment et retomber sur une mensualité plus basse.

Si le budget est insuffisant, l'optimiseur indique la mensualité la plus basse possible.

### 4.6 Tableau d'amortissement

Choisissez le **scénario**, l'**affichage** (consolidé ou une seule tranche) et la **période** (mois par
mois ou année par année). Colonnes : échéance, intérêts, capital, remboursement anticipé, indemnité et
solde restant dû.

### 4.7 Graphiques

- **Solde restant dû** par tranche ;
- **Mensualités par tranche**, avec la ligne du budget ;
- **Intérêts cumulés et capital remboursé** ;
- **Comparaison des coûts** des scénarios cochés dans le comparateur (ou de tous).

Touchez ou survolez un graphique pour lire les valeurs.

### 4.8 Export

- **Tableau d'amortissement (CSV)** : consolidé ou par tranche, mensuel ou annuel. Format tableur belge
  (séparateur « ; », virgule décimale) : s'ouvre directement dans Excel ou LibreOffice.
- **Résumé du scénario (PDF)** : paramètres, banque, tranches, remboursements, synthèse des coûts, TAEG
  et tableau annuel.

Sur Android, **Partager** ouvre la feuille de partage (e-mail, Drive, WhatsApp…). Sur Windows et dans le
navigateur, **Télécharger** enregistre le fichier.

### 4.9 À propos

Avertissement légal et conventions de calcul.

---

## 5. Notions clés

**Quotité** — montant emprunté ÷ valeur du bien. 250 000 € pour un bien de 300 000 € = 83,3 %. Plus elle
est basse, meilleur est généralement le taux. Les banques raisonnent par paliers : ≤ 80 %, 80–90 %,
> 90 %.

**Taux équivalent** — en Belgique, le taux mensuel est (1 + taux annuel)^(1/12) − 1, et non taux annuel
÷ 12. Pour 3,67 % par an, cela donne 0,3008 % par mois (au lieu de 0,3058 %). La convention « r / 12 »
donne des mensualités un peu plus élevées.

**Mensualités constantes ou amortissement constant** — avec des mensualités constantes, vous payez le
même montant chaque mois (au début surtout des intérêts). Avec l'amortissement constant, vous remboursez
la même part de capital chaque mois : les mensualités sont plus élevées au début puis diminuent, et le
total des intérêts est plus faible.

**Tranches** — plusieurs crédits signés ensemble, avec des durées et des taux différents. Exemple :
200 000 € sur 10 ans + 50 000 € sur 15 ans. Mensualité élevée pendant 10 ans, puis faible.

**Indemnité de remploi** — pénalité en cas de remboursement anticipé. Par défaut : 3 mois d'intérêts sur
le capital remboursé, au taux de la tranche.

**TAEG** — taux annuel effectif global : le coût réel du crédit en un seul pourcentage, frais et
assurances compris. C'est le meilleur indicateur pour comparer des offres. L'application le calcule sur
les flux réels (fonds reçus, mensualités, remboursements anticipés, indemnités, frais, assurances).

**Coût total** — tout ce que vous payez en plus du capital emprunté : intérêts + indemnités + frais +
assurances − réductions.

**Marge** — budget − mensualité. La **marge minimale** est celle du mois où la mensualité est la plus
élevée.

**Inscription ou mandat hypothécaire** — deux manières de garantir le crédit. Le mandat coûte moins cher
à l'acte, mais la banque peut l'exiger seulement pour une partie du crédit. Les frais dépendent de votre
situation : demandez un décompte au notaire.

**Assurance solde restant dû** — rembourse tout ou partie du crédit en cas de décès. La prime dépend de
l'âge, de la santé et du montant assuré.

**Période de fixation** — durée pendant laquelle le taux ne change pas. En Belgique, la plupart des
crédits sont à taux fixe sur toute la durée.

---

## 6. Cas pratiques

### Comparer deux banques

1. **Banques** → **Nouvelle banque**, nommez-la « Banque A », saisissez sa grille de taux et ses frais
   (fiche ESIS de l'offre).
2. Faites de même pour « Banque B ».
3. **Scénarios** → créez ou dupliquez un scénario, choisissez **Banque A** puis touchez **Appliquer les
   taux de cette banque aux tranches**. Dupliquez-le, passez la copie sur **Banque B** et appliquez ses
   taux.
4. **Comparateur** : cochez les deux scénarios et comparez le **TAEG** et le **coût total**.

### Trouver le meilleur montage pour un budget de 2 500 €

1. **Paramètres** : budget 2 500 €, durée maximale 20 ans, marge de sécurité si vous voulez garder une
   réserve (par exemple 100 €).
2. **Optimiseur** → **Toutes les banques**. Les 5 meilleures combinaisons s'affichent.
3. Comparez avec la **flexibilité maximale** : si son prix vous paraît raisonnable, elle laisse plus de
   marge en cas d'imprévu.

### Rembourser plus vite avec le reste du budget

1. Dans le scénario : **Remboursements anticipés** → **Récurrent**, tous les 12 mois, « tout ce qui
   dépasse la mensualité jusqu'au budget ».
2. La **Synthèse** montre la nouvelle date de fin, les intérêts économisés et les indemnités.
3. La carte **Rembourser ou investir ?** indique si placer cet argent serait plus intéressant, selon le
   rendement choisi dans **Paramètres**.

### Faut-il refinancer ?

1. Dans le scénario : cochez **Refinancer le crédit**, indiquez le mois, le nouveau taux, la nouvelle
   durée et les frais.
2. Regardez l'**économie totale** et le **seuil de rentabilité**. Si le refinancement n'est « jamais
   rentable », l'écart de taux ne couvre pas l'indemnité et les frais.

---

## 7. Saisie des montants et des dates

- Montants : « 250 000 », « 250000 » ou « 1.464,50 » sont acceptés. Le symbole € est facultatif.
- Taux : en pourcentage avec une virgule, par exemple **3,67** (et non 0,0367).
- Dates : **JJ/MM/AAAA**, par exemple 01/11/2026.
- Une saisie incorrecte est signalée en rouge sous le champ ; la valeur précédente reste utilisée tant
  que la saisie n'est pas valide.
- Les montants sont arrondis uniquement à l'affichage ; les calculs utilisent les valeurs exactes.

---

## 8. Vos données

- Scénarios, banques et paramètres sont **enregistrés automatiquement sur l'appareil** : Android
  (stockage de l'application), Windows (dossier « Simupret-données » à côté de l'exécutable),
  navigateur (stockage du site).
- Aucune donnée personnelle n'est envoyée. Seul le bouton **Mettre à jour** de l'écran Banques contacte
  le service public de données de la BCE pour télécharger les moyennes de la BNB.
- **Désinstaller l'application Android efface ses données.** Exportez les scénarios importants en PDF ou
  CSV pour les conserver.
- Les données ne se synchronisent pas entre le téléphone et le PC.

---

## 9. Questions fréquentes

**Le bouton « Mettre à jour » affiche « Impossible de récupérer les taux ».**
Vérifiez la connexion Internet et réessayez. Les taux livrés avec l'application restent utilisés.

**« Déjà à jour » alors que nous sommes en octobre et que les données datent d'août ?**
C'est normal : la BNB publie les chiffres d'un mois environ 5 à 6 semaines plus tard.

**Pourquoi les taux 15, 20 et 25 ans de la moyenne BNB sont-ils identiques ?**
La BNB publie les taux par période de fixation (plus de 10 ans), pas par durée. Pour des taux par durée
et par quotité, créez une banque et saisissez la grille de son offre.

**Mon TAEG est plus élevé que le taux du crédit.**
C'est attendu : le TAEG inclut les frais de dossier, d'expertise, d'acte et les assurances.

**L'optimiseur ne trouve aucune configuration.**
Le budget (moins la marge) est trop bas pour le montant et la durée maximale. L'optimiseur indique la
mensualité minimale possible : augmentez le budget ou la durée maximale, réduisez le montant ou la marge.

**Le total des tranches ne correspond pas au montant du projet.**
La Synthèse le signale. Ajustez les montants des tranches si vous voulez emprunter exactement le
montant du projet.

**Windows bloque l'exécutable.**
Voir § 2 : **Informations complémentaires** → **Exécuter quand même**.

**Comment revenir aux valeurs par défaut ?**
Créez un nouveau scénario ou une nouvelle banque : ils partent des valeurs par défaut. Pour tout
réinitialiser, effacez les données de l'application (Android : Paramètres du téléphone → Applications →
Simulateur de crédit → Stockage → Effacer les données ; Windows : supprimez le dossier
« Simupret-données »).

---

## 10. Limites de la simulation

- Les taux, frais et primes par défaut sont **indicatifs**. Les moyennes BNB sont des moyennes de
  marché, pas des offres : votre taux dépend de la banque, de la quotité, de la durée, de vos revenus
  et des produits liés.
- Taux **fixes** uniquement : les taux variables ou révisables ne sont pas simulés.
- Le TAEG est calculé avec des mois de 1/12 d'année ; le calcul légal utilise les jours réels (écart de
  quelques centièmes de pour cent possible).
- L'assurance solde restant dû est simplifiée (prime en % du solde ou prime unique) ; l'âge et la santé
  ne sont pas pris en compte.
- Les droits d'enregistrement sur l'achat, les frais de notaire de l'acte d'achat et la fiscalité
  (déductions régionales) ne sont pas inclus.
- L'optimiseur teste des tranches à mensualités constantes, démarrant toutes au premier mois. La
  contrainte de budget porte sur les mensualités du crédit, pas sur les primes d'assurance.
- Un refinancement remplace toutes les tranches à la fois.
- Le rendement d'un placement est supposé constant et net d'impôts, sans risque.

Avant de signer, demandez toujours l'offre complète (fiche ESIS) à plusieurs banques et faites-vous
conseiller si nécessaire.
