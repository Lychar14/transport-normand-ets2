# Mémoire du projet — SARL Transports Normands

> Fichier de continuité à joindre au début de chaque nouvelle conversation.
> Dernière mise à jour : 17 août 2026 — version courante du site : **v45**

---

## 1. Le projet en deux lignes

Application web de gestion d'une entreprise de transport virtuelle pour les jeux
**Euro Truck Simulator 2 / American Truck Simulator**. Nom de l'entreprise :
**SARL Transports Normands** (avec un S à chaque mot depuis la v23). Pseudo du
joueur/patron : **Lychar**. Entreprise TrucksBook associée : *Les frères de la route*.

Profil du développeur : débutant complet en code (pas de JS ni de backend), utilise
VS Code au quotidien. **Depuis la v45**, le workflow de livraison a changé : le site
est versionné avec Git et poussé sur GitHub (dépôt privé), Cloudflare Pages
redéploie automatiquement à chaque `git push` — l'ancien zip `site-a-deployer-vXX.zip`
glissé-déposé sur Netlify n'est plus utilisé. Les scripts SQL restent à exécuter
manuellement dans Supabase (aucun lien avec le déploiement du site).

---

## 2. Stack technique

| Élément | Choix |
|---|---|
| Front | **Depuis la v45** : `index.html` (structure) + `css/styles.css` + `js/*.js` (11 fichiers par domaine : utils, auth, settings, mail, roadsheet, profile, office, tresorerie, calendrier, rendezvous, app) + `assets/images/*.jpg`. Plus un fichier unique — HTML/CSS/JS séparés, pas de framework ni de bundler (balises `<script src>` classiques) |
| Backend / base | **Supabase** (authentification + base PostgreSQL + Storage) |
| Versionning | **Git + GitHub** (dépôt privé `Lychar14/transport-normand-ets2`, branche `main`) — mis en place en v45 |
| Hébergement | **Cloudflare Pages**, projet relié au dépôt GitHub (Git integration, pas de dépôt direct) |
| Déploiement | `git push` sur `main` (depuis le panneau Contrôle de code source de VS Code) → build & déploiement **automatiques** par Cloudflare Pages en ~1 min. Aucune commande de build (site 100 % statique), dossier de sortie `/` |

**Points d'attention connus :**
- **Réglage Cloudflare Pages piégeux** : le champ *Branch control* doit pointer sur
  `main` (branche par défaut du dépôt) — un projet Pages nouvellement créé peut
  afficher *« No URLs enabled »* si ce champ ne correspond à aucune branche existante.
- Erreur GitHub *« No server is currently available to service your request »*
  pendant l'autorisation de l'app GitHub pour Cloudflare : erreur transitoire côté
  GitHub, sans rapport avec Cloudflare — se résout en général en réessayant
  (éventuellement en navigation privée).
- Erreur *« NetworkError »* à la connexion : cause identifiée comme un blocage local
  du navigateur (extension / bloqueur de pub / antivirus), **pas** un problème
  Supabase. Contournement : tester en navigation privée.
- *(Historique, résolu par l'abandon de Netlify en v45)* Netlify avait un bug de
  compte gratuit *« Account credit usage exceeded »* et son connecteur Claude ne
  permettait pas le déploiement automatique dans cet environnement.

---

## 3. Identité visuelle

⚠️ **Depuis la v45**, les trois photos décrites ci-dessous (logo de connexion, fond
route/forêt, filigrane Mont-Saint-Michel) ne sont plus embarquées en base64 dans
`index.html` : elles ont été extraites en fichiers réels dans `assets/images/`
(`login-logo.jpg`, `login-bg.jpg`, `msm-bg.jpg`), référencés depuis `css/styles.css`
et `index.html` par de simples chemins relatifs. Les explications qui suivent
décrivent la mise en page telle que pensée au moment de leur création (v27/v28/v33)
et restent valables ; seul l'emplacement technique du fichier a changé.

Thème **sombre & doré**, appliqué globalement via des tokens CSS (`.card`,
`.sidebar`, `.sidenav`) pour se propager automatiquement à toutes les rubriques.

- Carte « Solde personnel » mise en avant (bordure et lueur dorée les plus lumineuses).
- Lueur dorée plus sourde sur toutes les autres cartes.
- Tous les traits de séparation (horizontaux et verticaux) en doré, épaisseur 2 px
  (21 séparateurs).
- Grille asymétrique 2 colonnes, effets de survol sur les cartes cliquables,
  odomètre animé au chargement.
- Fumée dorée ambiante en bas à droite de l'écran (fond flou, dérive lente,
  désactivée si la préférence système « réduire les animations » est active).
