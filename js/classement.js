  // ---------- Classement des chauffeurs (mensuel, trié par km parcourus) ----------
  function renderClassement() {
    const list = document.getElementById('classement-list');
    if (!list || !currentProfile) return;

    const periodeEl = document.getElementById('classement-periode');
    if (periodeEl) {
      const label = formatMonthYearFr(new Date().toISOString()) || '';
      const de = /^[aeiouyh]/i.test(label) ? "d'" : 'de ';
      periodeEl.textContent = label ? `Classement ${de}${label}` : 'Classement du mois';
    }

    const rows = allProfiles.map(p => {
      const livraisonsMois = allValidatedProofs.filter(v => v.chauffeur_id === p.id && isCurrentMonth(v.validated_at));
      const km = allDistanceEntries
        .filter(e => e.player_id === p.id && isCurrentMonth(e.created_at))
        .reduce((sum, e) => sum + Number(e.km), 0);
      const revenus = livraisonsMois.reduce((sum, v) => sum + (Number(v.revenu_declare) || 0), 0);
      return { profile: p, livraisons: livraisonsMois.length, km, revenus };
    }).sort((a, b) => b.km - a.km);

    if (rows.length === 0) {
      list.innerHTML = '<p style="padding:1.5rem 1.4rem; color:var(--muted); font-size:0.85rem;">Aucun chauffeur pour l\'instant.</p>';
      return;
    }

    const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

    list.innerHTML = rows.map((r, i) => {
      const rank = i + 1;
      const isMe = r.profile.id === currentProfile.id;
      const avatarStyle = r.profile.avatar_url ? ` style="background-image:url('${r.profile.avatar_url}');"` : '';
      return `
        <div class="classement-row ${isMe ? 'is-me' : ''}">
          <div class="classement-rank ${rank <= 3 ? 'top-' + rank : ''}">${MEDALS[rank] || rank}</div>
          <div class="classement-who">
            <div class="avatar member-avatar"${avatarStyle}>${r.profile.avatar_url ? '' : initialsOf(r.profile.pseudo)}</div>
            <span class="classement-pseudo">${escapeHtml(r.profile.pseudo)}${isMe ? ' (toi)' : ''}</span>
          </div>
          <div class="classement-col">${r.livraisons}</div>
          <div class="classement-col km">${r.km.toLocaleString('fr-FR')} km</div>
          <div class="classement-col">${r.revenus.toLocaleString('fr-FR')} €</div>
        </div>`;
    }).join('');
  }
