  async function loadMissions() {
    const { data } = await supabaseClient.from('missions').select('*').order('created_at', { ascending: false });
    allMissions = data || [];
  }

  // ---------- Historique feuilles de route (validées + refusées, 5 dernières) ----------
  const HISTORIQUE_MAX = 5;

  function renderMissionsValidees() {
    const list = document.getElementById('missions-validees-list');
    if (!list || !currentProfile) return;

    const isPatron = currentProfile.role === 'patron';

    // Une preuve par mission (la plus récente) : validée ou refusée
    const proofByMission = new Map();
    [...allValidatedProofs, ...allRefusedProofs].forEach(p => {
      const prev = proofByMission.get(p.mission_id);
      const dateP = new Date(p.validated_at || p.submitted_at || 0);
      if (!prev || dateP > new Date(prev.validated_at || prev.submitted_at || 0)) proofByMission.set(p.mission_id, p);
    });

    // Toutes les feuilles terminées : validées (done) ou refusées (refused)
    const entries = allMissions
      .filter(m => m.statut === 'done' || m.statut === 'refused')
      .filter(m => isPatron || m.assigned_to === currentProfile.id)
      .map(m => {
        const proof = proofByMission.get(m.id) || null;
        const date = (proof && (proof.validated_at || proof.submitted_at)) || m.created_at;
        return { mission: m, proof, date, refusee: m.statut === 'refused' };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (entries.length === 0) {
      list.innerHTML = '<p style="padding:1.5rem 1.4rem; color:var(--muted); font-size:0.85rem;">Aucune feuille de route terminée pour l\'instant.</p>';
      return;
    }

    const shown = entries.slice(0, HISTORIQUE_MAX);

    const rowsHtml = shown.map(e => {
      const m = e.mission;
      const p = e.proof;
      const titre = `${m.titre} — ${m.ville_depart} → ${m.ville_arrivee}`;
      const qui = isPatron ? `${pseudoOf(m.assigned_to)} · ` : '';

      if (e.refusee) {
        const motif = (p && p.raison_refus) || m.raison_refus;
        const detail = p
          ? `Preuve refusée${motif ? ' — ' + motif : ' (aucun motif indiqué)'}`
          : 'Mission déclinée par le chauffeur';
        return `
        <div class="task-row" style="border-left: 2px solid var(--burgundy);">
          <div class="task-check" style="border-color: var(--burgundy); color: var(--burgundy);">✕</div>
          <div style="flex:1;">
            <div class="task-title">${titre}</div>
            <div class="route-line"><span class="end"></span><span class="dash"></span><span class="end dest"></span><span class="route-cities">${qui}${detail} · ${timeAgo(e.date)}</span></div>
            ${m.commentaire ? `<div class="mission-comment">💬 ${escapeHtml(m.commentaire)}</div>` : ''}
          </div>
          <span class="status-pill refused">Refusée</span>
        </div>`;
      }

      const lienHtml = p && p.lien_trucksbook
        ? `<a href="${p.lien_trucksbook}" target="_blank" rel="noopener" class="proof-link" style="margin-top:0;">Voir sur TrucksBook ↗</a>`
        : '';
      const fraisCarburant = Number(p && p.frais_carburant) || 0;
      const fraisPeages = Number(p && p.frais_peages) || 0;
      const fraisHtml = (fraisCarburant > 0 || fraisPeages > 0)
        ? `<div style="color:var(--muted); font-size:0.76rem; margin-top:2px;">⛽ ${fraisCarburant.toFixed(2)} € · 🛣️ ${fraisPeages.toFixed(2)} €</div>`
        : '';
      return `
        <div class="task-row" style="border-left: 2px solid var(--good);">
          <div class="task-check done">✓</div>
          <div style="flex:1;">
            <div class="task-title">${titre}</div>
            <div class="route-line"><span class="end"></span><span class="dash"></span><span class="end dest"></span><span class="route-cities">${qui}Validée ${timeAgo(e.date)}</span></div>
            ${fraisHtml}
            ${m.commentaire ? `<div class="mission-comment">💬 ${escapeHtml(m.commentaire)}</div>` : ''}
          </div>
          ${lienHtml}
        </div>`;
    }).join('');

    const footerHtml = entries.length > HISTORIQUE_MAX
      ? `<p style="padding:0.9rem 1.4rem; color:var(--muted); font-size:0.78rem; border-top:1px solid var(--border);">
           Les ${HISTORIQUE_MAX} dernières feuilles terminées sur ${entries.length} au total.
         </p>`
      : '';

    list.innerHTML = rowsHtml + footerHtml;

    // Zone "Réinitialiser l'historique" : réservée au patron
    const resetCard = document.getElementById('historique-reset-card');
    if (resetCard) {
      resetCard.style.display = isPatron ? '' : 'none';
      if (isPatron) {
        // Sélecteur : toute l'équipe, ou un membre précis (avec son nombre de feuilles)
        const scope = document.getElementById('historique-reset-scope');
        const choixActuel = scope.value;
        const parMembre = allProfiles.map(p => ({
          id: p.id,
          pseudo: p.pseudo,
          n: allMissions.filter(m => m.assigned_to === p.id && (m.statut === 'done' || m.statut === 'refused')).length
        }));
        scope.innerHTML =
          `<option value="all">Toute l'équipe (${entries.length})</option>` +
          parMembre.map(p => `<option value="${p.id}">${escapeHtml(p.pseudo)} (${p.n})</option>`).join('');
        if ([...scope.options].some(o => o.value === choixActuel)) scope.value = choixActuel;
      }
    }
  }

  // ---------- Réinitialisation de l'historique (page Historique, patron) ----------
  const historiqueResetBtn = document.getElementById('historique-reset-btn');
  if (historiqueResetBtn) {
    historiqueResetBtn.addEventListener('click', async () => {
      if (!currentProfile || currentProfile.role !== 'patron') return;
      const scope = document.getElementById('historique-reset-scope').value;

      // Missions terminées concernées par la portée choisie
      const ciblees = allMissions.filter(m =>
        (m.statut === 'done' || m.statut === 'refused') &&
        (scope === 'all' || m.assigned_to === scope)
      );
      const ids = ciblees.map(m => m.id);
      const quoi = scope === 'all' ? "toute l'équipe" : pseudoOf(scope);

      if (!ids.length) {
        setStatus('historique-reset-status', `Aucune feuille terminée à effacer pour ${quoi}.`, true);
        return;
      }
      if (!confirm(
        `Effacer définitivement ${ids.length} feuille${ids.length > 1 ? 's' : ''} terminée${ids.length > 1 ? 's' : ''} pour ${quoi} ?\n\n` +
        `Les preuves de livraison et les revenus de mission crédités au compte entreprise partent avec.\n` +
        `Les feuilles en cours ne sont pas touchées.\n\nCette suppression est irréversible.`
      )) return;

      historiqueResetBtn.disabled = true; historiqueResetBtn.textContent = 'Suppression...';

      // Même ordre que dans la fiche joueur : revenus, puis preuves, puis missions
      const t = await psSupprimer(supabaseClient.from('transactions').delete().in('mission_id', ids));
      const p = t.error ? { error: t.error, n: 0 }
                        : await psSupprimer(supabaseClient.from('preuves_livraison').delete().in('mission_id', ids));
      const m = (t.error || p.error) ? { error: t.error || p.error, n: 0 }
                                     : await psSupprimer(supabaseClient.from('missions').delete().in('id', ids));

      historiqueResetBtn.disabled = false; historiqueResetBtn.textContent = 'Effacer l\'historique';

      const erreur = t.error || p.error || m.error;
      if (erreur) {
        setStatus('historique-reset-status', 'Erreur : ' + erreur.message, true);
        return;
      }

      // Rechargement + rafraîchissement des écrans concernés
      await Promise.all([loadMissions(), loadTransactions()]);
      await loadValidatedProofs();
      renderMissionsValidees();
      renderRoadsheet();
      renderTransactions();
      renderOfficeOverview();
      renderDashboardStats();
      renderProfile();

      if (m.n === 0) {
        // Aucune erreur mais rien de supprimé = policy RLS manquante (voir 23-policies-suppression.sql)
        setStatus('historique-reset-status',
          'Rien n\'a été supprimé : la base a refusé la suppression sans message d\'erreur. ' +
          'Exécute le script 23-policies-suppression.sql dans Supabase, puis réessaie.', true);
      } else {
        setStatus('historique-reset-status',
          `Historique effacé pour ${quoi} — ${m.n} feuille${m.n > 1 ? 's' : ''} supprimée${m.n > 1 ? 's' : ''}.`, false);
      }
    });
  }

  // ---------- Dashboard : compteurs "Mes feuilles de route" ----------
  function renderDashboardStats() {
    if (!currentProfile) return;
    const mine = allMissions.filter(m => m.assigned_to === currentProfile.id);

    const progressEl = document.getElementById('dash-stat-progress');
    if (progressEl) progressEl.textContent = String(mine.filter(m => m.statut === 'progress').length);

    const checkingEl = document.getElementById('dash-stat-checking');
    if (checkingEl) checkingEl.textContent = String(mine.filter(m => m.statut === 'checking').length);

    const doneMonthEl = document.getElementById('dash-stat-done-month');
    if (doneMonthEl) {
      const doneThisMonth = allValidatedProofs.filter(p => p.chauffeur_id === currentProfile.id && isCurrentMonth(p.validated_at)).length;
      doneMonthEl.textContent = String(doneThisMonth);
    }
  }

  // ---------- Feuille de route (mes missions) ----------
  function renderRoadsheet() {
    const list = document.getElementById('roadsheet-list');
    const select = document.getElementById('proof-mission-select');
    if (!list || !currentProfile) return;

    const mine = allMissions.filter(m => m.assigned_to === currentProfile.id);

    // Sélecteur de mission pour la soumission de preuve (missions en cours uniquement)
    if (select) {
      select.innerHTML = '<option value="">— Choisis une mission en cours —</option>';
      mine.filter(m => m.statut === 'progress').forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.titre} — ${m.ville_depart} → ${m.ville_arrivee}`;
        select.appendChild(opt);
      });
    }

    if (mine.length === 0) {
      list.innerHTML = '<p style="padding:1.5rem 1.4rem; color:var(--muted); font-size:0.85rem;">Aucune mission pour l\'instant.</p>';
      // met aussi à jour le badge de la sidebar
      const badge = document.querySelector('.sidenav [data-view="roadsheet"] .alert-count');
      if (badge) badge.textContent = '0';
      return;
    }

    list.innerHTML = mine.map(m => {
      const borderColor = m.statut === 'checking' ? '#7fb8e0' : (m.statut === 'proposed' ? 'var(--gold)' : (m.statut === 'refused' ? 'var(--burgundy)' : 'transparent'));
      let rightPart;
      if (m.statut === 'proposed') {
        rightPart = `<div class="task-actions">
            <button class="btn-mini accept" data-mission-action="accept" data-mission-id="${m.id}">Accepter</button>
            <button class="btn-mini decline" data-mission-action="decline" data-mission-id="${m.id}">Refuser</button>
          </div>`;
      } else {
        rightPart = `<span class="status-pill ${m.statut}">${STATUS_LABEL[m.statut] || m.statut}</span>`;
      }
      const subLine = m.statut === 'proposed'
        ? `proposée par ${pseudoOf(m.created_by)} · ${timeAgo(m.created_at)}`
        : (m.statut === 'done' ? `validée par ${pseudoOf(m.created_by)}`
        : (m.statut === 'refused' ? `Preuve refusée${m.raison_refus ? ' — ' + m.raison_refus : ' (aucun motif indiqué)'}`
        : `assignée le ${timeAgo(m.created_at)}`));
      return `
        <div class="task-row" data-status="${m.statut}" style="border-left: 2px solid ${borderColor};">
          <div class="task-check ${m.statut === 'done' ? 'done' : ''}">${m.statut === 'done' ? '✓' : '&nbsp;'}</div>
          <div style="flex:1;">
            <div class="task-title">${m.titre} — ${m.ville_depart} → ${m.ville_arrivee}</div>
            <div class="route-line"><span class="end"></span><span class="dash"></span><span class="end dest"></span><span class="route-cities">${subLine}</span></div>
            ${m.commentaire ? `<div class="mission-comment">💬 ${escapeHtml(m.commentaire)}</div>` : ''}
          </div>
          <span class="task-deadline">${formatDate(m.echeance)}</span>
          ${rightPart}
        </div>`;
    }).join('');

    // Badge sidebar = missions "proposed" qui attendent une réponse
    const badge = document.querySelector('.sidenav [data-view="roadsheet"] .alert-count');
    if (badge) badge.textContent = String(mine.filter(m => m.statut === 'proposed').length);

    // Boutons accepter/refuser
    list.querySelectorAll('[data-mission-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.missionId;
        const newStatut = btn.dataset.missionAction === 'accept' ? 'progress' : 'refused';
        btn.closest('.task-row').style.opacity = '0.5';
        await supabaseClient.from('missions').update({ statut: newStatut }).eq('id', id);
        await loadMissions();
        renderRoadsheet();
      });
    });
  }

  // Envoi d'une preuve de livraison
  const proofSubmitBtn = document.getElementById('proof-submit-btn');
  if (proofSubmitBtn) {
    proofSubmitBtn.addEventListener('click', async () => {
      const missionId = document.getElementById('proof-mission-select').value;
      const lien = document.getElementById('proof-link').value.trim();
      const revenuDeclare = parseFloat(document.getElementById('proof-revenu').value) || 0;
      const fraisCarburant = parseFloat(document.getElementById('proof-frais-carburant').value) || 0;
      const fraisPeages = parseFloat(document.getElementById('proof-frais-peages').value) || 0;
      if (!missionId) { setStatus('proof-submit-status', 'Choisis d\'abord la mission concernée.', true); return; }
      if (!lien) { setStatus('proof-submit-status', 'Colle le lien TrucksBook de la mission.', true); return; }

      proofSubmitBtn.disabled = true; proofSubmitBtn.textContent = 'Envoi...';
      const { error } = await supabaseClient.from('preuves_livraison').insert({
        mission_id: missionId,
        chauffeur_id: currentProfile.id,
        lien_trucksbook: lien,
        revenu_declare: revenuDeclare,
        frais_carburant: fraisCarburant,
        frais_peages: fraisPeages
      });
      if (!error) {
        await supabaseClient.from('missions').update({ statut: 'checking', raison_refus: null }).eq('id', missionId);
      }
      proofSubmitBtn.disabled = false; proofSubmitBtn.textContent = 'Envoyer pour validation';

      if (error) {
        setStatus('proof-submit-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('proof-submit-status', 'Preuve envoyée ! Le patron va la vérifier.', false);
      document.getElementById('proof-link').value = '';
      document.getElementById('proof-revenu').value = '';
      document.getElementById('proof-frais-carburant').value = '';
      document.getElementById('proof-frais-peages').value = '';
      await loadMissions();
      renderRoadsheet();
    });
  }