- **Bloc identité de la sidebar (v37)** : l'icône et le nom de l'entreprise ont été
  doublés pour être mis en valeur — icône 34 px → **68 px** (coins arrondis
  18 px, pictogramme SVG par défaut 18 → 36 px), nom 1.12 rem → **2.24 rem**.
  Le bloc, jusque-là horizontal (icône à gauche, nom à droite), est devenu un
  **bloc vertical centré** (icône au-dessus du nom) : à cette taille les deux ne
  tenaient plus côte à côte. La largeur de la sidebar (`--sidebar-w`) est passée
  de 240 px à **272 px** pour que le mot « Transports » tienne sur une ligne, et
  le retour à la ligne forcé (`<br/>`) a été retiré du nom, qui se répartit
  désormais tout seul sur plusieurs lignes centrées (utile aussi quand le nom est
  remplacé par celui saisi dans *Réglages > Identité*).

**Logo** : logotype officiel « TN / Transport Normand » (monogramme TN + flèche/route,
bleu marine et bleu vif sur fond papier clair). Depuis la v27, il remplace la petite
illustration SVG du camion sur la **page de connexion** : recadré et embarqué en
base64 directement dans `index.html` (le site reste un fichier unique), avec liseré
doré et ombre portée. La légende texte sous le logo (« SARL Transports Normands 🚛 —
Les frères de la route ») a été **retirée en v28** : le logo est seul dans son cadre.

