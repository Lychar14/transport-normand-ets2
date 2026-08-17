  async function initAppData() {
    // 1) Mon profil
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    currentProfile = profile;

    // 2) Nom + rôle dans la sidebar
    const footer = document.querySelector('.sidebar-footer');
    if (footer && currentProfile) {
      document.getElementById('sidebar-pseudo').textContent = currentProfile.pseudo || 'Membre';
      const roleLabel = currentProfile.role === 'patron' ? 'Patron' : (currentProfile.valide ? 'Employé' : 'En attente');
      footer.querySelector('.role-pill').textContent = roleLabel;
      const sidebarAvatar = document.getElementById('sidebar-avatar');
      if (sidebarAvatar) sidebarAvatar.style.backgroundImage = currentProfile.avatar_url ? `url('${currentProfile.avatar_url}')` : '';
    }

    // 2bis) Salutation du tableau de bord = pseudo choisi a l'inscription
    const greetEl = document.getElementById('dashboard-greeting');
    if (greetEl) {
      const pseudo = (currentProfile && currentProfile.pseudo) ? String(currentProfile.pseudo).trim() : '';
      greetEl.textContent = pseudo ? `Bonjour, ${pseudo}.` : 'Bonjour.';
    }

    // 3) Bureau du patron / Réglages réservés au rôle patron
    // On réinitialise D'ABORD tous les boutons à "visible" pour éviter qu'un
    // état caché d'une connexion précédente (dans le même onglet) ne persiste.
    document.querySelectorAll('.sidenav button[data-view]').forEach(btn => { btn.style.display = ''; });
    document.querySelectorAll('.sidenav .nav-group.direction .nav-label, .sidenav .nav-group.externe .nav-label').forEach(lbl => { lbl.style.display = ''; });

    const isPatron = currentProfile && currentProfile.role === 'patron';
    document.querySelectorAll('.sidenav [data-view="office"], .sidenav [data-view="settings"]').forEach(btn => {
      btn.style.display = isPatron ? '' : 'none';
    });
    // Les titres de section "Direction" et "Externe" ne sont affichés que pour le patron
    document.querySelectorAll('.sidenav .nav-group.direction .nav-label, .sidenav .nav-group.externe .nav-label').forEach(lbl => {
      lbl.style.display = isPatron ? '' : 'none';
    });
    // Le widget "Derniers mouvements" du tableau de bord affiche uniquement les
    // opérations du compte perso du joueur connecté (voir renderTransactions) —
    // le compte entreprise reste réservé au Bureau du patron > Trésorerie

    // 3bis) Compte non encore validé par le patron → accès restreint
    //       (uniquement Boîte mail, Calendrier, Rendez-vous)
    const isValidated = isPatron || (currentProfile && currentProfile.valide === true);
    const banner = document.getElementById('pending-banner');
    const ALWAYS_ALLOWED_VIEWS = ['mail', 'calendar', 'appointments'];
    if (!isValidated) {
      if (banner) banner.style.display = 'block';
      document.querySelectorAll('.sidenav button[data-view]').forEach(btn => {
        const view = btn.dataset.view;
        if (!ALWAYS_ALLOWED_VIEWS.includes(view) && view !== 'recruit') {
          btn.style.display = 'none';
        }
      });
      // On bascule directement sur la Boîte mail au lieu du Tableau de bord (masqué)
      document.querySelectorAll('.sidenav button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelector('.sidenav [data-view="mail"]').classList.add('active');
      document.getElementById('view-mail').classList.add('active');
    } else if (banner) {
      banner.style.display = 'none';
    }

    // Le lien "Page candidature" ne sert qu'aux comptes pas encore validés
    // (candidats en attente) — une fois membre officiel, plus besoin de le voir.
    const recruitNavBtn = document.querySelector('.sidenav [data-view="recruit"]');
    if (recruitNavBtn) recruitNavBtn.style.display = isValidated ? 'none' : '';

    // 3ter) Nettoyage des traits de separation du menu lateral.
    // Chez l'employe, les groupes "Direction" et "Externe" n'ont ni bouton ni
    // titre visible : leurs traits restaient affiches (deux liserés dores dans
    // le vide sous "Mes documents"). On masque ces groupes vides et on ajoute un
    // seul trait de cloture sous le dernier bouton. Le patron, dont les groupes
    // gardent au moins un titre visible, n'est pas affecte.
    majSeparateursMenu();

    // 4) Tous les profils (pour les noms affichés + sélecteur de membre)
    const { data: profiles } = await supabaseClient.from('profiles').select('*').order('pseudo');
    allProfiles = profiles || [];
    const membresBadge = document.getElementById('office-stat-membres');
    if (membresBadge) membresBadge.textContent = String(allProfiles.length);

    // 4bis) Boîte mail — accessible à tout le monde, y compris les comptes en attente de validation
    await loadMails();
    renderMailRecipientPills();
    renderMailList();
    renderMailReading();
    updateMailBadge();
    renderDashboardMails();

    // 5) Missions
    await loadMissions();
    renderRoadsheet();
    await loadValidatedProofs();
    renderDashboardStats();
    await loadMyFleet();
    await loadDistanceEntries();
    renderProfile();
    renderMyFleet();
    renderMissionsValidees();
    if (isPatron) {
      await loadDriverProfiles();
      renderDriverProfiles();
      renderMemberPills();
      await renderValidations();
      renderOfficeOverview();
      renderOfficeTeam();
      populateOperationMemberSelect();
      await loadCandidatures();
      renderCandidatures();
    }

    // 6) Transactions / carnet de bord
    await loadTransactions();
    renderTransactions();
    if (isPatron) renderOfficeOverview(); // dépend aussi des transactions (chiffre d'affaires, objectif)

    // 7) Rendez-vous (chargés avant le calendrier pour que les RDV confirmés y apparaissent dès le premier rendu)
    await loadAppointmentSlots();
    renderAppointments();
    if (isPatron) renderOfficeAppointments();

    // 8) Calendrier
    await loadCalendarEvents();
    renderCalendar();
  }


  // Déclenche la vérification de session UNE FOIS tous les scripts chargés
  // (voir tous les autres fichiers js/*.js, chargés juste avant celui-ci) —
  // évite une course où initAppData() serait appelée avant que les fonctions
  // des autres domaines (mail, feuille de route, bureau du patron...) soient
  // définies.
  document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
  });
