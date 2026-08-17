  // ---------- Bureau du patron : sélecteur de membre (création de mission) ----------
  function renderMemberPills() {
    const wrap = document.getElementById('mission-member-pills');
    if (!wrap) return;
    // Tout le monde peut recevoir une mission, y compris le patron lui-même
    const members = allProfiles;
    if (members.length === 0) {
      wrap.innerHTML = '<span class="radio-pill" style="color:var(--muted);">Aucun membre inscrit pour l\'instant</span>';
      return;
    }
    if (!selectedMemberId) selectedMemberId = currentProfile?.id || members[0].id;
    wrap.innerHTML = members.map(p =>
      `<span class="radio-pill ${p.id === selectedMemberId ? 'selected' : ''}" data-member-id="${p.id}">${p.pseudo}${p.role === 'patron' ? ' (toi)' : ''}</span>`
    ).join('');
    wrap.querySelectorAll('.radio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedMemberId = pill.dataset.memberId;
        wrap.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        updateMissionCityOptions();
      });
    });
    updateMissionCityOptions();
  }

  // Bascule liste déroulante <-> saisie manuelle (cargaison, départ, arrivée)
  const missionManualMode = { cargaison: false, depart: false, arrivee: false };
  document.querySelectorAll('[data-manual-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const champ = btn.dataset.manualToggle;
      const select = document.getElementById('mission-' + champ);
      const input = document.getElementById('mission-' + champ + '-manuel');
      if (!select || !input) return;
      missionManualMode[champ] = !missionManualMode[champ];
      if (missionManualMode[champ]) {
        select.style.display = 'none';
        input.style.display = 'block';
        btn.textContent = '☰ Revenir à la liste';
        input.focus();
      } else {
        select.style.display = '';
        input.style.display = 'none';
        btn.textContent = '✎ Saisie manuelle';
      }
    });
  });

  // Valeur retenue pour un champ : la saisie manuelle si elle est active, sinon la liste
  function missionFieldValue(champ) {
    if (missionManualMode[champ]) {
      return (document.getElementById('mission-' + champ + '-manuel').value || '').trim();
    }
    return document.getElementById('mission-' + champ).value;
  }

  // Création d'une mission (Bureau du patron > Missions)
  const missionCreateBtn = document.getElementById('mission-create-btn');
  if (missionCreateBtn) {
    missionCreateBtn.addEventListener('click', async () => {
      const cargaison = missionFieldValue('cargaison');
      const depart = missionFieldValue('depart');
      const arrivee = missionFieldValue('arrivee');
      const echeance = document.getElementById('mission-echeance').value || null;
      const commentaire = (document.getElementById('mission-commentaire').value || '').trim() || null;

      if (!selectedMemberId) { setStatus('mission-create-status', 'Choisis d\'abord un membre.', true); return; }
      if (!cargaison) { setStatus('mission-create-status', 'Indique une cargaison.', true); return; }
      if (!depart || !arrivee || depart === '—' || arrivee === '—') { setStatus('mission-create-status', 'Indique une ville de départ et une ville d\'arrivée.', true); return; }
      if (depart.toLowerCase() === arrivee.toLowerCase()) { setStatus('mission-create-status', 'Le départ et l\'arrivée doivent être différents.', true); return; }

      missionCreateBtn.disabled = true; missionCreateBtn.textContent = 'Création...';
      const { error } = await supabaseClient.from('missions').insert({
        titre: cargaison,
        ville_depart: depart,
        ville_arrivee: arrivee,
        cargaison: cargaison,
        commentaire: commentaire,
        echeance: echeance,
        statut: 'proposed',
        assigned_to: selectedMemberId,
        created_by: currentProfile.id
      });
      missionCreateBtn.disabled = false; missionCreateBtn.textContent = 'Ajouter à sa feuille de route';

      if (error) {
        setStatus('mission-create-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('mission-create-status', `Mission ajoutée à la feuille de route de ${pseudoOf(selectedMemberId)} !`, false);
      document.getElementById('mission-commentaire').value = '';
      await loadMissions();
      renderRoadsheet();
    });
  }

  // ---------- Bureau du patron : pastille globale (validations) ----------
  function updateOfficeAlertCount() {
    const badge = document.getElementById('office-alert-count');
    if (!badge) return;
    const nbValidations = parseInt(document.getElementById('validation-count')?.textContent || '0', 10) || 0;
    badge.textContent = String(nbValidations);
  }

  // ---------- Bureau du patron : validations ----------
  async function renderValidations() {
    const list = document.getElementById('validation-list');
    const countEl = document.getElementById('validation-count');
    const tabBadge = document.querySelector('#office-tabs [data-office="validation"] .badge-count');
    if (!list) return;

    const { data: preuves } = await supabaseClient
      .from('preuves_livraison')
      .select('*')
      .eq('statut', 'en_attente')
      .order('submitted_at', { ascending: true });

    if (countEl) countEl.textContent = String((preuves || []).length);
    if (tabBadge) tabBadge.textContent = String((preuves || []).length);
    updateOfficeAlertCount();

    if (!preuves || preuves.length === 0) {
      list.innerHTML = '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucune preuve en attente. 👍</p>';
      return;
    }

    list.innerHTML = preuves.map(p => {
      const mission = allMissions.find(m => m.id === p.mission_id);
      const titre = mission ? `${mission.titre} — ${mission.ville_depart} → ${mission.ville_arrivee}` : 'Mission introuvable';
      const lienHtml = p.lien_trucksbook
        ? `<a href="${p.lien_trucksbook}" target="_blank" rel="noopener" class="proof-link">Voir le lien TrucksBook ↗</a>`
        : '<span class="proof-link" style="color:var(--muted);">Pas de lien fourni</span>';
      const revenuDeclare = Number(p.revenu_declare) || 0;
      const fraisCarburant = Number(p.frais_carburant) || 0;
      const fraisPeages = Number(p.frais_peages) || 0;
      const fraisTotal = fraisCarburant + fraisPeages;
      const revenuHtml = revenuDeclare > 0
        ? `<div style="color:var(--muted); font-size:0.78rem; margin-top:4px;">💰 Revenu déclaré : <strong style="color:var(--text);">${revenuDeclare.toFixed(2)} €</strong> (ajouté au compte entreprise à la validation)</div>`
        : '';
      const fraisHtml = (fraisCarburant > 0 || fraisPeages > 0)
        ? `<div style="color:var(--muted); font-size:0.78rem; margin-top:4px;">⛽ Carburant : ${fraisCarburant.toFixed(2)} € · 🛣️ Péages : ${fraisPeages.toFixed(2)} € · <strong style="color:var(--text);">Total : ${fraisTotal.toFixed(2)} €</strong></div>`
        : '';
      return `
        <div class="validation-row">
          <div class="proof-thumb"><span>🔗</span></div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:0.9rem;">${titre}</div>
            <div style="color:var(--muted); font-size:0.78rem; margin-top:2px;">Soumis par ${pseudoOf(p.chauffeur_id)} · ${timeAgo(p.submitted_at)}</div>
            ${lienHtml}
            ${revenuHtml}
            ${fraisHtml}
            ${mission && mission.commentaire ? `<div class="mission-comment">💬 ${escapeHtml(mission.commentaire)}</div>` : ''}
            ${fraisTotal > 0 ? `<button class="btn-mini" data-rembourser-frais="${p.chauffeur_id}" data-frais-montant="${fraisTotal.toFixed(2)}" data-frais-mission="${titre.replace(/"/g, '&quot;')}" style="margin-top:0.5rem;">Rembourser les frais (${fraisTotal.toFixed(2)} €)</button>` : ''}
          </div>
          <div class="proof-controls">
            <div class="alert-actions">
              <button class="btn-mini accept" data-proof-action="valider" data-proof-id="${p.id}" data-mission-id="${p.mission_id}" data-revenu="${revenuDeclare}" data-titre="${titre.replace(/"/g, '&quot;')}" data-chauffeur-id="${p.chauffeur_id}">Valider</button>
              <button class="btn-mini decline" data-proof-action="refuser">Refuser</button>
            </div>
            <div class="refuse-reason-box" style="display:none; width:100%; margin-top:0.75rem;">
              <textarea class="input-real" style="width:100%; min-height:60px; resize:vertical;" placeholder="Explique la raison du refus (visible par le chauffeur)…"></textarea>
              <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <button class="btn-mini decline" data-confirm-refuse="${p.id}" data-mission-id="${p.mission_id}">Confirmer le refus</button>
                <button class="btn-mini" data-cancel-refuse>Annuler</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    // Valider directement
    list.querySelectorAll('[data-proof-action="valider"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const proofId = btn.dataset.proofId;
        const missionId = btn.dataset.missionId;
        const revenu = Number(btn.dataset.revenu) || 0;
        const titre = btn.dataset.titre || '';
        const chauffeurId = btn.dataset.chauffeurId;
        btn.closest('.validation-row').style.opacity = '0.5';

        await supabaseClient.from('preuves_livraison').update({
          statut: 'validee',
          validated_by: currentProfile.id,
          validated_at: new Date().toISOString()
        }).eq('id', proofId);

        await supabaseClient.from('missions').update({ statut: 'done' }).eq('id', missionId);

        // Revenu de la mission déclaré par le chauffeur → ajouté automatiquement au compte entreprise
        if (revenu > 0) {
          await supabaseClient.from('transactions').insert({
            libelle: `Mission validée — ${titre}`,
            sous_libelle: `Revenu déclaré · chauffeur : ${pseudoOf(chauffeurId)}`,
            montant: revenu,
            type: 'entreprise',
            mission_id: missionId,
            created_by: currentProfile.id
          });
          await loadTransactions();
          renderTransactions();
          renderOfficeOverview();
        }

        await loadMissions();
        renderRoadsheet();
        await renderValidations();
        await loadValidatedProofs();
        renderDashboardStats();
        renderProfile();
        renderMissionsValidees();
      });
    });

    // Rembourser les frais réels en un clic → pré-remplit l'opération joueur en Trésorerie
    list.querySelectorAll('[data-rembourser-frais]').forEach(btn => {
      btn.addEventListener('click', () => {
        prefillOperation(btn.dataset.rembourserFrais, btn.dataset.fraisMontant, `Remboursement frais réels — ${btn.dataset.fraisMission}`, 'Remboursement de frais réels');
      });
    });

    // Refuser : ouvre l'encart de motif
    list.querySelectorAll('[data-proof-action="refuser"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const controls = btn.closest('.proof-controls');
        controls.querySelector('.alert-actions').style.display = 'none';
        controls.querySelector('.refuse-reason-box').style.display = 'block';
        controls.querySelector('textarea').focus();
      });
    });

    // Annuler le refus en cours
    list.querySelectorAll('[data-cancel-refuse]').forEach(btn => {
      btn.addEventListener('click', () => {
        const controls = btn.closest('.proof-controls');
        controls.querySelector('.refuse-reason-box').style.display = 'none';
        controls.querySelector('.alert-actions').style.display = 'flex';
      });
    });

    // Confirmer le refus avec motif
    list.querySelectorAll('[data-confirm-refuse]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const proofId = btn.dataset.confirmRefuse;
        const missionId = btn.dataset.missionId;
        const raison = btn.closest('.refuse-reason-box').querySelector('textarea').value.trim();
        btn.closest('.validation-row').style.opacity = '0.5';

        await supabaseClient.from('preuves_livraison').update({
          statut: 'refusee',
          validated_by: currentProfile.id,
          validated_at: new Date().toISOString(),
          raison_refus: raison || null
        }).eq('id', proofId);

        await supabaseClient.from('missions').update({
          statut: 'refused',
          raison_refus: raison || null
        }).eq('id', missionId);

        await loadMissions();
        renderRoadsheet();
        await renderValidations();
        await loadValidatedProofs();
        renderDashboardStats();
        renderProfile();
        renderMissionsValidees();
      });
    });
  }

  // ==========================================================
  // BUREAU DU PATRON — Vue d'ensemble & Équipe
  // ==========================================================
  let allValidatedProofs = [];
  let allRefusedProofs = [];

  async function loadValidatedProofs() {
    const { data } = await supabaseClient
      .from('preuves_livraison')
      .select('*')
      .eq('statut', 'validee');
    allValidatedProofs = data || [];

    // Preuves refusées : utilisées uniquement par l'historique des feuilles de route
    const { data: refusees } = await supabaseClient
      .from('preuves_livraison')
      .select('*')
      .eq('statut', 'refusee');
    allRefusedProofs = refusees || [];
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }
  function isCurrentMonth(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  function groupCount(arr, keyFn) {
    const map = new Map();
    arr.forEach(item => {
      const k = keyFn(item);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }
  function dayLabelFr(date) {
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function renderOfficeOverview() {
    if (!currentProfile || currentProfile.role !== 'patron') return;

    // Livraisons cette semaine (preuves validées dans les 7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = allValidatedProofs.filter(p => new Date(p.validated_at) >= sevenDaysAgo).length;
    const weekEl = document.getElementById('office-stat-livraisons-semaine');
    if (weekEl) weekEl.textContent = String(weekCount);

    // Chiffre d'affaires — 7 derniers jours (somme des crédits par jour, via transactions)
    const chartEl = document.getElementById('office-revenue-chart');
    if (chartEl) {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        days.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      }
      const totals = days.map(d =>
        entrepriseTx()
          .filter(tx => Number(tx.montant) > 0 && isSameDay(new Date(tx.created_at), d))
          .reduce((sum, tx) => sum + Number(tx.montant), 0)
      );
      const max = Math.max(1, ...totals);
      chartEl.innerHTML = days.map((d, i) => {
        const heightPct = Math.round((totals[i] / max) * 100);
        return `<div class="bar-col"><div class="bar" style="height:${Math.max(heightPct, 2)}%;" title="${totals[i].toLocaleString('fr-FR')} €-ETS2"></div><span class="bar-label">${dayLabelFr(d)}</span></div>`;
      }).join('');
    }

    // Objectif mensuel (compte entreprise cumulé / objectif fixe pour l'instant)
    const GOAL = 180000;
    const caisseTotal = entrepriseTx().reduce((sum, tx) => sum + Number(tx.montant), 0);
    const pct = Math.max(0, Math.min(100, Math.round((caisseTotal / GOAL) * 100)));
    const goalBar = document.getElementById('office-goal-bar');
    const goalText = document.getElementById('office-goal-text');
    if (goalBar) goalBar.style.width = pct + '%';
    if (goalText) goalText.innerHTML = `<span style="color:var(--gold); font-weight:700;">${caisseTotal.toLocaleString('fr-FR')}</span> <span style="color:var(--muted);">/ ${GOAL.toLocaleString('fr-FR')} €-ETS2 (${pct}%)</span>`;

    // Livraisons par chauffeur — ce mois-ci
    const driverStatsEl = document.getElementById('office-driver-stats');
    if (driverStatsEl) {
      const monthProofs = allValidatedProofs.filter(p => isCurrentMonth(p.validated_at));
      const counts = groupCount(monthProofs, p => p.chauffeur_id);
      const rows = allProfiles
        .map(p => ({ pseudo: p.pseudo, count: counts.get(p.id) || 0 }))
        .sort((a, b) => b.count - a.count);
      const max = Math.max(1, ...rows.map(r => r.count));
      driverStatsEl.innerHTML = rows.length
        ? rows.map(r => `
            <div class="stat-mini-row">
              <span style="width:90px; font-size:0.85rem;">${r.pseudo}</span>
              <div class="stat-mini-bar-bg"><div class="stat-mini-bar-fill" style="width:${Math.round((r.count / max) * 100)}%;"></div></div>
              <span class="mono" style="font-size:0.8rem;">${r.count}</span>
            </div>`).join('')
        : '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucune livraison validée pour l\'instant.</p>';
    }
  }

  function renderOfficeTeam() {
    const list = document.getElementById('office-members-list');
    if (!list) return;
    const counts = groupCount(allValidatedProofs, p => p.chauffeur_id);
    list.innerHTML = allProfiles.map(p => {
      const roleLabel = p.role === 'patron' ? 'Patron' : 'Employé';
      return `
        <div class="member-row">
          <div class="member-avatar"></div>
          <span style="flex:1; font-size:0.88rem;">${p.pseudo}</span>
          <span class="role-pill">${roleLabel}</span>
          <span class="mono" style="font-weight:600; width:90px; text-align:right;" title="Livraisons validées">${counts.get(p.id) || 0} livr.</span>
          <button class="btn-mini" data-manage-id="${p.id}" style="margin-left:0.6rem;">Gérer</button>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-manage-id]').forEach(btn => {
      btn.addEventListener('click', () => openPlayerSheet(btn.dataset.manageId));
    });
  }

  // ==========================================================
  // FICHE JOUEUR (modal Bureau du patron > Équipe)
  // Distance parcourue, notes/blâmes, historique transactions, rendez-vous
  // ==========================================================
  let allDistanceEntries = [];
  let allPlayerNotes = [];
  let psCurrentPlayerId = null;

  async function loadDistanceEntries() {
    const { data } = await supabaseClient.from('distance_entries').select('*').order('created_at', { ascending: false });
    allDistanceEntries = data || [];
  }

  async function loadPlayerNotes() {
    const { data } = await supabaseClient.from('player_notes').select('*').order('created_at', { ascending: false });
    allPlayerNotes = data || [];
  }

  function totalDistanceOf(playerId) {
    return allDistanceEntries.filter(e => e.player_id === playerId).reduce((sum, e) => sum + Number(e.km), 0);
  }

  async function openPlayerSheet(playerId) {
    psCurrentPlayerId = playerId;
    const player = allProfiles.find(p => p.id === playerId);
    if (!player) return;

    document.getElementById('ps-pseudo').textContent = player.pseudo;
    document.getElementById('ps-role').textContent = player.role === 'patron' ? 'Patron' : 'Chauffeur';
    document.getElementById('player-sheet-overlay').classList.remove('hidden');

    // Recharge les données à chaque ouverture pour être toujours à jour
    await Promise.all([loadDistanceEntries(), loadPlayerNotes()]);

    // Sécurité : on rouvre toujours sur l'onglet Distance, jamais sur
    // "Réinitialiser", et le champ de confirmation est vidé.
    const tabsWrap = document.getElementById('ps-tabs');
    if (tabsWrap) {
      tabsWrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      tabsWrap.querySelector('[data-ps-tab="distance"]')?.classList.add('active');
      document.querySelectorAll('.ps-view').forEach(v => v.classList.remove('active'));
      document.getElementById('ps-view-distance')?.classList.add('active');
    }
    const confirmInput = document.getElementById('ps-reset-confirm-input');
    if (confirmInput) confirmInput.value = '';
    document.querySelectorAll('#ps-reset-options input[type="checkbox"]').forEach(cb => cb.checked = false);
    setStatus('ps-reset-status', '', false);

    renderPlayerSheet();
  }

  function closePlayerSheet() {
    document.getElementById('player-sheet-overlay').classList.add('hidden');
    psCurrentPlayerId = null;
  }

  function renderPlayerSheet() {
    if (!psCurrentPlayerId) return;

    // Distance
    const total = totalDistanceOf(psCurrentPlayerId);
    document.getElementById('ps-distance-total').textContent = total.toLocaleString('fr-FR') + ' km';
    const distList = document.getElementById('ps-distance-list');
    const myDistances = allDistanceEntries.filter(e => e.player_id === psCurrentPlayerId);
    distList.innerHTML = myDistances.length
      ? myDistances.map(e => `
          <div class="ps-entry-row">
            <div style="display:flex; justify-content:space-between;">
              <span class="mono" style="font-weight:600;">${Number(e.km).toLocaleString('fr-FR')} km</span>
              <span class="ps-entry-meta">${timeAgo(e.created_at)}</span>
            </div>
            ${e.note ? `<div class="ps-entry-meta" style="margin-top:3px;">${escapeHtml(e.note)}</div>` : ''}
          </div>`).join('')
      : '<p style="color:var(--muted); font-size:0.85rem;">Aucun kilomètre ajouté pour l\'instant.</p>';

    // Notes & blâmes
    const notesList = document.getElementById('ps-notes-list');
    const myNotes = allPlayerNotes.filter(n => n.player_id === psCurrentPlayerId);
    notesList.innerHTML = myNotes.length
      ? myNotes.map(n => `
          <div class="ps-entry-row ${n.type === 'blame' ? 'ps-blame' : ''}">
            <div><span class="ps-note-type-pill ${n.type}">${n.type === 'blame' ? 'Blâme' : 'Note'}</span>${escapeHtml(n.content)}</div>
            <div class="ps-entry-meta">Par ${pseudoOf(n.created_by)} · ${timeAgo(n.created_at)}</div>
          </div>`).join('')
      : '<p style="color:var(--muted); font-size:0.85rem;">Aucune note pour l\'instant.</p>';

    // Transactions (réutilise allTransactions déjà chargé pour la Trésorerie)
    const txList = document.getElementById('ps-transactions-list');
    const myTx = (allTransactions || []).filter(tx => tx.chauffeur_id === psCurrentPlayerId);
    txList.innerHTML = myTx.length
      ? myTx.map(operationRowHtml).join('')
      : '<p style="color:var(--muted); font-size:0.85rem;">Aucune opération pour l\'instant.</p>';

    // Rendez-vous (réutilise allAppointmentSlots déjà chargé pour le Calendrier)
    const apptList = document.getElementById('ps-appointments-list');
    const myAppts = (allAppointmentSlots || []).filter(s =>
      s.status === 'booked' && (s.created_by === psCurrentPlayerId || s.booked_by === psCurrentPlayerId)
    );
    apptList.innerHTML = myAppts.length
      ? myAppts.map(s => `
          <div class="ps-entry-row">
            <span style="font-weight:600;">${formatSlot(s)}</span>
            ${s.motif ? `<div class="ps-entry-meta" style="margin-top:3px;">${escapeHtml(s.motif)}</div>` : ''}
          </div>`).join('')
      : '<p style="color:var(--muted); font-size:0.85rem;">Aucun rendez-vous pour l\'instant.</p>';

    // Onglet Réinitialiser : compteurs par catégorie
    renderResetOptions();
  }

  const psCloseBtn = document.getElementById('ps-close-btn');
  if (psCloseBtn) psCloseBtn.addEventListener('click', closePlayerSheet);

  const psOverlay = document.getElementById('player-sheet-overlay');
  if (psOverlay) {
    psOverlay.addEventListener('click', (e) => { if (e.target === psOverlay) closePlayerSheet(); });
  }

  const psTabs = document.getElementById('ps-tabs');
  if (psTabs) {
    psTabs.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        psTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.ps-view').forEach(v => v.classList.remove('active'));
        document.getElementById('ps-view-' + btn.dataset.psTab).classList.add('active');
      });
    });
  }

  // ==========================================================
  // FICHE JOUEUR — onglet "Réinitialiser"
  // ==========================================================
  // Chaque catégorie est indépendante : le patron coche uniquement ce qu'il
  // veut effacer. `compte` sert à afficher le nombre d'éléments concernés,
  // `executer` fait la suppression réelle. Le compte du joueur (profils,
  // pseudo, rôle, mot de passe) n'est jamais touché.
  //
  // ⚠️ Important : quand une policy RLS interdit un DELETE, Supabase ne renvoie
  // AUCUNE erreur — il supprime simplement 0 ligne. On ajoute donc `.select()`
  // à chaque suppression pour récupérer les lignes réellement effacées et
  // pouvoir alerter le patron si rien n'a bougé (script 23-policies-suppression.sql).
  async function psSupprimer(requete) {
    const { data, error } = await requete.select();
    return { error, n: (data || []).length };
  }

  const PS_RESET_CATEGORIES = [
    {
      cle: 'distance',
      label: 'Kilomètres parcourus',
      desc: 'Efface toutes les lignes de distance saisies dans l\'onglet Distance. Le total repasse à 0 km.',
      compte: (id) => allDistanceEntries.filter(e => e.player_id === id).length,
      executer: async (id) =>
        psSupprimer(supabaseClient.from('distance_entries').delete().eq('player_id', id))
    },
    {
      cle: 'missions-cours',
      label: 'Feuilles de route en cours',
      desc: 'Efface les missions encore actives : proposées, en cours et à vérifier. Les preuves déjà soumises mais pas encore validées partent avec elles. Ne touche pas à l\'historique.',
      compte: (id) => allMissions.filter(m => m.assigned_to === id && ['proposed', 'progress', 'checking'].includes(m.statut)).length,
      executer: async (id) => {
        const ids = allMissions
          .filter(m => m.assigned_to === id && ['proposed', 'progress', 'checking'].includes(m.statut))
          .map(m => m.id);
        if (!ids.length) return { error: null, n: 0 };
        const p = await psSupprimer(supabaseClient.from('preuves_livraison').delete().in('mission_id', ids));
        if (p.error) return p;
        return psSupprimer(supabaseClient.from('missions').delete().in('id', ids));
      }
    },
    {
      cle: 'missions-historique',
      label: 'Historique des feuilles de route',
      desc: 'Efface les feuilles terminées : validées et refusées, avec leurs preuves de livraison. Remet à zéro son nombre de livraisons et ses trophées. Les revenus de ces missions crédités au compte entreprise sont retirés avec elles.',
      compte: (id) => allMissions.filter(m => m.assigned_to === id && ['done', 'refused'].includes(m.statut)).length,
      executer: async (id) => {
        const ids = allMissions
          .filter(m => m.assigned_to === id && ['done', 'refused'].includes(m.statut))
          .map(m => m.id);
        if (!ids.length) return { error: null, n: 0 };
        // 1. Revenus de mission crédités au compte entreprise
        const t = await psSupprimer(supabaseClient.from('transactions').delete().in('mission_id', ids));
        if (t.error) return t;
        // 2. Preuves de livraison (avant les missions : elles y font référence)
        const p = await psSupprimer(supabaseClient.from('preuves_livraison').delete().in('mission_id', ids));
        if (p.error) return p;
        // 3. Missions elles-mêmes
        return psSupprimer(supabaseClient.from('missions').delete().in('id', ids));
      }
    },
    {
      cle: 'argent',
      label: 'Argent — solde et opérations',
      desc: 'Efface les paies, remboursements et primes du joueur. Les écritures miroir du compte entreprise sont retirées en même temps, pour que la caisse de l\'entreprise reste cohérente. Son solde personnel repasse à 0 €.',
      compte: (id) => (allTransactions || []).filter(tx => tx.chauffeur_id === id).length,
      executer: async (id) => {
        const mesOps = (allTransactions || []).filter(tx => tx.chauffeur_id === id);
        const refs = [...new Set(mesOps.map(tx => tx.operation_ref).filter(Boolean))];
        // Écritures miroir côté compte entreprise (même operation_ref, sans chauffeur_id)
        if (refs.length) {
          const m = await psSupprimer(supabaseClient
            .from('transactions').delete().in('operation_ref', refs).is('chauffeur_id', null));
          if (m.error) return m;
        }
        return psSupprimer(supabaseClient.from('transactions').delete().eq('chauffeur_id', id));
      }
    },
    {
      cle: 'notes',
      label: 'Notes & blâmes',
      desc: 'Efface toutes les notes et tous les blâmes enregistrés sur ce joueur.',
      compte: (id) => allPlayerNotes.filter(n => n.player_id === id).length,
      executer: async (id) =>
        psSupprimer(supabaseClient.from('player_notes').delete().eq('player_id', id))
    },
    {
      cle: 'rendezvous',
      label: 'Rendez-vous & créneaux',
      desc: 'Efface les créneaux qu\'il a proposés et ceux qu\'il a réservés.',
      compte: (id) => (allAppointmentSlots || []).filter(s => s.created_by === id || s.booked_by === id).length,
      executer: async (id) => {
        const a = await psSupprimer(supabaseClient.from('appointment_slots').delete().eq('created_by', id));
        if (a.error) return a;
        const b = await psSupprimer(supabaseClient.from('appointment_slots').delete().eq('booked_by', id));
        return { error: b.error, n: a.n + b.n };
      }
    },
    {
      cle: 'calendrier',
      label: 'Événements du calendrier',
      desc: 'Efface les congés, réunions et rappels créés par ce joueur.',
      compte: (id) => (allCalendarEvents || []).filter(e => e.created_by === id).length,
      executer: async (id) =>
        psSupprimer(supabaseClient.from('calendar_events').delete().eq('created_by', id))
    },
    {
      cle: 'mails',
      label: 'Messagerie',
      desc: 'Efface les mails qu\'il a envoyés et ceux qu\'il a reçus.',
      compte: (id) => (allMails || []).filter(m => m.sender_id === id || m.recipient_id === id).length,
      executer: async (id) => {
        const a = await psSupprimer(supabaseClient.from('mails').delete().eq('sender_id', id));
        if (a.error) return a;
        const b = await psSupprimer(supabaseClient.from('mails').delete().eq('recipient_id', id));
        return { error: b.error, n: a.n + b.n };
      }
    },
    {
      cle: 'flotte',
      label: 'Fiche flotte (camion, permis, DLC, remorques)',
      desc: 'Vide le camion actuel, le permis, les remorques et les DLC débloqués. Attention : les menus Départ / Arrivée de ses futures missions n\'afficheront plus aucune ville tant qu\'il n\'aura pas recoché ses DLC.',
      compte: (id) => (allDriverProfiles || []).some(d => d.id === id) ? 1 : 0,
      executer: async (id) => {
        const { data, error } = await supabaseClient.from('driver_profiles').upsert({
          id: id, camion_actuel: null, permis: null, remorques: null,
          dlc_debloquees: null, updated_at: new Date().toISOString()
        }).select();
        return { error, n: (data || []).length };
      }
    },
    {
      cle: 'photo',
      label: 'Photo de profil',
      desc: 'Retire la photo importée. L\'avatar revient aux initiales du pseudo.',
      compte: (id) => {
        const p = allProfiles.find(x => x.id === id);
        return (p && p.avatar_url) ? 1 : 0;
      },
      executer: async (id) => {
        const { data, error } = await supabaseClient.from('profiles').update({ avatar_url: null }).eq('id', id).select();
        return { error, n: (data || []).length };
      }
    }
  ];

  function renderResetOptions() {
    const wrap = document.getElementById('ps-reset-options');
    if (!wrap || !psCurrentPlayerId) return;
    const coches = new Set(
      [...wrap.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.dataset.resetKey)
    );
    wrap.innerHTML = PS_RESET_CATEGORIES.map(cat => {
      let n = 0;
      try { n = cat.compte(psCurrentPlayerId); } catch (e) { n = 0; }
      const vide = n === 0;
      return `
        <label class="ps-reset-item" style="${vide ? 'opacity:0.45;' : ''}">
          <input type="checkbox" data-reset-key="${cat.cle}" ${coches.has(cat.cle) ? 'checked' : ''} ${vide ? 'disabled' : ''}>
          <div style="flex:1; min-width:0;">
            <div class="ps-reset-label">${cat.label}<span class="ps-reset-count">${vide ? 'rien à effacer' : n + (n > 1 ? ' éléments' : ' élément')}</span></div>
            <div class="ps-reset-desc">${cat.desc}</div>
          </div>
        </label>`;
    }).join('');
  }

  document.getElementById('ps-reset-all-btn')?.addEventListener('click', () => {
    document.querySelectorAll('#ps-reset-options input[type="checkbox"]:not(:disabled)').forEach(cb => cb.checked = true);
  });
  document.getElementById('ps-reset-none-btn')?.addEventListener('click', () => {
    document.querySelectorAll('#ps-reset-options input[type="checkbox"]').forEach(cb => cb.checked = false);
  });

  const psResetRunBtn = document.getElementById('ps-reset-run-btn');
  if (psResetRunBtn) {
    psResetRunBtn.addEventListener('click', async () => {
      if (!psCurrentPlayerId) return;
      const choisies = [...document.querySelectorAll('#ps-reset-options input[type="checkbox"]:checked')]
        .map(cb => PS_RESET_CATEGORIES.find(c => c.cle === cb.dataset.resetKey))
        .filter(Boolean);

      if (!choisies.length) {
        setStatus('ps-reset-status', 'Coche au moins une catégorie à réinitialiser.', true);
        return;
      }
      const saisie = (document.getElementById('ps-reset-confirm-input').value || '').trim().toUpperCase();
      if (saisie !== 'REINITIALISER') {
        setStatus('ps-reset-status', 'Tape REINITIALISER dans le champ pour confirmer.', true);
        return;
      }
      const pseudo = pseudoOf(psCurrentPlayerId);
      const liste = choisies.map(c => '· ' + c.label).join('\n');
      if (!confirm(`Réinitialiser définitivement pour ${pseudo} :\n\n${liste}\n\nCette suppression est irréversible. Continuer ?`)) return;

      psResetRunBtn.disabled = true; psResetRunBtn.textContent = 'Réinitialisation...';
      const echecs = [];
      const bloquees = [];
      for (const cat of choisies) {
        const attendu = cat.compte(psCurrentPlayerId);
        const res = await cat.executer(psCurrentPlayerId);
        if (res && res.error) {
          echecs.push(`${cat.label} : ${res.error.message}`);
        } else if (attendu > 0 && res && res.n === 0) {
          // Aucune erreur mais 0 ligne touchée = une policy RLS bloque la suppression
          bloquees.push(cat.label);
        }
      }
      psResetRunBtn.disabled = false; psResetRunBtn.textContent = 'Réinitialiser la sélection';
      document.getElementById('ps-reset-confirm-input').value = '';

      // Recharge tout ce qui a pu bouger, puis rafraîchit l'écran
      const { data: profilsFrais } = await supabaseClient.from('profiles').select('*').order('pseudo');
      allProfiles = profilsFrais || allProfiles;
      if (currentProfile && currentProfile.id === psCurrentPlayerId) {
        const maj = allProfiles.find(p => p.id === currentProfile.id);
        if (maj) currentProfile = maj;
      }
      await Promise.all([
        loadDistanceEntries(), loadPlayerNotes(), loadMissions(),
        loadTransactions(), loadDriverProfiles(), loadMails(),
        loadCalendarEvents(), loadAppointmentSlots()
      ]);
      await loadValidatedProofs();
      renderPlayerSheet();
      renderOfficeTeam();
      renderMemberPills();
      renderDriverProfiles();
      renderTransactions();
      renderOfficeOverview();
      renderRoadsheet();
      renderMissionsValidees();
      renderDashboardStats();
      renderDashboardMails();
      if (currentProfile.id === psCurrentPlayerId) renderProfile();

      if (echecs.length) {
        setStatus('ps-reset-status', 'Terminé avec des erreurs — ' + echecs.join(' | '), true);
      } else if (bloquees.length) {
        setStatus('ps-reset-status',
          'Rien n\'a été supprimé pour : ' + bloquees.join(', ') +
          '. La base a refusé la suppression sans message d\'erreur — il manque les droits de suppression. ' +
          'Exécute le script 23-policies-suppression.sql dans Supabase, puis réessaie.', true);
      } else {
        setStatus('ps-reset-status', `Réinitialisation effectuée pour ${pseudo} (${choisies.length} catégorie${choisies.length > 1 ? 's' : ''}).`, false);
      }
    });
  }

  const psDistanceAddBtn = document.getElementById('ps-distance-add-btn');
  if (psDistanceAddBtn) {
    psDistanceAddBtn.addEventListener('click', async () => {
      const kmRaw = document.getElementById('ps-distance-km').value;
      const note = document.getElementById('ps-distance-note').value.trim();
      if (kmRaw === '' || isNaN(Number(kmRaw)) || Number(kmRaw) <= 0) {
        setStatus('ps-distance-status', 'Indique un nombre de km positif.', true);
        return;
      }
      psDistanceAddBtn.disabled = true; psDistanceAddBtn.textContent = '...';
      const { error } = await supabaseClient.from('distance_entries').insert({
        player_id: psCurrentPlayerId,
        km: Number(kmRaw),
        note: note || null,
        added_by: currentProfile.id
      });
      psDistanceAddBtn.disabled = false; psDistanceAddBtn.textContent = 'Ajouter';
      if (error) { setStatus('ps-distance-status', 'Erreur : ' + error.message, true); return; }
      setStatus('ps-distance-status', 'Kilomètres ajoutés !', false);
      document.getElementById('ps-distance-km').value = '';
      document.getElementById('ps-distance-note').value = '';
      await loadDistanceEntries();
      renderPlayerSheet();
      if (currentProfile.id === psCurrentPlayerId) renderProfile();
    });
  }

  const psNoteAddBtn = document.getElementById('ps-note-add-btn');
  if (psNoteAddBtn) {
    psNoteAddBtn.addEventListener('click', async () => {
      const type = document.getElementById('ps-note-type').value;
      const content = document.getElementById('ps-note-content').value.trim();
      if (!content) { setStatus('ps-note-status', 'Écris un contenu.', true); return; }
      psNoteAddBtn.disabled = true; psNoteAddBtn.textContent = '...';
      const { error } = await supabaseClient.from('player_notes').insert({
        player_id: psCurrentPlayerId,
        type,
        content,
        created_by: currentProfile.id
      });
      psNoteAddBtn.disabled = false; psNoteAddBtn.textContent = 'Ajouter';
      if (error) { setStatus('ps-note-status', 'Erreur : ' + error.message, true); return; }
      setStatus('ps-note-status', type === 'blame' ? 'Blâme ajouté.' : 'Note ajoutée.', false);
      document.getElementById('ps-note-content').value = '';
      await loadPlayerNotes();
      renderPlayerSheet();
    });
  }

  // ==========================================================
  // SUIVI DES CHAUFFEURS — fiches détaillées (patron uniquement)
  // ==========================================================
  let allDriverProfiles = [];

  async function loadDriverProfiles() {
    const { data } = await supabaseClient.from('driver_profiles').select('*');
    allDriverProfiles = data || [];
  }

  function driverProfileOf(chauffeurId) {
    return allDriverProfiles.find(d => d.id === chauffeurId) || null;
  }

  function formatMonthYearFr(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  function csvToTags(csv, options = {}) {
    const items = (csv || '').split(',').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return `<span class="tag locked">Non renseigné</span>`;
    return items.map(i => `<span class="tag${options.truck ? ' truck' : ''}">${options.truck ? '🚚 ' : ''}${i}</span>`).join('');
  }

  function dlcTagsHtml(csv) {
    const unlocked = (csv || '').split(',').map(s => s.trim()).filter(Boolean);
    return DLC_LIST.map(d => `<span class="tag${unlocked.includes(d) ? '' : ' locked'}">${d}</span>`).join('');
  }

  function renderDriverProfiles() {
    const grid = document.getElementById('driver-grid');
    if (!grid) return;
    const chauffeurs = allProfiles.filter(p => p.role === 'chauffeur');

    if (chauffeurs.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">Aucun chauffeur inscrit pour l\'instant.</p>';
      return;
    }

    grid.innerHTML = chauffeurs.map(p => {
      const dp = driverProfileOf(p.id);
      const since = formatMonthYearFr(p.created_at);
      return `
        <div class="card driver-card" data-driver-id="${p.id}">
          <div class="driver-view">
            <div class="driver-head">
              <div class="member-avatar" style="width:36px; height:36px;"></div>
              <div>
                <div class="driver-name">${p.pseudo}</div>
                <div class="driver-sub">${since ? `Chez ${siteNom} depuis ${since}` : ''}</div>
              </div>
              <button class="driver-edit" data-driver-edit="${p.id}">Modifier</button>
            </div>
            <div class="driver-section">
              <div class="driver-label">Camion actuel</div>
              <div class="tag-set">${csvToTags(dp?.camion_actuel, { truck: true })}</div>
            </div>
            <div class="driver-section">
              <div class="driver-label">Permis / licences</div>
              <div class="tag-set">${csvToTags(dp?.permis)}</div>
            </div>
            <div class="driver-section">
              <div class="driver-label">Pays débloqués (DLC)</div>
              <div class="tag-set">${dlcTagsHtml(dp?.dlc_debloquees)}</div>
            </div>
            <div class="driver-section">
              <div class="driver-label">Remorques disponibles</div>
              <div class="tag-set">${csvToTags(dp?.remorques)}</div>
            </div>
          </div>
          <div class="driver-edit-form" style="display:none;">
            <div class="field"><label class="eyebrow">Camion actuel</label><input type="text" class="input-real de-camion" value="${dp?.camion_actuel || ''}" placeholder="Ex : Scania S 730" /></div>
            <div class="field"><label class="eyebrow">Permis / licences (séparés par des virgules)</label><input type="text" class="input-real de-permis" value="${dp?.permis || ''}" placeholder="Permis C, ADR, Transport frigorifique" /></div>
            <div class="field"><label class="eyebrow">Remorques disponibles (séparées par des virgules)</label><input type="text" class="input-real de-remorques" value="${dp?.remorques || ''}" placeholder="Bâchée standard, Frigorifique" /></div>
            <div class="field">
              <label class="eyebrow" style="display:block; margin-bottom:6px;">Pays débloqués (DLC)</label>
              <div class="tag-set">
                ${DLC_LIST.map(d => {
                  const checked = (dp?.dlc_debloquees || '').split(',').map(s => s.trim()).includes(d);
                  return `<label class="tag" style="cursor:pointer;"><input type="checkbox" class="de-dlc" value="${d}" ${checked ? 'checked' : ''} style="margin-right:5px;" />${d}</label>`;
                }).join('')}
              </div>
            </div>
            <div style="display:flex; gap:0.6rem; margin-top:0.5rem;">
              <button class="btn-gold de-save" style="flex:1;">Enregistrer</button>
              <button class="btn-mini de-cancel">Annuler</button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Bascule vue / édition
    grid.querySelectorAll('[data-driver-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.driver-card');
        card.querySelector('.driver-view').style.display = 'none';
        card.querySelector('.driver-edit-form').style.display = 'block';
      });
    });
    grid.querySelectorAll('.de-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.driver-card');
        card.querySelector('.driver-edit-form').style.display = 'none';
        card.querySelector('.driver-view').style.display = 'block';
      });
    });
    grid.querySelectorAll('.de-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.driver-card');
        const driverId = card.dataset.driverId;
        const camion = card.querySelector('.de-camion').value.trim();
        const permis = card.querySelector('.de-permis').value.trim();
        const remorques = card.querySelector('.de-remorques').value.trim();
        const dlcChecked = [...card.querySelectorAll('.de-dlc:checked')].map(cb => cb.value).join(', ');

        btn.disabled = true; btn.textContent = 'Enregistrement...';
        const { error } = await supabaseClient.from('driver_profiles').upsert({
          id: driverId,
          camion_actuel: camion || null,
          permis: permis || null,
          remorques: remorques || null,
          dlc_debloquees: dlcChecked || null,
          updated_at: new Date().toISOString()
        });
        btn.disabled = false; btn.textContent = 'Enregistrer';

        if (error) { alert('Erreur : ' + error.message); return; }
        await loadDriverProfiles();
        renderDriverProfiles();
        updateMissionCityOptions();
      });
    });
  }
