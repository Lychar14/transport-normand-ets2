  // ==========================================================
  // CITATIONS DE LA ROUTE — citation du jour, échelle 100 % éditable
  // depuis Réglages > Citations de la route
  // ----------------------------------------------------------
  // Lecture publique (affichée dès la page de connexion, avant toute
  // authentification), écriture réservée au patron (script 26-citations.sql).
  // Une même citation reste affichée toute la journée (indexée sur le jour de
  // l'année), aussi bien sur la page de connexion que sur le tableau de bord.
  // ==========================================================
  let allCitations = [];

  async function loadCitations() {
    const { data, error } = await supabaseClient.from('citations').select('*').order('created_at', { ascending: true });
    allCitations = error ? [] : (data || []);
  }

  function citationDuJour() {
    if (!allCitations.length) return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return allCitations[dayOfYear % allCitations.length];
  }

  function citationHtml(c) {
    return `« ${escapeHtml(c.texte)} »` + (c.auteur ? `<span>— ${escapeHtml(c.auteur)}</span>` : '');
  }

  function renderLoginQuote() {
    const el = document.getElementById('login-quote');
    if (!el) return;
    const c = citationDuJour();
    if (c) { el.innerHTML = citationHtml(c); el.style.display = ''; }
    else { el.style.display = 'none'; }
  }

  function renderDashboardQuote() {
    const el = document.getElementById('dashboard-quote');
    if (!el) return;
    const c = citationDuJour();
    if (c) { el.innerHTML = citationHtml(c); el.style.display = ''; }
    else { el.style.display = 'none'; }
  }

  // Chargée dès l'ouverture de la page, avant toute connexion (page de
  // connexion publique) — même principe que loadSiteContenu() dans settings.js.
  loadCitations().then(renderLoginQuote);

  // ---------- Réglages > Citations de la route (patron uniquement) ----------
  function renderCitationsSettings() {
    const list = document.getElementById('citations-list');
    if (!list) return;

    if (!allCitations.length) {
      list.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">Aucune citation pour l\'instant — ajoutes-en une ci-dessous.</p>';
      return;
    }

    list.innerHTML = allCitations.map(c => `
      <div class="ps-entry-row" data-citation-id="${c.id}">
        <div class="citation-row-view" style="display:flex; align-items:flex-start; justify-content:space-between; gap:0.8rem; flex-wrap:wrap;">
          <div style="flex:1; min-width:200px;">
            <span style="font-style:italic;">« ${escapeHtml(c.texte)} »</span>
            ${c.auteur ? `<div class="ps-entry-meta">— ${escapeHtml(c.auteur)}</div>` : ''}
          </div>
          <div style="display:flex; gap:0.4rem; flex-shrink:0;">
            <button class="btn-mini" data-citation-edit="${c.id}">Modifier</button>
            <button class="btn-mini" data-citation-delete="${c.id}" style="color:var(--burgundy);">Supprimer</button>
          </div>
        </div>
        <div class="citation-row-edit ps-field-row" style="display:none; margin-top:0.6rem;">
          <input type="text" class="input-real citation-edit-texte" value="${escapeHtml(c.texte)}" style="flex:1; min-width:220px;">
          <input type="text" class="input-real citation-edit-auteur" value="${escapeHtml(c.auteur || '')}" placeholder="Auteur (facultatif)" style="width:180px;">
          <button class="btn-gold citation-edit-save" style="padding:0.5rem 0.9rem; font-size:0.78rem;">Enregistrer</button>
          <button class="btn-mini citation-edit-cancel">Annuler</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-citation-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-citation-id]');
        row.querySelector('.citation-row-view').style.display = 'none';
        row.querySelector('.citation-row-edit').style.display = 'flex';
      });
    });
    list.querySelectorAll('.citation-edit-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-citation-id]');
        row.querySelector('.citation-row-edit').style.display = 'none';
        row.querySelector('.citation-row-view').style.display = 'flex';
      });
    });
    list.querySelectorAll('.citation-edit-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('[data-citation-id]');
        const id = row.dataset.citationId;
        const texte = row.querySelector('.citation-edit-texte').value.trim();
        const auteur = row.querySelector('.citation-edit-auteur').value.trim();
        if (!texte) { setStatus('citations-status', 'Le texte de la citation ne peut pas être vide.', true); return; }

        btn.disabled = true; btn.textContent = '...';
        const { error } = await supabaseClient.from('citations')
          .update({ texte, auteur: auteur || null, updated_at: new Date().toISOString() }).eq('id', id);
        btn.disabled = false; btn.textContent = 'Enregistrer';

        if (error) { setStatus('citations-status', 'Erreur : ' + error.message, true); return; }
        setStatus('citations-status', '✓ Citation mise à jour.', false);
        await refreshCitations();
      });
    });
    list.querySelectorAll('[data-citation-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.citationDelete;
        if (!confirm('Supprimer cette citation ?')) return;

        btn.disabled = true;
        const { error } = await supabaseClient.from('citations').delete().eq('id', id);
        btn.disabled = false;

        if (error) { setStatus('citations-status', 'Erreur : ' + error.message, true); return; }
        setStatus('citations-status', '✓ Citation supprimée.', false);
        await refreshCitations();
      });
    });
  }

  document.getElementById('citation-add-btn')?.addEventListener('click', async () => {
    const texteInput = document.getElementById('citation-new-texte');
    const auteurInput = document.getElementById('citation-new-auteur');
    const texte = (texteInput.value || '').trim();
    const auteur = (auteurInput.value || '').trim();
    if (!texte) { setStatus('citations-status', 'Indique le texte de la citation.', true); return; }

    const btn = document.getElementById('citation-add-btn');
    btn.disabled = true; btn.textContent = '...';
    const { error } = await supabaseClient.from('citations').insert({
      texte, auteur: auteur || null, created_by: currentProfile ? currentProfile.id : null
    });
    btn.disabled = false; btn.textContent = '+ Ajouter';

    if (error) {
      setStatus('citations-status', "Échec de l'enregistrement : " + error.message + " — le script SQL 26-citations.sql a-t-il bien été exécuté dans Supabase ?", true);
      return;
    }
    texteInput.value = ''; auteurInput.value = '';
    setStatus('citations-status', '✓ Citation ajoutée.', false);
    await refreshCitations();
  });

  async function refreshCitations() {
    await loadCitations();
    renderCitationsSettings();
    renderLoginQuote();
    renderDashboardQuote();
  }
