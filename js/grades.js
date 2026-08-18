  // ==========================================================
  // GRADES — titre attribué automatiquement selon le nombre de
  // livraisons validées (toutes périodes confondues)
  // ----------------------------------------------------------
  // Échelle entièrement gérée depuis Réglages > Grades (table Supabase
  // `grades`, script 25-grades.sql) : le patron ajoute/renomme/supprime des
  // grades librement, chacun défini par un seuil de livraisons validées.
  // Un membre porte le grade le plus élevé qu'il a atteint (aucune valeur
  // codée en dur : deux grades de départ — « Période d'essai » et
  // « Intérimaire » — sont simplement insérés par le script SQL comme les
  // premiers échelons, au même titre que les autres).
  // ==========================================================
  let allGrades = [];   // triés par seuil croissant

  async function loadGrades() {
    const { data, error } = await supabaseClient.from('grades').select('*').order('seuil', { ascending: true });
    allGrades = error ? [] : (data || []);
  }

  // Livraisons validées cumulées d'un joueur, toutes périodes confondues
  // (le classement, lui, ne regarde que le mois en cours).
  function totalLivraisonsOf(playerId) {
    return allValidatedProofs.filter(p => p.chauffeur_id === playerId).length;
  }

  function gradeOf(playerId) {
    if (!allGrades.length) return null;
    const total = totalLivraisonsOf(playerId);
    let courant = null;
    for (const g of allGrades) {
      if (total >= g.seuil) courant = g;
      else break;
    }
    return courant;
  }

  function gradePillHtml(playerId) {
    const g = gradeOf(playerId);
    return g ? `<span class="grade-pill">🎖️ ${escapeHtml(g.nom)}</span>` : '';
  }

  // Grade du joueur connecté, affiché sur "Mon profil"
  function renderProfileGrade() {
    const el = document.getElementById('profile-grade-pill');
    if (!el || !currentProfile) return;
    const g = gradeOf(currentProfile.id);
    if (g) {
      el.textContent = '🎖️ ' + g.nom;
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }

  // ---------- Réglages > Grades (patron uniquement) ----------
  function renderGradesSettings() {
    const list = document.getElementById('grades-list');
    if (!list) return;

    if (!allGrades.length) {
      list.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">Aucun grade pour l\'instant — ajoutes-en un ci-dessous.</p>';
      return;
    }

    list.innerHTML = allGrades.map(g => `
      <div class="ps-entry-row" data-grade-id="${g.id}">
        <div class="grade-row-view" style="display:flex; align-items:center; justify-content:space-between; gap:0.8rem; flex-wrap:wrap;">
          <div>
            <span style="font-weight:600;">${escapeHtml(g.nom)}</span>
            <span class="ps-entry-meta">à partir de ${g.seuil} livraison${g.seuil > 1 ? 's' : ''} validée${g.seuil > 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex; gap:0.4rem; flex-shrink:0;">
            <button class="btn-mini" data-grade-edit="${g.id}">Modifier</button>
            <button class="btn-mini" data-grade-delete="${g.id}" style="color:var(--burgundy);">Supprimer</button>
          </div>
        </div>
        <div class="grade-row-edit ps-field-row" style="display:none; margin-top:0.6rem;">
          <input type="text" class="input-real grade-edit-nom" value="${escapeHtml(g.nom)}" style="flex:1; min-width:160px;">
          <input type="number" class="input-real grade-edit-seuil" value="${g.seuil}" min="0" style="width:120px;">
          <button class="btn-gold grade-edit-save" style="padding:0.5rem 0.9rem; font-size:0.78rem;">Enregistrer</button>
          <button class="btn-mini grade-edit-cancel">Annuler</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-grade-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-grade-id]');
        row.querySelector('.grade-row-view').style.display = 'none';
        row.querySelector('.grade-row-edit').style.display = 'flex';
      });
    });
    list.querySelectorAll('.grade-edit-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-grade-id]');
        row.querySelector('.grade-row-edit').style.display = 'none';
        row.querySelector('.grade-row-view').style.display = 'flex';
      });
    });
    list.querySelectorAll('.grade-edit-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('[data-grade-id]');
        const id = row.dataset.gradeId;
        const nom = row.querySelector('.grade-edit-nom').value.trim();
        const seuil = Number(row.querySelector('.grade-edit-seuil').value);
        if (!nom) { setStatus('grades-status', 'Le nom du grade ne peut pas être vide.', true); return; }
        if (isNaN(seuil) || seuil < 0) { setStatus('grades-status', 'Le seuil doit être un nombre positif ou nul.', true); return; }

        btn.disabled = true; btn.textContent = '...';
        const { error } = await supabaseClient.from('grades')
          .update({ nom, seuil, updated_at: new Date().toISOString() }).eq('id', id);
        btn.disabled = false; btn.textContent = 'Enregistrer';

        if (error) { setStatus('grades-status', 'Erreur : ' + error.message, true); return; }
        setStatus('grades-status', '✓ Grade mis à jour.', false);
        await refreshGrades();
      });
    });
    list.querySelectorAll('[data-grade-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.gradeDelete;
        const g = allGrades.find(x => x.id === id);
        if (!confirm(`Supprimer le grade « ${g ? g.nom : ''} » ?\n\nLes membres qui l'avaient prennent automatiquement le grade juste en dessous.`)) return;

        btn.disabled = true;
        const { error } = await supabaseClient.from('grades').delete().eq('id', id);
        btn.disabled = false;

        if (error) { setStatus('grades-status', 'Erreur : ' + error.message, true); return; }
        setStatus('grades-status', '✓ Grade supprimé.', false);
        await refreshGrades();
      });
    });
  }

  document.getElementById('grade-add-btn')?.addEventListener('click', async () => {
    const nomInput = document.getElementById('grade-new-nom');
    const seuilInput = document.getElementById('grade-new-seuil');
    const nom = (nomInput.value || '').trim();
    const seuil = Number(seuilInput.value || 0);
    if (!nom) { setStatus('grades-status', 'Indique un nom de grade.', true); return; }
    if (isNaN(seuil) || seuil < 0) { setStatus('grades-status', 'Le seuil doit être un nombre positif ou nul.', true); return; }

    const btn = document.getElementById('grade-add-btn');
    btn.disabled = true; btn.textContent = '...';
    const { error } = await supabaseClient.from('grades').insert({
      nom, seuil, created_by: currentProfile ? currentProfile.id : null
    });
    btn.disabled = false; btn.textContent = '+ Ajouter';

    if (error) {
      setStatus('grades-status', "Échec de l'enregistrement : " + error.message + " — le script SQL 25-grades.sql a-t-il bien été exécuté dans Supabase ?", true);
      return;
    }
    nomInput.value = ''; seuilInput.value = '';
    setStatus('grades-status', '✓ Grade ajouté.', false);
    await refreshGrades();
  });

  // Recharge l'échelle et redessine tous les écrans où un grade est affiché
  async function refreshGrades() {
    await loadGrades();
    renderGradesSettings();
    renderProfileGrade();
    if (typeof renderOfficeTeam === 'function') renderOfficeTeam();
    if (typeof renderClassement === 'function') renderClassement();
    if (typeof psCurrentPlayerId !== 'undefined' && psCurrentPlayerId) renderPlayerSheet();
  }