**Fond de la page de connexion (v28)** : photo d'une route de forêt en automne,
affichée en **pleine page, en transparence** (opacité 30 %, image légèrement floutée
et embarquée en base64), recouverte d'un voile sombre dégradé pour garder le texte
lisible. Les cartes de la page de connexion sont devenues légèrement translucides
(fond à 86 % + flou d'arrière-plan) pour laisser deviner la route derrière.
Poids du fichier `index.html` : ~476 Ko.

**Fond de l'espace de travail (v33)** : photo aérienne du **Mont-Saint-Michel**
incrustée en filigrane **une fois connecté**, sur toute la hauteur de l'écran mais
**calée sur la partie droite** — la zone restée vide à droite du contenu
(`main.page` est limité à 980 px de large). Mise en œuvre :

- élément `<div class="msm-backdrop">` placé dans `#app-view`, en `position: fixed`,
  largeur `min(56vw, 1000px)`, `z-index: 0` (le contenu et la sidebar sont en
  `z-index: 1`, donc toujours au-dessus) et `pointer-events: none` ;
- photo recadrée autour du Mont, redimensionnée en 1200 px et embarquée en base64
  (le site reste un fichier unique) ;
- opacité **42 %** (réglée en v34 : à 17 % en v33, la photo était invisible à
  l'écran) ; saturation légèrement réduite pour rester dans le ton du thème ;
- **recentrée en v35** : décollée du bord droit (`right: clamp(0px, 4.5vw, 110px)`)
  et calée au centre de son cadre (`background-position: center`) au lieu d'être
  plaquée contre la bordure de la fenêtre ;
- fondu **symétrique** sur les bords gauche et droit via un `mask-image` en dégradé
  linéaire (v35 ; le fondu n'existait qu'à gauche jusqu'en v34), fondus haut et
  bas via un voile dégradé sur `::after` — aucun bord net visible, la photo
  « flotte » dans l'espace vide ;
- voile sombre de gauche à droite pour que rien ne gêne la lecture du contenu ;
- **masquée automatiquement en dessous de 1150 px de large** : sur petit écran, le
  contenu occupe toute la place, la photo passerait derrière le texte.

La fumée dorée ambiante du coin bas-droit est conservée et se superpose à la photo.
Poids du fichier `index.html` après ajout : ~622 Ko.

Depuis la v30, ce logo n'est plus figé : le patron peut en importer un autre
depuis **Réglages > Identité** (bucket Storage `logos`), et revenir au logo
d'origine d'un clic.

⚠️ *Point non tranché :* le logo d'origine porte le nom au singulier
(« Transport Normand ») alors que l'entreprise a été renommée « SARL Transports
Normands » en v23 — un logo au pluriel peut désormais être importé sans nouvelle
version du site.

---

## 4. Structure du menu latéral

Trois sections avec libellés discrets :

- **Personnel** — Mon profil *(page par défaut au chargement)*, Tableau de bord,
  Feuille de route, Boîte mail, Calendrier, Rendez-vous, Historique feuilles de route
- **Direction** — Bureau du patron, Réglages *(titre de section masqué côté employé)*
- **Externe** — *(titre de section masqué côté employé)*

Onglet actif signalé par un liseré doré.

**Traits de séparation (v44)** : un groupe qui n'a plus ni bouton ni titre visible
(cas des sections Direction et Externe côté employé) est entièrement masqué, et un
seul trait doré vient clore le menu sous le dernier bouton. Avant, chaque groupe vide
laissait son propre liseré, ce qui donnait deux traits dans le vide sous
« Mes documents » côté employé. La vue du patron est inchangée (ses groupes gardent
au moins un titre visible).

**Pastilles de notification** : Boîte mail (mails non lus, réels), Bureau du patron
(validations en attente + candidatures reçues), Feuille de route (initialisée à 0
pour éviter un flash avant calcul).

---

## 5. Fonctionnalités en place

### Comptes & rôles
- Connexion / inscription / déconnexion réelles via Supabase.
- Deux rôles : **patron** et **employé**, avec des vues et des droits distincts.

### Page de connexion — mémorisation des identifiants (v31)
- Les blocs « Se connecter » et « Créer un compte » sont désormais de **vrais
  `<form>`** avec les attributs `autocomplete` (`username`, `current-password`,
  `new-password`). Conséquences : la touche **Entrée** valide, et le
  **gestionnaire de mots de passe du navigateur** propose enfin d'enregistrer
  puis de remplir les identifiants (stockage chiffré par le système — le site,
  lui, ne stocke aucun mot de passe).
- Case à cocher **« Se souvenir de moi sur cet ordinateur »**, cochée par défaut :
  - cochée → la session Supabase est rangée dans `localStorage` (elle survit à la
    fermeture du navigateur) et l'adresse mail est pré-remplie au chargement
    suivant (clé `tn_dernier_mail`) ;
  - décochée → la session part dans `sessionStorage` (oubliée à la fermeture de
    l'onglet) et l'adresse mail n'est pas conservée.
- Mise en œuvre : un petit adaptateur de stockage passé à `createClient`
  (`auth: { storage: … }`) qui aiguille vers `localStorage` ou `sessionStorage`
  selon la clé `tn_rester_connecte`. Aucun mot de passe n'est jamais écrit par
  le site.

### Tableau de bord
- Salutation « Bonjour, *pseudo*. » branchée sur le pseudo choisi à l'inscription
  (`profiles.pseudo`) depuis la v44 — auparavant le prénom « Lychar » était écrit en
  dur dans le HTML et s'affichait pour tous les comptes.
- Carte **Solde personnel** (opérations personnelles uniquement), aperçu des feuilles
  de route, carte **Mails reçus**, **Derniers mouvements** du compte perso.

### Mon profil (vue employé)
- En-tête avec avatar (initiales ou photo importée), 4 statistiques dont les
  livraisons du mois.
- **Photo de profil** : import vers un bucket Supabase Storage, URL stockée sur le
  profil, affichée dans le profil et la sidebar (script `17-avatar-profil.sql`).
- Carte **Ma flotte** en libre-service : camion, permis, DLC possédés, remorques —
  modifiables par l'employé lui-même.
- Missions récentes.
- **Trophées** à paliers réels basés sur le nombre de livraisons validées.
- La distance parcourue a été retirée du profil : elle est désormais saisie
  manuellement **par le patron** depuis la fiche joueur.

### Feuille de route
- Missions créées par le patron et assignées à un chauffeur.
- Les menus déroulants Départ / Arrivée n'affichent **que les villes des DLC
  réellement cochés** sur la fiche du chauffeur sélectionné (Going East!, Scandinavia,
  Vive la France !, Italia, Iberia, Beyond the Baltic Sea, Road to the Black Sea,
  West Balkans, Greece).
- **Saisie manuelle (v38)** — chacun des trois champs *Cargaison*, *Départ* et
  *Arrivée* possède un petit bouton **« ✎ Saisie manuelle »** qui remplace la liste
  déroulante par un champ de texte libre (et **« ☰ Revenir à la liste »** pour faire
  l'inverse). Les trois bascules sont indépendantes : on peut par exemple garder la
  liste des villes et taper une cargaison hors liste. Cela permet de créer des
  missions vers des villes ou avec des marchandises absentes des listes intégrées
  (DLC récents, mods, cargaisons personnalisées) sans attendre une mise à jour du
  site. Les contrôles avant enregistrement sont adaptés : cargaison non vide, deux
  villes renseignées et différentes (comparaison insensible à la casse).
- **Commentaire de mission (v38)** — champ « 5. Commentaire (informations diverses) »,
  facultatif, sous l'échéance. Stocké dans la colonne `commentaire` de la table
  `missions` (script `22-commentaire-mission.sql`). Il est affiché dans un encadré
  doré 💬 à trois endroits : sur la feuille de route du chauffeur assigné, dans
  l'historique des feuilles de route (validées comme refusées), et rappelé au patron
  sur la carte de validation de la preuve. Aucune policy RLS supplémentaire : le
  commentaire suit les règles de la ligne `missions`.
- Seul l'employé assigné peut accepter ou refuser une mission — jamais le patron
  (vérifié dans le code, aucun chemin patron n'existe).
- Onglets de filtre : À vérifier, Validées, **Refusées**.
- Le formulaire « Soumettre une preuve de livraison » est masqué sur les onglets
  À vérifier, Validées et Refusées.

### Validation des livraisons (anti-triche)
- Le chauffeur soumet le **lien TrucksBook** de sa mission (la capture d'écran a été
  abandonnée, jugée trop contraignante). Le patron valide ou refuse.
- En refusant, le patron saisit un **motif** affiché au chauffeur
  (script `13-raison-refus.sql`). Une mission refusée est en **consultation seule** :
  pas de resoumission possible.
- À la soumission, le chauffeur déclare aussi :
  - **Frais carburant** et **frais de péages** (colonnes `frais_carburant` /
    `frais_peages` sur `preuves_livraison`, script `14-frais-livraison.sql`) ;
  - le **revenu de la mission (€)**, crédité automatiquement au compte entreprise à
    la validation par le patron.
- Bouton **« Rembourser les frais »** en un clic depuis une preuve en attente.

### Historique feuilles de route
*(anciennement « Missions validées », renommé en v22 ; élargi aux refus en v32)*

**Réinitialisation depuis la page (v42).** Une carte « Réinitialiser l'historique »
est affichée en bas de la rubrique, **uniquement pour le patron** (masquée côté
employé). Un sélecteur permet de choisir la portée — *Toute l'équipe* ou un membre
précis — chaque entrée affichant entre parenthèses son nombre de feuilles
terminées. Le bouton efface les missions `done` / `refused` de la portée choisie,
leurs `preuves_livraison` et les revenus de mission crédités au compte entreprise ;
**les feuilles en cours ne sont pas touchées**. Une fenêtre de confirmation
rappelle le nombre exact de feuilles concernées.

C'est le même traitement que la catégorie *Historique des feuilles de route* de la
fiche joueur (Bureau du patron > Équipe > Gérer) — deux points d'entrée pour la
même opération : la fiche joueur pour un ménage ciblé sur un membre, cette carte
pour purger toute l'équipe d'un coup. Elle utilise le même helper `psSupprimer()`
et affiche donc la même alerte si les policies `DELETE` manquent (script
`23-policies-suppression.sql`).

- Liste les feuilles **terminées** : validées **et refusées** (avant la v32, seules
  les validées apparaissaient).
- Limitée aux **5 dernières** (constante `HISTORIQUE_MAX` dans le code), triées de la
  plus récente à la plus ancienne, avec une ligne de bas de liste indiquant le total
  (« Les 5 dernières feuilles terminées sur N au total »).
- Ligne **validée** (liseré vert, ✓) : trajet, chauffeur (côté patron), date de
  validation, frais carburant/péages, lien TrucksBook.
- Ligne **refusée** (liseré bordeaux, ✕, pastille « Refusée ») : trajet, chauffeur
  (côté patron), motif du refus donné par le patron (ou « aucun motif indiqué »), date.
  Une mission simplement déclinée par le chauffeur (jamais acceptée, donc sans preuve)
  s'affiche « Mission déclinée par le chauffeur ».
- Côté employé : uniquement ses propres feuilles. Côté patron : toute l'équipe.
- Techniquement : la liste est construite à partir de la table `missions`
  (statuts `done` / `refused`), enrichie de la preuve correspondante ; les preuves
  refusées sont chargées dans `allRefusedProofs` par `loadValidatedProofs()`.

### Boîte mail — messagerie interne
- Table Supabase `mails` avec RLS complète (script `15-messagerie-interne.sql`).
- Patron **et** employés peuvent écrire à n'importe quel joueur, ou à toute
  l'équipe en une fois.
- Onglets Reçus / Envoyés, volet de lecture avec Répondre / Supprimer.
- Mails non lus mis en évidence en doré, barre de recherche, filtre Tous / Non lus,
  regroupement par date (Aujourd'hui / Hier / jour de semaine / Semaine dernière / date).
- Widget **« Mails reçus »** sur le tableau de bord : jusqu'à 8 mails, badge de
  non-lus, clic pour ouvrir directement le mail.

### Calendrier
- Table `calendar_events`. N'importe quel membre peut poser un congé pour lui-même ;
  seul le patron peut créer une réunion ou un rappel. Événements visibles par toute
  l'équipe.

### Rendez-vous
- Table `appointment_slots`. Fonctionne **dans les deux sens** : le patron propose
  des créneaux que les employés réservent, et les employés peuvent proposer un ou
  plusieurs créneaux au patron, qui les réserve.

### Bureau du patron
Onglets : **Vue d'ensemble**, **Validations**, **Équipe**, **Missions**, **Trésorerie**,
**Communication**.

- **Équipe → fiche joueur** (bouton « Gérer » sur chaque membre), 5 onglets
  (script `18-fiche-joueur.sql`, tables `distance_entries` et `player_notes`) :
  - *Distance* — saisie manuelle de la distance cumulée par le patron
  - *Notes & blâmes* — **strictement réservé au patron**
  - *Transactions*
  - *Rendez-vous*
  - *Réinitialiser* (v40) — voir ci-dessous

#### Réinitialisation par joueur (v40)

Onglet **Réinitialiser** de la fiche joueur, en rouge. Le patron coche
**uniquement ce qu'il veut effacer** — chaque catégorie est indépendante :

| Catégorie | Ce qui est supprimé |
|---|---|
| Kilomètres parcourus | `distance_entries` du joueur ; le total repasse à 0 km |
| Feuilles de route en cours | `missions` aux statuts `proposed` / `progress` / `checking` + leurs preuves. Ne touche pas à l'historique *(séparé de l'historique en v41)* |
| Historique des feuilles de route | `missions` aux statuts `done` / `refused` + leurs `preuves_livraison` + les revenus de ces missions crédités au compte entreprise. Remet à zéro son nombre de livraisons et ses trophées *(catégorie distincte depuis la v41)* |
| Argent — solde et opérations | `transactions` du joueur **et leurs écritures miroir** côté compte entreprise (même `operation_ref`), pour que la caisse reste cohérente ; solde perso à 0 € |
| Notes & blâmes | `player_notes` du joueur |
| Rendez-vous & créneaux | `appointment_slots` qu'il a proposés ou réservés |
| Événements du calendrier | `calendar_events` qu'il a créés |
| Messagerie | `mails` envoyés et reçus |
| Fiche flotte | camion, permis, remorques et DLC remis à `null` dans `driver_profiles` |
| Photo de profil | `avatar_url` remis à `null` ; retour aux initiales |

Garde-fous :
- Le **compte lui-même n'est jamais touché** (profil, pseudo, rôle, mot de passe).
- Chaque ligne affiche le **nombre d'éléments concernés** ; une catégorie vide est
  grisée et non cochable.
- Il faut **taper « REINITIALISER »** dans un champ de confirmation, puis valider
  une seconde fenêtre listant les catégories choisies.
- La fiche se rouvre **toujours sur l'onglet Distance**, jamais sur Réinitialiser,
  et les cases sont décochées à chaque ouverture.
- Après coup, toutes les données sont rechargées et tous les écrans concernés
  redessinés (fiche, équipe, trésorerie, feuille de route, historique, tableau de
  bord, profil).

⚠️ Attention sur *Fiche flotte* : tant que le joueur n'a pas recoché ses DLC, les
menus Départ / Arrivée de ses futures missions n'afficheront plus aucune ville
(sauf à passer par la saisie manuelle ajoutée en v38).

##### ⚠️ Droits de suppression obligatoires (script `23-policies-suppression.sql`)

**Sans ce script, la réinitialisation ne supprime rien** — et le pire, c'est
qu'elle en donne l'illusion. Quand une policy RLS interdit un `DELETE`,
PostgREST/Supabase **ne renvoie aucune erreur** : il efface simplement 0 ligne,
en silence.

Avant la v40, le site ne supprimait que des mails, des événements de calendrier et
des créneaux — les tables `missions`, `preuves_livraison`, `transactions`,
`distance_entries` et `player_notes` n'avaient donc **jamais eu de policy
`DELETE`**. Le script `23-policies-suppression.sql` (v41) les ajoute toutes, plus
deux policies `UPDATE` pour que le patron puisse vider la fiche flotte et la photo
d'un **autre** joueur. Il crée au passage une fonction `public.est_patron()`
(`security definer`, pour éviter une récursion RLS sur `profiles`) et repose sur
`profiles.role = 'patron'`, la convention utilisée partout dans le site.

**Garde-fou ajouté en v41** : chaque suppression utilise `.select()` pour récupérer
les lignes réellement effacées. Si le compteur annonçait *N* éléments et que 0
ligne a bougé sans erreur, l'interface affiche explicitement qu'il manque les
droits de suppression et renvoie vers ce script, au lieu de laisser croire que
tout s'est bien passé.
- **Trésorerie** (script `16-tresorerie-operations-joueurs.sql`), rubrique
  entièrement privée au patron :
  - *Compte entreprise* — mouvements globaux, crédité automatiquement par le revenu
    des missions validées
  - *Opérations joueurs* — paie, remboursement de frais, prime ; chaque opération
    génère automatiquement un débit/crédit **miroir** entre compte entreprise et
    compte personnel du joueur
  - Le solde personnel du tableau de bord est branché sur les vraies opérations du
    joueur ; unité affichée « € » à côté du chiffre
  - « Derniers mouvements » n'affiche que les opérations du compte perso du joueur
    connecté (plus la caisse commune)
  - *Export comptable* (v43) — sélecteur de mois (avec le nombre de mouvements),
    récapitulatif chiffré (solde d'ouverture, crédits, débits, solde de clôture) et
    téléchargement **CSV** du mois ou de tout l'historique. Le CSV est en `;` avec BOM
    UTF-8 (Excel français), colonnes Date / Heure / Libellé / Détail / Catégorie /
    Débit / Crédit / Solde cumulé, ligne de solde à l'ouverture en tête et totaux en pied.
  - *Clôture mensuelle* (v43) — efface les mouvements du compte entreprise jusqu'à la
    fin du mois choisi (inclus) pour repartir sur une liste propre. Case cochée par
    défaut « Conserver l'argent en caisse » : une unique ligne **« Report à nouveau »**
    est recréée avec le solde de clôture, datée du dernier jour du mois. Les soldes
    personnels des joueurs, les opérations joueurs et les feuilles de route ne sont pas
    touchés. Même garde-fou RLS que la v41 (renvoi vers `23-policies-suppression.sql`
    si 0 ligne supprimée sans erreur).

---

### Réglages *(patron uniquement)*
Rubrique du menu latéral, section **Direction**. Tout ce qui y est enregistré est
stocké dans la table Supabase `site_contenu` (une ligne par clé, colonne
`contenu_html`) : **lecture publique** (la page de connexion doit s'afficher sans
être connecté), **écriture réservée au patron** via RLS.

- **Identité** (v30) :
  - *Nom de l'entreprise* (clé `nom_entreprise`) — appliqué au vol à la sidebar,
    au titre de la page de connexion, au titre de la page candidature, à l'onglet
    du navigateur et aux mentions « chez … depuis … » des fiches joueur
  - *Logo* (clé `logo_url`) — importé dans le bucket Storage **`logos`**
    (script `20-logo-entreprise.sql`), remplace le logo de la page de connexion ;
    bouton « Retirer le logo importé » pour revenir au logo embarqué dans le fichier
  - *Icône du menu latéral* (clé `icone_url`, v36) — le petit carré doré affiché à
    gauche du nom de l'entreprise dans la sidebar. Importée dans le même bucket
    **`logos`** (fichier `entreprise/icone.<ext>`). Boutons « Utiliser le logo de
    l'entreprise » et « Rétablir l'icône d'origine ». Quand une image est en place,
    le dégradé doré du carré disparaît au profit d'un fin liseré, et le pictogramme
    SVG d'origine est masqué. Une image carrée rend le mieux.
  - Couleur d'accent, monnaie virtuelle, dépôt principal, lien de candidature :
    toujours de simples aperçus non branchés (mention explicite dans l'interface)
- **Texte de la page de connexion** (clé `presentation`, script
  `19-presentation-page.sql`) — d'abord placé dans le Bureau du patron en v29,
  **déplacé dans Réglages en v30** :
  - Boutons *Modifier le texte* / *Enregistrer* / *Annuler* / *Restaurer le texte d'origine*
  - Seul le *texte* est modifiable (`contenteditable` posé sur les paragraphes,
    titres et éléments de liste), pas la structure des blocs

⚠️ Dans tous les cas, les valeurs écrites en dur dans `index.html` servent de
secours : première visite, ligne absente en base, ou base injoignable.

⚠️ **Séquelle du déplacement de v30, corrigée en v39.** En déplaçant l'édition du
texte du Bureau du patron vers Réglages, l'ancien bloc n'avait pas été supprimé :
une `<section class="card">` contenant un second `pres-admin-zone` /
`pres-admin-content` était restée **juste avant `</main>`, en dehors de toute
`.view`**, accompagnée d'une `</div>` et d'une `</section>` orphelines. Comme les
règles `.view { display:none } / .view.active { display:block }` ne s'appliquaient
pas à elle, cette carte vide s'affichait **en bas de chaque rubrique du site**, et
les IDs se retrouvaient en double. Le bloc et les deux balises orphelines ont été
retirés en v39 : le HTML est désormais entièrement équilibré, tous les enfants
directs de `<main>` sont des `.view` (plus la bannière `#pending-banner`), et il
n'y a plus aucun ID dupliqué.

---

## 6. Décisions et suppressions notables

- **Toutes les données factices ont été retirées** du site (mails, calendrier,
  réunions, rendez-vous, argent, profil, compteurs du tableau de bord). Aucune valeur
  codée en dur ne doit réapparaître.
- **Classement / leaderboard « Convoi — meilleurs soldes » : supprimé** (bouton
  sidebar, carte tableau de bord et vue), plutôt que d'être branché.
- Carte « Écrire un mail » patron-only du Bureau du patron : retirée (redondante avec
  la messagerie).
- Bandeau « TrucksBook n'a pas d'API publique » : retiré.

---

## 7. Scripts SQL — ordre d'exécution

| Script | Objet |
|---|---|
| `13-raison-refus.sql` | Motif de refus d'une preuve |
| `14-frais-livraison.sql` | Frais carburant / péages |
| `15-messagerie-interne.sql` | Table `mails` + RLS |
| `16-tresorerie-operations-joueurs.sql` | Trésorerie + policy RLS lecture des opérations |
| `17-avatar-profil.sql` | Photo de profil (bucket Storage) |
| `18-fiche-joueur.sql` | `distance_entries` + `player_notes` |
| `19-presentation-page.sql` | Table `site_contenu` (contenus modifiables du site) + RLS |
| `20-logo-entreprise.sql` | Bucket Storage `logos` + RLS (logo importable) |
| `21-bucket-logos.sql` | Création du bucket `logos` (public) + policies — corrige « Bucket not found » |
| `22-commentaire-mission.sql` | Colonne `commentaire` sur `missions` (informations diverses, v38) |
| `23-policies-suppression.sql` | Droits de suppression du patron — **obligatoire** pour que l'onglet Réinitialiser fonctionne (v41) |

Les versions v21 à v28 n'ont nécessité **aucun** script SQL ; la v29 nécessite
`19-presentation-page.sql`, la v30 y ajoute `20-logo-entreprise.sql`. Les versions
v31 à v37 ne nécessitent **aucun** script SQL côté site ; la v38 nécessite
`22-commentaire-mission.sql` ; les v39 et v40 ne nécessitent aucun script SQL ; la
v41 nécessite **`23-policies-suppression.sql`** ; la v42 ne nécessite aucun script
SQL supplémentaire (mais dépend de celui de la v41).

⚠️ **Bucket `logos` manquant.** À l'import d'un logo ou d'une icône, l'erreur
« Bucket not found » signifie que le bucket Storage `logos` n'existe pas dans le
projet Supabase (le script `20-logo-entreprise.sql` n'a jamais été exécuté).
Solution : exécuter **`21-bucket-logos.sql`** dans *SQL Editor > New query*. Il crée
le bucket en **lecture publique** (indispensable : la page de connexion affiche le
logo avant toute connexion) et pose les règles d'écriture / mise à jour /
suppression réservées au patron. Le script est rejouable sans risque. Variante par
l'interface : *Storage > New bucket*, nom `logos`, case **Public bucket** cochée —
mais les policies d'écriture restent à passer par le script.

---

## 8. Historique des versions

| Version | Contenu |
|---|---|
| v9 | Nettoyage global des données de test |
| v10 | Correction des pastilles de notification de la sidebar |
| v11 | Onglet « Refusées » + motif de refus |
| v12 | Villes ETS2 filtrées par DLC du chauffeur |
| v13 | Frais carburant / péages |
| v14 | Messagerie interne complète |
| v15 | Refonte de la trésorerie (compte entreprise + opérations joueurs) |
| v16 | Unité « € », mouvements perso au tableau de bord, refus en consultation seule |
| v17 | Boîte mail façon client mail (recherche, filtres, regroupement par date) |
| v19 | Photo de profil |
| v20 | Fiche joueur (Distance / Notes & blâmes / Transactions / Rendez-vous) |
| v21 | Formulaire de preuve masqué sur « À vérifier » et « Validées » |
| v22 | « Missions validées » → « Historique feuilles de route » |
| v23 | Renommage « SARL Transports Normands » partout + nom sidebar agrandi |
| v24 | Thème sombre & doré porté sur tout le site |
| v25 | Correction d'espacement sur « Mon profil » |
| v26 | Titres de section « Direction » / « Externe » masqués côté employé |
| v27 | Logo officiel sur la page de connexion (base64 intégré) |
| v28 | Légende retirée sous le logo + photo de route en fond de la page de connexion |
| v29 | Texte de la page de connexion réellement enregistré (onglet « Page d'accueil » du Bureau du patron) |
| v30 | Édition déplacée dans **Réglages** + nom de l'entreprise et logo réellement modifiables |
| v31 | Vrais formulaires de connexion (gestionnaire de mots de passe du navigateur) + case « Se souvenir de moi » |
| v32 | Historique feuilles de route : feuilles refusées incluses + limité aux 5 dernières |
| v33 | Photo du Mont-Saint-Michel en filigrane à droite de l'espace de travail (une fois connecté) |
| v34 | Fond Mont-Saint-Michel rendu réellement visible (opacité 17 % → 42 %, fondus revus) |
| v35 | Fond Mont-Saint-Michel recentré (décollé du bord droit, fondus latéraux symétriques) |
| v36 | Icône du menu latéral (petit carré doré) devenue modifiable dans Réglages > Identité |
| v37 | Icône et nom de l'entreprise doublés dans la sidebar (bloc vertical centré, sidebar élargie à 272 px) |
| v38 | Saisie manuelle cargaison/départ/arrivée + commentaire libre sur la mission |
| v39 | Suppression du cadre vide affiché en bas de chaque rubrique (bloc orphelin de la v30) |
| v40 | Onglet « Réinitialiser » de la fiche joueur : remise à zéro à la carte, catégorie par catégorie |
| v41 | Historique des feuilles de route séparé des missions en cours + droits de suppression (policies RLS) |
| v42 | Bouton « Réinitialiser l'historique » directement sur la rubrique Historique feuilles de route (patron) |
| v43 | Trésorerie : export comptable CSV mensuel + clôture mensuelle du compte entreprise (report à nouveau) |
| v44 | Salutation du tableau de bord branchée sur le pseudo du joueur connecté + nettoyage des traits de séparation du menu latéral |
| v45 | Restructuration technique (aucun changement visible pour les joueurs) : fichier unique découpé en `index.html` + `css/styles.css` + 11 fichiers `js/*.js` par domaine, 3 images extraites du base64 en fichiers réels dans `assets/images/` (poids de `index.html` : 670 Ko → 72 Ko). Site désormais versionné avec **Git**, poussé sur un dépôt **GitHub** privé (`Lychar14/transport-normand-ets2`), et déployé automatiquement par **Cloudflare Pages** relié en Git integration — fin du zip glissé-déposé sur Netlify |

*(Le script `21-bucket-logos.sql` accompagne la v36 si le bucket `logos` n'existe pas encore.)*

---

## 9. En cours / à faire

- [ ] **Ancien projet Cloudflare (dépôt direct)** — le nouveau projet Cloudflare
      Pages (relié à GitHub, v45) tourne en parallèle de l'ancien projet à dépôt
      manuel. Si un nom de domaine personnalisé pointait sur l'ancien projet, le
      migrer vers le nouveau une fois celui-ci confirmé stable, puis archiver ou
      supprimer l'ancien projet pour éviter la confusion entre les deux URLs.
- [ ] **Nom du logo** — décider s'il faut refaire le logo au pluriel
      (« Transports Normands ») pour coller au renommage de la v23.
- [ ] **Import automatique des missions TrucksBook** — pas d'API de lecture publique
      confirmée. Piste envisagée : un script backend de scraping, à écrire par le
      joueur lui-même en dehors de cette conversation. L'affichage cible reste une
      carte « Détail mission » dédiée, stylée selon le thème.
- [ ] **Enrichissement de la page profil joueur** — idées évoquées, rien de tranché.
- [ ] **Nom affiché au singulier** — la page de connexion en ligne affiche
      « SARL Transport Normand » alors que le nom enregistré devrait être au
      pluriel : valeur à corriger dans *Réglages > Identité* (clé
      `nom_entreprise`), sans nouvelle version du site.
- [ ] **Rubrique « Mes documents »** — encore entièrement factice (4 documents
      d'exemple codés en dur, publiés par « Lychar » avec des dates fictives) :
      à brancher sur une vraie table Supabase + un bucket Storage.
- [ ] **Autres textes du site** — la table `site_contenu` peut accueillir d'autres
      clés (page candidature, réglages…) si besoin d'autres textes modifiables
      sans repasser par une nouvelle version du zip.
