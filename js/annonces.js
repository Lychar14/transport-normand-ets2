  // ==========================================================
  // VIE DE L'ENTREPRISE — fil d'annonces du patron : bandeau défilant en
  // lecture seule sur le tableau de bord de toute l'équipe, gestion
  // (publier/modifier/supprimer) dans Bureau du patron > Fil d'actualités
  // ----------------------------------------------------------
  // Table Supabase `annonces` (scripts 27-annonces.sql puis
  // 28-annonces-edition.sql pour l'update) : lecture par toute l'équipe,
  // écriture (publier, modifier, supprimer) réservée au patron via
  // public.est_patron().
  // ==========================================================
  const ANNONCES_MAX = 8;   // les plus récentes affichées en premier
  let allAnnonces = [];

  async function loadAnnonces() {
    const { data, error } = await supabaseClient
      .from('annonces')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ANNONCES_MAX);
    allAnnonces = error ? [] : (data || []);
  }

  // Bandeau défilant : l'annonce complète (titre + message), dupliquée une
  // fois pour que la boucle CSS (translateX -50%) reparte pile où le premier
  // passage finit. La durée est recalculée selon la largeur réelle du texte
  // pour garder une vitesse de défilement constante, peu importe le volume.
  function renderAnnonceTicker() {
    const wrap = document.getElementById('annonce-ticker');
    const track = document.getElementById('annonce-ticker-track');
    if (!wrap || !track) return;

    if (!allAnnonces.length) {
      wrap.style.display = 'none';
      track.innerHTML = '';
      return;
    }

    const items = allAnnonces.map(a => {
      const contenuFlat = (a.contenu || '').replace(/\s+/g, ' ').trim();
      return `<span class="annonce-ticker-item">📢 <b>${escapeHtml(a.titre)}</b>${contenuFlat ? ' — ' + escapeHtml(contenuFlat) : ''}</span>`;
    });
    const sep = '<span class="annonce-ticker-sep">•</span>';
    const passage = items.join(sep);

    wrap.style.display = '';
    track.innerHTML = passage + sep + passage + sep;

    // Vitesse constante (~55px/s) quel que soit le volume de texte affiché
    const largeurPassage = track.scrollWidth / 2;
    const duree = Math.max(18, Math.round(largeurPassage / 55));
    track.style.animationDuration = duree + 's';
  }

  // La liste détaillée ne sert plus qu'à la gestion (créer/modifier/supprimer) :
  // le bandeau défilant affiche déjà l'annonce complète pour tout le monde.
  // Elle n'est donc rendue que côté patron ; les employés ne voient que le bandeau.
  function renderAnnonces() {
    const list = document.getElementById('annonces-list');
    const toggleBtn = document.getElementById('annonce-new-toggle');
    if (!list) return;

    const isPatron = currentProfile && currentProfile.role === 'patron';
    if (toggleBtn) toggleBtn.style.display = isPatron ? '' : 'none';

    renderAnnonceTicker();

    if (!isPatron) {
      list.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    list.style.display = '';

    if (!allAnnonces.length) {
      list.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">Aucune annonce pour l\'instant — publie la première ci-dessus.</p>';
      return;
    }

    list.innerHTML = allAnnonces.map(a => `
      <div class="annonce-item" data-annonce-id="${a.id}">
        <div class="annonce-view">
          <div class="annonce-head">
            <span class="annonce-titre">${escapeHtml(a.titre)}</span>
            <span class="annonce-meta">${pseudoOf(a.auteur_id)} · ${timeAgo(a.created_at)}</span>
          </div>
          <p class="annonce-contenu">${escapeHtml(a.contenu)}</p>
          <div style="display:flex; gap:0.4rem; margin-top:0.6rem;">
            <button class="btn-mini" data-annonce-edit="${a.id}">Modifier</button>
            <button class="btn-mini" data-annonce-delete="${a.id}" style="color:var(--burgundy);">Supprimer</button>
          </div>
        </div>
        <div class="annonce-edit-form" style="display:none; margin-top:0.6rem;">
          <div class="field" style="margin-bottom:0.5rem;"><input type="text" class="input-real annonce-edit-titre" value="${escapeHtml(a.titre)}" maxlength="80" /></div>
          <div class="field" style="margin-bottom:0.5rem;"><textarea class="input-real annonce-edit-contenu" style="min-height:70px; resize:vertical; width:100%;">${escapeHtml(a.contenu)}</textarea></div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-gold annonce-edit-save" style="padding:0.5rem 0.9rem; font-size:0.78rem;">Enregistrer</button>
            <button class="btn-mini annonce-edit-cancel">Annuler</button>
          </div>
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-annonce-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-annonce-id]');
        row.querySelector('.annonce-view').style.display = 'none';
        row.querySelector('.annonce-edit-form').style.display = 'block';
      });
    });
    list.querySelectorAll('.annonce-edit-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-annonce-id]');
        row.querySelector('.annonce-edit-form').style.display = 'none';
        row.querySelector('.annonce-view').style.display = 'block';
      });
    });
    list.querySelectorAll('.annonce-edit-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('[data-annonce-id]');
        const id = row.dataset.annonceId;
        const titre = row.querySelector('.annonce-edit-titre').value.trim();
        const contenu = row.querySelector('.annonce-edit-contenu').value.trim();
        if (!titre || !contenu) { alert('Le titre et le message ne peuvent pas être vides.'); return; }

        btn.disabled = true; btn.textContent = '...';
        const { error } = await supabaseClient.from('annonces')
          .update({ titre, contenu, updated_at: new Date().toISOString() }).eq('id', id);
        btn.disabled = false; btn.textContent = 'Enregistrer';

        if (error) {
          alert("Échec de l'enregistrement : " + error.message + " — le script SQL 28-annonces-edition.sql a-t-il bien été exécuté dans Supabase ?");
          return;
        }
        await loadAnnonces();
        renderAnnonces();
      });
    });
    list.querySelectorAll('[data-annonce-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.annonceDelete;
        if (!confirm('Supprimer cette annonce ?')) return;
        btn.disabled = true;
        const { error } = await supabaseClient.from('annonces').delete().eq('id', id);
        btn.disabled = false;
        if (error) { alert('Erreur : ' + error.message); return; }
        await loadAnnonces();
        renderAnnonces();
      });
    });
  }

  function setAnnonceFormOpen(open) {
    const form = document.getElementById('annonce-form');
    if (!form) return;
    form.style.display = open ? 'block' : 'none';
    if (open) {
      document.getElementById('annonce-titre').focus();
    } else {
      document.getElementById('annonce-titre').value = '';
      document.getElementById('annonce-contenu').value = '';
      setStatus('annonce-status', '', false);
    }
  }

  document.getElementById('annonce-new-toggle')?.addEventListener('click', () => setAnnonceFormOpen(true));
  document.getElementById('annonce-cancel-btn')?.addEventListener('click', () => setAnnonceFormOpen(false));

  document.getElementById('annonce-publish-btn')?.addEventListener('click', async () => {
    const titre = (document.getElementById('annonce-titre').value || '').trim();
    const contenu = (document.getElementById('annonce-contenu').value || '').trim();
    if (!titre) { setStatus('annonce-status', 'Indique un titre.', true); return; }
    if (!contenu) { setStatus('annonce-status', 'Écris le contenu de l\'annonce.', true); return; }

    const btn = document.getElementById('annonce-publish-btn');
    btn.disabled = true; btn.textContent = 'Publication...';
    const { error } = await supabaseClient.from('annonces').insert({
      titre, contenu, auteur_id: currentProfile ? currentProfile.id : null
    });
    btn.disabled = false; btn.textContent = 'Publier';

    if (error) {
      setStatus('annonce-status', "Échec de la publication : " + error.message + " — le script SQL 27-annonces.sql a-t-il bien été exécuté dans Supabase ?", true);
      return;
    }
    setAnnonceFormOpen(false);
    await loadAnnonces();
    renderAnnonces();
  });
