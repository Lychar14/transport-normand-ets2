  // Onglets Se connecter / Créer un compte
  document.querySelectorAll('.auth-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('auth-' + btn.dataset.auth).classList.add('active');
    });
  });

  function enterApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    initAppData();
  }

  function setStatus(elId, message, isError) {
    const el = document.getElementById(elId);
    el.textContent = message;
    el.style.color = isError ? 'var(--burgundy)' : 'var(--muted)';
  }

  // ---------- Connexion ----------
  async function handleSignIn() {
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const btn = document.getElementById('enter-app');
    if (!email || !password) { setStatus('signin-status', 'Renseigne ton mail et ton mot de passe.', true); return; }

    // Choix "Se souvenir de moi" enregistré AVANT la connexion, pour que la
    // session soit rangée au bon endroit dès qu'elle est créée.
    const caseMemoire = document.getElementById('remember-me');
    const seSouvenir = caseMemoire ? caseMemoire.checked : true;
    try { localStorage.setItem(CLE_MEMOIRE, seSouvenir ? '1' : '0'); } catch (e) {}

    btn.disabled = true; btn.textContent = 'Connexion...';
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Se connecter';

    if (error) {
      setStatus('signin-status', 'Connexion impossible : ' + error.message, true);
      return;
    }

    // On ne garde que l'adresse mail (jamais le mot de passe : c'est le
    // gestionnaire du navigateur qui s'en charge, de façon chiffrée).
    try {
      if (seSouvenir) localStorage.setItem(CLE_DERNIER_MAIL, email);
      else localStorage.removeItem(CLE_DERNIER_MAIL);
    } catch (e) {}

    setStatus('signin-status', '', false);
    enterApp();
  }

  // ---------- Création de compte ----------
  async function handleSignUp() {
    const pseudo = document.getElementById('signup-pseudo').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const btn = document.getElementById('create-app');
    if (!pseudo || !email || !password) { setStatus('signup-status', 'Tous les champs sont obligatoires.', true); return; }
    if (password.length < 8) { setStatus('signup-status', 'Le mot de passe doit faire au moins 8 caractères.', true); return; }

    btn.disabled = true; btn.textContent = 'Création...';
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { pseudo } } // stocké dans auth.users, repris par le trigger "profiles"
    });
    btn.disabled = false; btn.textContent = 'Créer mon compte';

    if (error) {
      setStatus('signup-status', 'Inscription impossible : ' + error.message, true);
      return;
    }
    if (data.session) {
      // Confirmation email désactivée dans Supabase → session immédiate
      enterApp();
    } else {
      // Confirmation email activée → il faut cliquer le lien reçu par mail
      setStatus('signup-status', 'Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.', false);
    }
  }

  // ---------- Session déjà active ? (on ne redemande pas la connexion) ----------
  async function checkExistingSession() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) enterApp();
  }

  // ---------- Pré-remplissage de la page de connexion ----------
  (function preRemplirConnexion() {
    const caseMemoire = document.getElementById('remember-me');
    const champMail = document.getElementById('signin-email');
    if (caseMemoire) caseMemoire.checked = resterConnecte();
    try {
      const dernierMail = localStorage.getItem(CLE_DERNIER_MAIL);
      if (dernierMail && champMail && !champMail.value) champMail.value = dernierMail;
    } catch (e) {}
  })();

  // Vrais formulaires : la touche Entrée fonctionne, et le navigateur peut
  // proposer d'enregistrer le mot de passe dans son gestionnaire.
  document.getElementById('auth-signin').addEventListener('submit', (e) => { e.preventDefault(); handleSignIn(); });
  document.getElementById('auth-signup').addEventListener('submit', (e) => { e.preventDefault(); handleSignUp(); });
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
  });

  document.querySelectorAll('.sidenav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidenav button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
      // La rubrique Réglages recharge le texte de présentation dans son cadre
      if (btn.dataset.view === 'settings') renderPresentationAdmin();
    });
  });

  // Raccourcis "Tout voir" depuis le tableau de bord
  document.querySelectorAll('.jump-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.sidenav button[data-view="' + link.dataset.jump + '"]').click();
    });
  });

  // Filtres de statut — Feuille de route
  const roadsheetFilters = document.getElementById('roadsheet-filters');
  if (roadsheetFilters) {
    roadsheetFilters.querySelectorAll('.radio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        roadsheetFilters.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        const filter = pill.dataset.filter;
        document.querySelectorAll('#view-roadsheet .task-row').forEach(row => {
          row.style.display = (filter === 'all' || row.dataset.status === filter) ? 'flex' : 'none';
        });
        const submitCard = document.getElementById('proof-submit-card');
        if (submitCard) submitCard.style.display = (filter === 'refused' || filter === 'checking' || filter === 'done') ? 'none' : '';
      });
    });
  }

  // Sous-onglets — Bureau du patron
  const officeTabs = document.getElementById('office-tabs');
  function switchOfficeTab(name) {
    if (!officeTabs) return;
    officeTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.office-view').forEach(v => v.classList.remove('active'));
    const btn = officeTabs.querySelector(`[data-office="${name}"]`);
    if (btn) btn.classList.add('active');
    const view = document.getElementById('office-' + name);
    if (view) view.classList.add('active');
  }
  if (officeTabs) {
    officeTabs.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => switchOfficeTab(btn.dataset.office));
    });
  }

  // Pré-remplit et ouvre le formulaire "Créer une opération joueur" (ex : depuis "Rembourser les frais")
  function prefillOperation(chauffeurId, montant, motif, typeLabel) {
    switchOfficeTab('transactions');
    const memberSelect = document.getElementById('op-member-select');
    const typeSelect = document.getElementById('op-type-select');
    const montantInput = document.getElementById('op-montant');
    const motifInput = document.getElementById('op-motif');
    const debitCb = document.getElementById('op-debit-joueur');
    if (memberSelect) memberSelect.value = chauffeurId;
    if (typeSelect && typeLabel) typeSelect.value = typeLabel;
    if (montantInput) montantInput.value = montant;
    if (motifInput) motifInput.value = motif;
    if (debitCb) debitCb.checked = false;
    setTimeout(() => document.getElementById('op-submit-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }
