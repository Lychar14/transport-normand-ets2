  // ---------- Mon profil ----------
  function initialsOf(pseudo) {
    if (!pseudo) return '?';
    const parts = pseudo.replace(/[_\-.]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return pseudo.slice(0, 2).toUpperCase();
  }

  const TROPHY_MILESTONES = [
    { threshold: 1, icon: '🚚', label: 'Premier trajet' },
    { threshold: 5, icon: '🛣️', label: 'Habitué de la route' },
    { threshold: 15, icon: '⛽', label: 'Vétéran du bitume' },
    { threshold: 30, icon: '🏆', label: 'Pilier de la flotte' },
    { threshold: 50, icon: '👑', label: 'Légende de la route' },
    { threshold: 100, icon: '🌟', label: 'Centurion du volant' }
  ];

  function renderProfileTrophies(total) {
    const wrap = document.getElementById('profile-trophies');
    if (!wrap) return;

    const badgesHtml = TROPHY_MILESTONES.map(t => {
      const unlocked = total >= t.threshold;
      return `
        <div class="trophy-badge ${unlocked ? 'unlocked' : 'locked'}" title="${t.label} — ${t.threshold} livraison${t.threshold > 1 ? 's' : ''}">
          <span class="trophy-icon">${t.icon}</span>
          <span class="trophy-label">${t.label}</span>
        </div>`;
    }).join('');

    const next = TROPHY_MILESTONES.find(t => total < t.threshold);
    let progressHtml = `<p style="color:var(--muted); font-size:0.8rem;">Tous les trophées sont débloqués, bravo !</p>`;
    if (next) {
      const prev = [...TROPHY_MILESTONES].reverse().find(t => total >= t.threshold);
      const base = prev ? prev.threshold : 0;
      const pct = Math.min(100, Math.round(((total - base) / (next.threshold - base)) * 100));
      progressHtml = `
        <p style="color:var(--muted); font-size:0.78rem; margin-bottom:0.5rem;">
          Encore ${next.threshold - total} livraison${next.threshold - total > 1 ? 's' : ''} avant « ${next.label} »
        </p>
        <div class="trophy-progress-track"><div class="trophy-progress-fill" style="width:${pct}%;"></div></div>`;
    }

    wrap.innerHTML = `<div class="trophy-row">${badgesHtml}</div>${progressHtml}`;
  }

  function renderRecentMissions() {
    const wrap = document.getElementById('profile-recent-missions');
    if (!wrap || !currentProfile) return;

    const mine = allValidatedProofs
      .filter(p => p.chauffeur_id === currentProfile.id)
      .slice()
      .sort((a, b) => new Date(b.validated_at) - new Date(a.validated_at))
      .slice(0, 4);

    if (!mine.length) {
      wrap.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">Aucune mission validée pour l\'instant.</p>';
      return;
    }

    wrap.innerHTML = mine.map(p => {
      const mission = allMissions.find(m => m.id === p.mission_id);
      const titre = mission ? `${mission.ville_depart} → ${mission.ville_arrivee}` : 'Mission supprimée';
      return `
        <div class="task-row" style="border-left: 2px solid var(--good);">
          <div class="task-check done">✓</div>
          <div style="flex:1;">
            <div class="task-title">${titre}</div>
            <div class="route-line"><span class="end"></span><span class="dash"></span><span class="end dest"></span><span class="route-cities">Validée ${timeAgo(p.validated_at)}</span></div>
          </div>
        </div>`;
    }).join('');
  }

  function renderProfile() {
    if (!currentProfile) return;

    renderAvatarBig();

    const pseudoEl = document.getElementById('profile-pseudo');
    if (pseudoEl) pseudoEl.textContent = currentProfile.pseudo || '—';

    const roleLabel = currentProfile.role === 'patron' ? 'Patron' : 'Chauffeur';
    const pillEl = document.getElementById('profile-role-pill');
    if (pillEl) pillEl.textContent = roleLabel;

    const sinceEl = document.getElementById('profile-since');
    if (sinceEl) {
      const since = formatMonthYearFr(currentProfile.created_at);
      sinceEl.textContent = since ? `${roleLabel} · chez ${siteNom} depuis ${since}` : roleLabel;
    }

    const mine = allValidatedProofs.filter(p => p.chauffeur_id === currentProfile.id);

    const livraisonsEl = document.getElementById('profile-stat-livraisons');
    if (livraisonsEl) livraisonsEl.textContent = String(mine.length);

    const moisEl = document.getElementById('profile-stat-mois');
    if (moisEl) moisEl.textContent = String(mine.filter(p => isCurrentMonth(p.validated_at)).length);

    const ancienneteEl = document.getElementById('profile-stat-anciennete');
    if (ancienneteEl) {
      if (currentProfile.created_at) {
        const start = new Date(currentProfile.created_at);
        const now = new Date();
        let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (months < 0) months = 0;
        ancienneteEl.innerHTML = `${months} <span style="font-size:0.9rem; color:var(--muted);">mois</span>`;
      } else {
        ancienneteEl.textContent = '—';
      }
    }

    renderProfileTrophies(mine.length);
    renderRecentMissions();

    const distanceEl = document.getElementById('profile-stat-distance');
    if (distanceEl) {
      const total = totalDistanceOf(currentProfile.id);
      distanceEl.innerHTML = `${total.toLocaleString('fr-FR')} <span style="font-size:0.9rem; color:var(--muted);">km</span>`;
    }
  }

  // ---------- Photo de profil ----------
  function renderAvatarBig() {
    if (!currentProfile) return;
    const el = document.getElementById('profile-avatar-big');
    if (el) {
      if (currentProfile.avatar_url) {
        el.style.backgroundImage = `url('${currentProfile.avatar_url}')`;
        el.textContent = '';
      } else {
        el.style.backgroundImage = '';
        el.textContent = initialsOf(currentProfile.pseudo);
      }
    }
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = currentProfile.avatar_url ? `url('${currentProfile.avatar_url}')` : '';
    }
  }

  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarEditBtn = document.getElementById('avatar-edit-btn');
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file || !currentProfile) return;

      if (!file.type.startsWith('image/')) {
        alert("Merci de choisir un fichier image (JPG, PNG ou WEBP).");
        avatarInput.value = '';
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        alert('Photo trop lourde (3 Mo maximum).');
        avatarInput.value = '';
        return;
      }

      if (avatarEditBtn) avatarEditBtn.classList.add('uploading');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${currentProfile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        if (avatarEditBtn) avatarEditBtn.classList.remove('uploading');
        alert("Erreur lors de l'envoi de la photo : " + uploadError.message);
        avatarInput.value = '';
        return;
      }

      const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl + '?t=' + Date.now(); // évite le cache navigateur après remplacement

      const { error: updateError } = await supabaseClient.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentProfile.id);

      if (avatarEditBtn) avatarEditBtn.classList.remove('uploading');
      avatarInput.value = '';

      if (updateError) {
        alert("Photo envoyée mais impossible de mettre à jour le profil : " + updateError.message);
        return;
      }

      currentProfile.avatar_url = avatarUrl;
      renderAvatarBig();
    });
  }

  // ---------- Ma flotte (fiche camion personnelle, sur "Mon profil") ----------
  let myFleetProfile = null;

  async function loadMyFleet() {
    if (!currentProfile) return;
    const { data } = await supabaseClient.from('driver_profiles').select('*').eq('id', currentProfile.id).maybeSingle();
    myFleetProfile = data || null;
  }

  function renderMyFleet() {
    const camionEl = document.getElementById('my-fleet-camion');
    const permisEl = document.getElementById('my-fleet-permis');
    const dlcEl = document.getElementById('my-fleet-dlc');
    const remorquesEl = document.getElementById('my-fleet-remorques');
    if (!camionEl) return;

    camionEl.innerHTML = csvToTags(myFleetProfile?.camion_actuel, { truck: true });
    permisEl.innerHTML = csvToTags(myFleetProfile?.permis);
    dlcEl.innerHTML = dlcTagsHtml(myFleetProfile?.dlc_debloquees);
    remorquesEl.innerHTML = csvToTags(myFleetProfile?.remorques);

    // Pré-remplissage du formulaire d'édition
    document.getElementById('my-fleet-camion-input').value = myFleetProfile?.camion_actuel || '';
    document.getElementById('my-fleet-permis-input').value = myFleetProfile?.permis || '';
    document.getElementById('my-fleet-remorques-input').value = myFleetProfile?.remorques || '';
    const dlcInputWrap = document.getElementById('my-fleet-dlc-input');
    const unlocked = (myFleetProfile?.dlc_debloquees || '').split(',').map(s => s.trim()).filter(Boolean);
    dlcInputWrap.innerHTML = DLC_LIST.map(d =>
      `<label class="tag" style="cursor:pointer;"><input type="checkbox" class="my-fleet-dlc-checkbox" value="${d}" ${unlocked.includes(d) ? 'checked' : ''} style="margin-right:5px;" />${d}</label>`
    ).join('');
  }

  const myFleetEditToggle = document.getElementById('my-fleet-edit-toggle');
  const myFleetCancelBtn = document.getElementById('my-fleet-cancel-btn');
  if (myFleetEditToggle) {
    myFleetEditToggle.addEventListener('click', () => {
      document.getElementById('my-fleet-view').style.display = 'none';
      document.getElementById('my-fleet-edit-form').style.display = 'block';
    });
  }
  if (myFleetCancelBtn) {
    myFleetCancelBtn.addEventListener('click', () => {
      renderMyFleet();
      document.getElementById('my-fleet-edit-form').style.display = 'none';
      document.getElementById('my-fleet-view').style.display = 'block';
    });
  }

  const myFleetSaveBtn = document.getElementById('my-fleet-save-btn');
  if (myFleetSaveBtn) {
    myFleetSaveBtn.addEventListener('click', async () => {
      const camion = document.getElementById('my-fleet-camion-input').value.trim();
      const permis = document.getElementById('my-fleet-permis-input').value.trim();
      const remorques = document.getElementById('my-fleet-remorques-input').value.trim();
      const dlcChecked = [...document.querySelectorAll('.my-fleet-dlc-checkbox:checked')].map(cb => cb.value).join(', ');

      myFleetSaveBtn.disabled = true; myFleetSaveBtn.textContent = 'Enregistrement...';
      const { error } = await supabaseClient.from('driver_profiles').upsert({
        id: currentProfile.id,
        camion_actuel: camion || null,
        permis: permis || null,
        remorques: remorques || null,
        dlc_debloquees: dlcChecked || null,
        updated_at: new Date().toISOString()
      });
      myFleetSaveBtn.disabled = false; myFleetSaveBtn.textContent = 'Enregistrer';

      if (error) { setStatus('my-fleet-status', 'Erreur : ' + error.message, true); return; }
      setStatus('my-fleet-status', 'Fiche mise à jour !', false);
      await loadMyFleet();
      renderMyFleet();
      if (currentProfile.role === 'patron') { await loadDriverProfiles(); renderDriverProfiles(); }
      document.getElementById('my-fleet-edit-form').style.display = 'none';
      document.getElementById('my-fleet-view').style.display = 'block';
    });
  }
