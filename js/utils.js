  // ---------- Connexion à Supabase ----------
  // Project URL et clé publique (anon/publishable) — récupérables dans
  // Supabase > Project Settings > API. La clé "anon" est publique par design,
  // ce n'est pas un secret (contrairement à la "service_role" à ne JAMAIS mettre ici).
  const SUPABASE_URL = 'https://bzaroizpkknnpgbamlnp.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_L0a3kutb2N3GSZyJSRu2sA_fTVQ4aH3';
  // ---------- "Se souvenir de moi" ----------
  // Deux clés simples enregistrées dans le navigateur (jamais le mot de passe) :
  //   tn_rester_connecte → '1' la session survit à la fermeture du navigateur
  //                        '0' la session est oubliée dès que l'onglet est fermé
  //   tn_dernier_mail    → l'adresse mail à pré-remplir au prochain chargement
  const CLE_MEMOIRE = 'tn_rester_connecte';
  const CLE_DERNIER_MAIL = 'tn_dernier_mail';

  function resterConnecte() {
    try { return localStorage.getItem(CLE_MEMOIRE) !== '0'; } catch (e) { return true; }
  }

  // Supabase range la session via ce petit "coffre" : on l'aiguille vers le
  // stockage permanent ou temporaire selon le choix fait sur la page de connexion.
  const stockageSession = {
    getItem: (cle) => {
      try { return localStorage.getItem(cle) || sessionStorage.getItem(cle); } catch (e) { return null; }
    },
    setItem: (cle, valeur) => {
      try {
        if (resterConnecte()) { sessionStorage.removeItem(cle); localStorage.setItem(cle, valeur); }
        else { localStorage.removeItem(cle); sessionStorage.setItem(cle, valeur); }
      } catch (e) { /* navigation privée très restrictive : on ignore */ }
    },
    removeItem: (cle) => {
      try { localStorage.removeItem(cle); sessionStorage.removeItem(cle); } catch (e) {}
    }
  };

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: stockageSession,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Liste des DLC officiels ETS2 — définie tôt car utilisée dès le chargement
  // de la page (page de candidature publique, avant toute connexion).
  const DLC_LIST = [
    'France (jeu de base)', 'Going East!', 'Scandinavia', 'Vive la France !',
    'Italia', 'Iberia', 'Beyond the Baltic Sea', 'Road to the Black Sea',
    'West Balkans', 'Greece', 'Nordic Horizons', 'Soul of Anatolia'
  ];

  // Villes ETS2 par DLC — utilisées pour ne proposer, lors de la création d'une
  // feuille de route, que les villes réellement accessibles au chauffeur choisi
  // (selon les DLC cochés sur sa fiche "Ma flotte" / Suivi des chauffeurs).
  // Liste non exhaustive (le patron l'enrichira au fil de l'eau) ; "Nordic
  // Horizons" et "Soul of Anatolia" n'ont pas encore de villes renseignées.
  const VILLES_PAR_DLC = {
    'France (jeu de base)': ['Rouen', 'Paris', 'Le Havre', 'Lyon', 'Marseille'],
    'Going East!': [
      'Białystok', 'Gdańsk', 'Katowice', 'Kraków', 'Lublin', 'Łódź', 'Olsztyn', 'Poznań', 'Szczecin', 'Warszawa', 'Wrocław',
      'Ostrava',
      'Banská Bystrica', 'Košice',
      'Budapest', 'Debrecen', 'Pécs', 'Szeged'
    ],
    'Scandinavia': [
      'Aalborg', 'Aarhus', 'Copenhague', 'Esbjerg', 'Frederikshavn', 'Gedser', 'Hirtshals', 'Odense',
      'Göteborg', 'Helsingborg', 'Jönköping', 'Kalmar', 'Karlskrona', 'Linköping', 'Malmö', 'Nynäshamn', 'Orebro',
      'Stockholm', 'Södertälje', 'Umeå', 'Uppsala', 'Västerås', 'Växjö',
      'Bergen', 'Oslo', 'Stavanger', 'Kristiansand'
    ],
    'Vive la France !': [
      'Ajaccio (Corse)', 'Bastia (Corse)', 'Bayonne', 'Bordeaux', 'Bourges', 'Brest', 'Brive-la-Gaillarde', 'Calvi (Corse)',
      'Clermont-Ferrand', 'Dijon', 'La Rochelle', 'Le Havre', 'Le Mans', 'Lille', 'Limoges', 'Lyon', 'Marseille',
      'Montpellier', 'Nantes', 'Nice', 'Orléans', 'Paris', 'Perpignan', 'Rennes', 'Roscoff', 'Rouen', 'Strasbourg', 'Toulouse'
    ],
    'Italia': [
      'Ancona', 'Bari', 'Bologna', 'Cagliari (Sardaigne)', 'Cassino', 'Catania (Sicile)', 'Catanzaro', 'Firenze', 'Genova',
      'Livorno', 'Messina (Sicile)', 'Milano', 'Napoli', 'Palermo (Sicile)', 'Parma', 'Pescara', 'Roma', 'Suzzara',
      'Taranto', 'Terni', 'Torino', 'Venezia'
    ],
    'Iberia': [
      'A Coruña', 'Albacete', 'Algeciras', 'Almería', 'Badajoz', 'Barcelona', 'Bilbao', 'Burgos', 'Castellón de la Plana',
      'Ciudad Real', 'Córdoba', 'El Ejido', 'Gijón', 'Granada', 'Huelva', 'Huesca', 'Jaén', 'León', 'Lleida', 'Logroño',
      'Madrid', 'Málaga', 'Murcia', 'Navalmoral de la Mata', 'Orense', 'Oviedo', 'Pamplona', 'Plasencia', 'Salamanca',
      'Santander', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Valencia', 'Valladolid', 'Vigo', 'Zaragoza',
      'Beja', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Lisboa', 'Leiria', 'Olhão', 'Portalegre', 'Porto', 'Santarém',
      'Setúbal', 'Sines'
    ],
    'Beyond the Baltic Sea': [
      'Kaunas', 'Klaipėda', 'Mažeikiai', 'Panevėžys', 'Utena', 'Vilnius',
      'Daugavpils', 'Liepāja', 'Rēzekne', 'Rīga', 'Ventspils',
      'Kunda', 'Narva', 'Paldiski', 'Pärnu', 'Tallinn', 'Tartu',
      'Helsinki', 'Kotka', 'Kouvola', 'Lahti', 'Loviisa', 'Naantali', 'Pori', 'Tampere', 'Turku', 'Vaasa',
      'Kaliningrad', 'Luga', 'Pskov', 'Saint-Pétersbourg', 'Sosnovy Bor', 'Vyborg'
    ],
    'Road to the Black Sea': [
      'Bacău', 'Brașov', 'București', 'Călărași', 'Cernavodă', 'Cluj-Napoca', 'Constanța', 'Craiova', 'Galați',
      'Hunedoara', 'Iași', 'Pitești', 'Ploiești', 'Reșița', 'Sighișoara', 'Timișoara', 'Târgu Mureș', 'Tulcea',
      'Burgas', 'Pernik', 'Plovdiv', 'Ruse', 'Sofia', 'Varna', 'Veliko Tarnovo',
      'Edirne', 'Istanbul', 'Tekirdağ'
    ],
    'West Balkans': [
      'Koper', 'Ljubljana', 'Maribor', 'Novo Mesto',
      'Osijek', 'Rijeka', 'Split', 'Zadar', 'Zagreb',
      'Banja Luka', 'Bihać', 'Mostar', 'Sarajevo', 'Tuzla', 'Zenica',
      'Belgrade', 'Kragujevac', 'Niš', 'Novi Sad',
      'Bijelo Polje', 'Podgorica',
      'Pristina',
      'Durrës', 'Fier', 'Tirana', 'Vlorë',
      'Bitola', 'Skopje'
    ],
    'Greece': [
      'Athènes', 'Thessalonique', 'Patras', 'Ioannina', 'Larissa', 'Kalamata',
      'Chania (Crète)', 'Héraklion (Crète)', 'Rhodes (île)', 'Mytilène (Lesbos)'
    ],
    'Nordic Horizons': [],
    'Soul of Anatolia': []
  };

  // Construit les <optgroup> de villes réellement accessibles pour un chauffeur,
  // d'après la liste CSV de ses DLC débloqués (colonne dlc_debloquees).
  // "France (jeu de base)" est masqué si "Vive la France !" est débloqué,
  // ce DLC refaisant entièrement la carte française (évite les doublons de villes).
  function buildCityOptionsHtml(dlcCsv) {
    const unlocked = (dlcCsv || '').split(',').map(s => s.trim()).filter(Boolean);
    const hasViveLaFrance = unlocked.includes('Vive la France !');
    let html = '';
    DLC_LIST.forEach(dlc => {
      if (dlc === 'France (jeu de base)') {
        if (hasViveLaFrance) return;
      } else if (!unlocked.includes(dlc)) {
        return;
      }
      const villes = VILLES_PAR_DLC[dlc] || [];
      if (villes.length === 0) return;
      html += `<optgroup label="${dlc}">${villes.map(v => `<option>${v}</option>`).join('')}</optgroup>`;
    });
    if (!html) {
      html = `<optgroup label="Aucun DLC renseigné"><option disabled selected>Ce chauffeur n'a aucun DLC coché sur sa fiche</option></optgroup>`;
    }
    return html;
  }

  // Met à jour les menus "Départ" / "Arrivée" du formulaire de mission selon
  // les DLC réellement débloqués par le membre actuellement sélectionné.
  function updateMissionCityOptions() {
    const departSelect = document.getElementById('mission-depart');
    const arriveeSelect = document.getElementById('mission-arrivee');
    if (!departSelect || !arriveeSelect) return;
    const dp = selectedMemberId ? driverProfileOf(selectedMemberId) : null;
    const html = buildCityOptionsHtml(dp?.dlc_debloquees);
    departSelect.innerHTML = html;
    arriveeSelect.innerHTML = html;
  }

  // Génère les cases à cocher DLC sur la page de candidature publique
  const recruitDlcOptions = document.getElementById('recruit-dlc-options');
  if (recruitDlcOptions) {
    recruitDlcOptions.innerHTML = DLC_LIST.map(d =>
      `<label class="tag" style="cursor:pointer;"><input type="checkbox" class="recruit-dlc-cb" value="${d}" style="margin-right:5px;" />${d}</label>`
    ).join('');
  }

  // ==========================================================
  // MOTEUR DE DONNÉES — profils, missions, preuves de livraison
  // ==========================================================
  let currentProfile = null;   // { id, pseudo, role }
  let allProfiles = [];        // tous les profils (pour les noms et le sélecteur "Membre")
  let allMissions = [];
  let selectedMemberId = null; // membre choisi dans le formulaire "Missions" du Bureau du patron

  function timeAgo(dateStr) {
    const diffMin = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    return `il y a ${Math.round(diffH / 24)} j`;
  }
  function formatDate(dateStr) {
    if (!dateStr) return 'sans échéance';
    const d = new Date(dateStr);
    return 'échéance : ' + d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
  function pseudoOf(id) {
    const p = allProfiles.find(p => p.id === id);
    return p ? p.pseudo : '—';
  }
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const STATUS_LABEL = { proposed: 'Proposée', progress: 'En cours', checking: 'À vérifier', done: 'Validée', refused: 'Refusée' };

  // ---------- Boîte mail (messagerie interne réelle) ----------
  let allMails = [];              // tous les mails où je suis expéditeur ou destinataire (RLS)
  let currentMailTab = 'inbox';   // 'inbox' | 'sent'
  let mailSearchQuery = '';       // texte de recherche dans la Boîte mail
  let mailUnreadOnly = false;     // filtre "Non lus" de la Boîte mail
  let selectedMailId = null;      // mail actuellement ouvert dans le volet de lecture
  let selectedMailRecipient = null; // id d'un membre, ou 'all' pour toute l'équipe

  function majSeparateursMenu() {
    const groupes = Array.from(document.querySelectorAll('.sidenav .nav-group'));
    groupes.forEach(g => g.classList.remove('is-empty', 'nav-closing'));
    groupes.forEach(g => {
      const boutonVisible = Array.from(g.querySelectorAll('button'))
        .some(b => b.style.display !== 'none');
      const titre = g.querySelector('.nav-label');
      const titreVisible = !!titre && titre.style.display !== 'none';
      if (!boutonVisible && !titreVisible) g.classList.add('is-empty');
    });
    const visibles = groupes.filter(g => !g.classList.contains('is-empty'));
    const masques = groupes.length - visibles.length;
    if (masques > 0 && visibles.length) {
      visibles[visibles.length - 1].classList.add('nav-closing');
    }
  }
