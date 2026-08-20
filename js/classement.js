  // ---------- Classement des chauffeurs (mensuel, trié par nombre de livraisons) ----------
  // Calcul partagé par le Classement et la mise en avant "Chauffeur du mois" du
  // tableau de bord (même critère : livraisons validées ce mois-ci, km parcourus
  // en départage). Aucune valeur stockée : recalculé à chaque chargement à partir
  // des entrées filtrées sur le mois en cours (isCurrentMonth), donc "remis à
  // zéro" automatiquement au changement de mois, sans bouton ni action du patron.
  function getClassementRows() {
    const rows = allProfiles.map(p => {
      const livraisonsMois = allValidatedProofs.filter(v => v.chauffeur_id === p.id && isCurrentMonth(v.validated_at));
      const km = allDistanceEntries
        .filter(e => e.player_id === p.id && isCurrentMonth(e.created_at))
        .reduce((sum, e) => sum + Number(e.km), 0);
      const revenus = livraisonsMois.reduce((sum, v) => sum + (Number(v.revenu_declare) || 0), 0);
      return { profile: p, livraisons: livraisonsMois.length, km, revenus };
    }).sort((a, b) => b.livraisons - a.livraisons || b.km - a.km);

    // Rang partagé en cas d'égalité (même nombre de livraisons = même rang),
    // au lieu d'un simple numéro de ligne qui donnait un rang différent à des
    // chauffeurs pourtant à égalité.
    let rank = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.livraisons !== rows[i - 1].livraisons) rank = i + 1;
      r.rank = rank;
    });
    return rows;
  }

  function moisLabel() {
    const label = formatMonthYearFr(new Date().toISOString()) || '';
    const de = /^[aeiouyh]/i.test(label) ? "d'" : 'de ';
    return label ? `${de}${label}` : '';
  }

  function renderClassement() {
    const list = document.getElementById('classement-list');
    if (!list || !currentProfile) return;

    const periodeEl = document.getElementById('classement-periode');
    if (periodeEl) {
      const suffix = moisLabel();
      periodeEl.textContent = suffix ? `Classement ${suffix}` : 'Classement du mois';
    }

    const rows = getClassementRows();

    if (rows.length === 0) {
      list.innerHTML = '<p style="padding:1.5rem 1.4rem; color:var(--muted); font-size:0.85rem;">Aucun chauffeur pour l\'instant.</p>';
      return;
    }

    const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

    list.innerHTML = rows.map((r) => {
      const rank = r.rank;
      const isMe = r.profile.id === currentProfile.id;
      const avatarStyle = r.profile.avatar_url ? ` style="background-image:url('${r.profile.avatar_url}');"` : '';
      return `
        <div class="classement-row ${isMe ? 'is-me' : ''}">
          <div class="classement-rank ${rank <= 3 ? 'top-' + rank : ''}">${MEDALS[rank] || rank}</div>
          <div class="classement-who">
            <div class="avatar member-avatar"${avatarStyle}>${r.profile.avatar_url ? '' : initialsOf(r.profile.pseudo)}</div>
            <div style="min-width:0;">
              <div class="classement-pseudo">${escapeHtml(r.profile.pseudo)}${isMe ? ' (toi)' : ''}</div>
              ${typeof gradePillHtml === 'function' && gradePillHtml(r.profile.id) ? `<div style="margin-top:2px;">${gradePillHtml(r.profile.id)}</div>` : ''}
            </div>
          </div>
          <div class="classement-col">${r.livraisons}</div>
          <div class="classement-col km">${r.km.toLocaleString('fr-FR')} km</div>
          <div class="classement-col">${r.revenus.toLocaleString('fr-FR')} €</div>
        </div>`;
    }).join('');
  }

  // ---------- Chauffeur du mois — mise en avant sur le tableau de bord ----------
  // Simple reflet du n°1 du Classement (même tri par livraisons ce mois-ci) :
  // aucune table ni action manuelle, la mise en avant change donc toute seule au
  // fil des livraisons et repart à zéro chaque mois en même temps que le
  // Classement. Masquée tant qu'aucune livraison n'a encore été validée ce
  // mois-ci, pour ne pas désigner un "gagnant" arbitraire à 0 livraison.
  function renderChauffeurDuMois() {
    const card = document.getElementById('chauffeur-mois-card');
    const content = document.getElementById('chauffeur-mois-content');
    if (!card || !content || !currentProfile) return;

    const rows = getClassementRows();
    const top = rows[0];

    if (!top || top.livraisons <= 0) {
      card.style.display = 'none';
      content.innerHTML = '';
      return;
    }

    const suffix = moisLabel();
    const eyebrow = document.getElementById('chauffeur-mois-eyebrow');
    if (eyebrow) eyebrow.textContent = suffix ? `🏆 Chauffeur du mois ${suffix}` : '🏆 Chauffeur du mois';

    card.style.display = '';
    const isMe = top.profile.id === currentProfile.id;
    const avatarStyle = top.profile.avatar_url ? ` style="background-image:url('${top.profile.avatar_url}');"` : '';
    content.innerHTML = `
      <div class="chauffeur-mois-body">
        <div class="chauffeur-mois-who">
          <div class="avatar chauffeur-mois-avatar"${avatarStyle}>${top.profile.avatar_url ? '' : initialsOf(top.profile.pseudo)}</div>
          <div style="min-width:0;">
            <div class="chauffeur-mois-pseudo">${escapeHtml(top.profile.pseudo)}${isMe ? ' (toi)' : ''}</div>
            ${typeof gradePillHtml === 'function' && gradePillHtml(top.profile.id) ? `<div style="margin-top:4px;">${gradePillHtml(top.profile.id)}</div>` : ''}
          </div>
        </div>
        <div class="chauffeur-mois-stats">
          <div><div class="stat-value">${top.livraisons}</div><p class="eyebrow">Livraisons</p></div>
          <div><div class="stat-value">${top.km.toLocaleString('fr-FR')} km</div><p class="eyebrow">Km parcourus</p></div>
          <div><div class="stat-value">${top.revenus.toLocaleString('fr-FR')} €</div><p class="eyebrow">Revenus déclarés</p></div>
        </div>
      </div>`;
  }
