  // ==========================================================
  // VIE DE L'ENTREPRISE — fil d'annonces du patron, affiché sur le
  // tableau de bord de toute l'équipe
  // ----------------------------------------------------------
  // Table Supabase `annonces` (script 27-annonces.sql) : lecture par toute
  // l'équipe, écriture (publier, supprimer) réservée au patron via
  // public.est_patron(). Pas d'édition après publication — on supprime et on
  // republie, comme un vrai panneau d'affichage.
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

  function renderAnnonces() {
    const list = document.getElementById('annonces-list');
    const toggleBtn = document.getElementById('annonce-new-toggle');
    if (!list) return;

    const isPatron = currentProfile && currentProfile.role === 'patron';
    if (toggleBtn) toggleBtn.style.display = isPatron ? '' : 'none';

    if (!allAnnonces.length) {
      list.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">Aucune annonce pour l\'instant.</p>';
      return;
    }

    list.innerHTML = allAnnonces.map(a => `
      <div class="annonce-item" data-annonce-id="${a.id}">
        <div class="annonce-head">
          <span class="annonce-titre">${escapeHtml(a.titre)}</span>
          <span class="annonce-meta">${pseudoOf(a.auteur_id)} · ${timeAgo(a.created_at)}</span>
        </div>
        <p class="annonce-contenu">${escapeHtml(a.contenu)}</p>
        ${isPatron ? `<button class="btn-mini annonce-delete-btn" data-annonce-delete="${a.id}" style="margin-top:0.6rem; color:var(--burgundy);">Supprimer</button>` : ''}
      </div>`).join('');

    if (isPatron) {
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
