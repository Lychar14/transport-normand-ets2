  // ==========================================================
  // TEXTE DE PRÉSENTATION (page de connexion) — enregistré en base
  // ----------------------------------------------------------
  // Le texte que voient les visiteurs est stocké dans la table Supabase
  // `site_contenu` (clé 'presentation'). Tout le monde peut le LIRE, même sans
  // être connecté ; seul le patron peut l'ÉCRIRE, depuis Bureau du patron >
  // Page d'accueil. Le texte écrit en dur dans index.html sert de secours
  // (première visite, ligne absente en base, ou base injoignable).
  // ==========================================================
  const presLoginContent = document.getElementById('pres-content');
  const presAdminContent = document.getElementById('pres-admin-content');
  const presAdminZone = document.getElementById('pres-admin-zone');
  const PRES_DEFAULT_HTML = presLoginContent ? presLoginContent.innerHTML : '';
  let presCurrentHtml = PRES_DEFAULT_HTML;   // version actuellement publiée
  let presEditing = false;

  // Éléments rendus modifiables : on autorise le TEXTE, pas la structure
  const PRES_EDITABLE_SELECTOR = [
    '.eyebrow', '.pres-tagline', 'h3',
    '.pres-check-list li', '.pres-plain-list li', '.pres-process li',
    '.pres-story p', '.pres-quote p', '.pres-signature', '.pres-subhead',
    '.pres-divider span', '.pres-section > p'
  ].join(', ');

  // Charge tout ce qui est personnalisable (texte de présentation, nom, logo)
  // et l'applique à la page. Une seule requête, dès le chargement, avant même
  // toute connexion : la page de connexion est publique.
  async function loadSiteContenu() {
    try {
      const { data, error } = await supabaseClient
        .from('site_contenu')
        .select('cle, contenu_html');
      if (error || !data) return;             // table absente / hors ligne → valeurs par défaut
      const valeurs = {};
      data.forEach(ligne => { valeurs[ligne.cle] = ligne.contenu_html; });

      if (valeurs.presentation && valeurs.presentation.trim() && presLoginContent) {
        presCurrentHtml = valeurs.presentation;
        presLoginContent.innerHTML = presCurrentHtml;
      }
      if (valeurs.nom_entreprise && valeurs.nom_entreprise.trim()) {
        siteNom = valeurs.nom_entreprise.trim();
      }
      if (valeurs.logo_url && valeurs.logo_url.trim()) {
        siteLogoUrl = valeurs.logo_url.trim();
      }
      if (valeurs.icone_url && valeurs.icone_url.trim()) {
        siteIconeUrl = valeurs.icone_url.trim();
      }
      applyIdentity();
    } catch (e) { /* on garde les valeurs par défaut */ }
  }
  loadSiteContenu();

  // Remplit le cadre d'édition du Bureau du patron
  function renderPresentationAdmin() {
    if (!presAdminContent) return;
    presAdminContent.innerHTML = presCurrentHtml;
    setPresEditing(false);
  }

  function setPresEditing(on) {
    presEditing = on;
    if (!presAdminZone || !presAdminContent) return;
    presAdminZone.classList.toggle('editing', on);
    presAdminContent.querySelectorAll(PRES_EDITABLE_SELECTOR).forEach(el => {
      if (on) el.setAttribute('contenteditable', 'true');
      else el.removeAttribute('contenteditable');
    });
    const show = (id, visible) => {
      const el = document.getElementById(id);
      if (el) el.style.display = visible ? '' : 'none';
    };
    show('pres-admin-edit', !on);
    show('pres-admin-save', on);
    show('pres-admin-cancel', on);
    show('pres-admin-reset', on);
  }

  function presStatus(msg, color) {
    const el = document.getElementById('pres-admin-status');
    if (el) { el.textContent = msg; el.style.color = color || 'var(--muted)'; }
  }

  document.getElementById('pres-admin-edit')?.addEventListener('click', () => {
    setPresEditing(true);
    presStatus('Clique dans un texte pour le corriger, puis « Enregistrer ».');
  });

  document.getElementById('pres-admin-cancel')?.addEventListener('click', () => {
    if (presAdminContent) presAdminContent.innerHTML = presCurrentHtml;  // on jette les modifications
    setPresEditing(false);
    presStatus('Modifications annulées.');
  });

  document.getElementById('pres-admin-reset')?.addEventListener('click', () => {
    if (presAdminContent) presAdminContent.innerHTML = PRES_DEFAULT_HTML;
    setPresEditing(true);
    presStatus("Texte d'origine restauré dans le cadre — clique sur « Enregistrer » pour le publier.");
  });

  document.getElementById('pres-admin-save')?.addEventListener('click', async () => {
    if (!presAdminContent) return;
    const btn = document.getElementById('pres-admin-save');
    const nouveau = presAdminContent.innerHTML;
    btn.disabled = true;
    presStatus('Enregistrement…');
    const { error } = await supabaseClient
      .from('site_contenu')
      .upsert({
        cle: 'presentation',
        contenu_html: nouveau,
        updated_at: new Date().toISOString(),
        updated_by: currentProfile ? currentProfile.id : null
      }, { onConflict: 'cle' });
    btn.disabled = false;
    if (error) {
      presStatus("Échec de l'enregistrement : " + error.message + " — le script SQL 19-presentation-page.sql a-t-il bien été exécuté dans Supabase ?", 'var(--burgundy)');
      return;
    }
    presCurrentHtml = nouveau;
    if (presLoginContent) presLoginContent.innerHTML = presCurrentHtml;  // page de connexion à jour
    setPresEditing(false);
    presStatus("✓ Texte enregistré — il s'affiche maintenant sur la page de connexion, même après rechargement.", 'var(--good)');
  });

  // ==========================================================
  // IDENTITÉ DE L'ENTREPRISE — nom + logo, enregistrés en base
  // ----------------------------------------------------------
  // Le nom est stocké dans `site_contenu` (clé 'nom_entreprise'), le logo est
  // envoyé dans le bucket Storage `logos` et son adresse stockée sous la clé
  // 'logo_url'. Lecture publique (la page de connexion doit les afficher sans
  // être connecté), écriture réservée au patron depuis Réglages.
  // ==========================================================
  const SITE_NOM_DEFAUT = 'SARL Transports Normands';
  let siteNom = SITE_NOM_DEFAUT;
  let siteLogoUrl = '';                       // vide = logo d'origine du fichier
  let siteIconeUrl = '';                      // vide = petit losange dore d'origine
  const LOGO_ORIGINE_SRC = document.getElementById('login-logo')
    ? document.getElementById('login-logo').getAttribute('src') : '';

  function applyIdentity() {
    document.title = siteNom;
    const h1 = document.getElementById('login-company-name');
    if (h1) h1.textContent = siteNom;
    const brand = document.getElementById('sidebar-company-name');
    if (brand) brand.textContent = siteNom;

    const src = siteLogoUrl || LOGO_ORIGINE_SRC;
    const loginLogo = document.getElementById('login-logo');
    if (loginLogo && src) loginLogo.src = src;

    // Petite icone du menu lateral (independante du grand logo)
    const brandMark = document.getElementById('sidebar-brand-mark');
    const brandIcon = document.getElementById('sidebar-brand-icon');
    const brandDefault = document.getElementById('sidebar-brand-default');
    if (brandMark && brandIcon && brandDefault) {
      if (siteIconeUrl) {
        brandIcon.src = siteIconeUrl;
        brandIcon.style.display = 'block';
        brandDefault.style.display = 'none';
        brandMark.classList.add('custom');
      } else {
        brandIcon.style.display = 'none';
        brandDefault.style.display = '';
        brandMark.classList.remove('custom');
      }
    }
    const iconePreview = document.getElementById('icone-preview');
    const iconePlaceholder = document.getElementById('icone-placeholder');
    if (iconePreview) {
      if (siteIconeUrl) {
        iconePreview.src = siteIconeUrl;
        iconePreview.style.display = 'block';
        if (iconePlaceholder) iconePlaceholder.style.display = 'none';
      } else {
        iconePreview.style.display = 'none';
        if (iconePlaceholder) iconePlaceholder.style.display = '';
      }
    }

    const nameInput = document.getElementById('settings-company-name');
    if (nameInput) nameInput.value = siteNom;
    const preview = document.getElementById('logo-preview');
    const placeholder = document.getElementById('logo-placeholder');
    if (preview && src) {
      preview.src = src;
      preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    }
  }

  function identityStatus(msg, color) {
    const el = document.getElementById('settings-identity-status');
    if (el) { el.textContent = msg; el.style.color = color || 'var(--muted)'; }
  }

  // Enregistre une valeur dans la table site_contenu (patron uniquement)
  async function saveSiteContenu(cle, valeur) {
    return await supabaseClient.from('site_contenu').upsert({
      cle: cle,
      contenu_html: valeur,
      updated_at: new Date().toISOString(),
      updated_by: currentProfile ? currentProfile.id : null
    }, { onConflict: 'cle' });
  }

  // Bouton "Enregistrer l'identité" — nom de l'entreprise
  document.getElementById('settings-identity-save')?.addEventListener('click', async () => {
    const input = document.getElementById('settings-company-name');
    const btn = document.getElementById('settings-identity-save');
    const nouveau = (input?.value || '').trim();
    if (!nouveau) { identityStatus("Le nom de l'entreprise ne peut pas être vide.", 'var(--burgundy)'); return; }
    btn.disabled = true;
    identityStatus('Enregistrement…');
    const { error } = await saveSiteContenu('nom_entreprise', nouveau);
    btn.disabled = false;
    if (error) {
      identityStatus("Échec de l'enregistrement : " + error.message + " — le script SQL 19-presentation-page.sql a-t-il bien été exécuté dans Supabase ?", 'var(--burgundy)');
      return;
    }
    siteNom = nouveau;
    applyIdentity();
    identityStatus('✓ Nom enregistré — appliqué à la sidebar et à la page de connexion.', 'var(--good)');
  });

  // Import du logo : envoi dans le bucket Storage `logos`, puis mémorisation de l'URL
  const logoDrop = document.getElementById('logo-drop');
  const logoInput = document.getElementById('logo-input');
  if (logoDrop && logoInput) {
    logoDrop.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', async () => {
      const file = logoInput.files && logoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        identityStatus('Merci de choisir un fichier image (PNG, JPG ou WEBP).', 'var(--burgundy)');
        logoInput.value = ''; return;
      }
      if (file.size > 3 * 1024 * 1024) {
        identityStatus('Logo trop lourd (3 Mo maximum).', 'var(--burgundy)');
        logoInput.value = ''; return;
      }

      identityStatus('Envoi du logo…');
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const chemin = `entreprise/logo.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('logos')
        .upload(chemin, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) {
        identityStatus("Erreur lors de l'envoi du logo : " + uploadError.message + " — le script SQL 20-logo-entreprise.sql a-t-il bien été exécuté dans Supabase ?", 'var(--burgundy)');
        logoInput.value = ''; return;
      }

      const { data: pub } = supabaseClient.storage.from('logos').getPublicUrl(chemin);
      const url = pub.publicUrl + '?t=' + Date.now();   // évite le cache du navigateur

      const { error } = await saveSiteContenu('logo_url', url);
      logoInput.value = '';
      if (error) {
        identityStatus("Logo envoyé mais impossible de l'enregistrer : " + error.message, 'var(--burgundy)');
        return;
      }
      siteLogoUrl = url;
      applyIdentity();
      identityStatus('✓ Logo enregistré — il s\'affiche sur la page de connexion.', 'var(--good)');
    });
  }

  applyIdentity();   // affiche déjà le logo d'origine dans l'aperçu des Réglages

  // ---- Icone du menu lateral ----
  function iconeStatus(msg, color) {
    const el = document.getElementById('settings-icone-status');
    if (el) { el.textContent = msg; el.style.color = color || 'var(--muted)'; }
  }

  const iconeDrop = document.getElementById('icone-drop');
  const iconeInput = document.getElementById('icone-input');
  if (iconeDrop && iconeInput) {
    iconeDrop.addEventListener('click', () => iconeInput.click());
    iconeInput.addEventListener('change', async () => {
      const file = iconeInput.files && iconeInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        iconeStatus('Merci de choisir un fichier image (PNG, JPG ou WEBP).', 'var(--burgundy)');
        iconeInput.value = ''; return;
      }
      if (file.size > 3 * 1024 * 1024) {
        iconeStatus('Icône trop lourde (3 Mo maximum).', 'var(--burgundy)');
        iconeInput.value = ''; return;
      }

      iconeStatus('Envoi de l\'icône…');
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const chemin = `entreprise/icone.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('logos')
        .upload(chemin, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) {
        iconeStatus("Erreur lors de l'envoi : " + uploadError.message + " — le script SQL 20-logo-entreprise.sql a-t-il bien été exécuté dans Supabase ?", 'var(--burgundy)');
        iconeInput.value = ''; return;
      }

      const { data: pub } = supabaseClient.storage.from('logos').getPublicUrl(chemin);
      const url = pub.publicUrl + '?t=' + Date.now();

      const { error } = await saveSiteContenu('icone_url', url);
      iconeInput.value = '';
      if (error) {
        iconeStatus("Icône envoyée mais impossible de l'enregistrer : " + error.message, 'var(--burgundy)');
        return;
      }
      siteIconeUrl = url;
      applyIdentity();
      iconeStatus('✓ Icône enregistrée — elle s\'affiche dans le menu latéral.', 'var(--good)');
    });
  }

  // Reprendre le grand logo de l'entreprise comme icone
  document.getElementById('settings-icone-reuse')?.addEventListener('click', async () => {
    const src = siteLogoUrl || LOGO_ORIGINE_SRC;
    if (!src) { iconeStatus("Aucun logo d'entreprise disponible.", 'var(--burgundy)'); return; }
    if (src.startsWith('data:')) {
      iconeStatus("Le logo d'origine est intégré au fichier : importe directement une image ici.", 'var(--burgundy)');
      return;
    }
    iconeStatus('Enregistrement…');
    const { error } = await saveSiteContenu('icone_url', src);
    if (error) { iconeStatus('Échec : ' + error.message, 'var(--burgundy)'); return; }
    siteIconeUrl = src;
    applyIdentity();
    iconeStatus("✓ Le logo de l'entreprise sert maintenant d'icône.", 'var(--good)');
  });

  // Rétablir le losange doré d'origine
  document.getElementById('settings-icone-remove')?.addEventListener('click', async () => {
    iconeStatus('Retrait de l\'icône importée…');
    const { error } = await saveSiteContenu('icone_url', '');
    if (error) { iconeStatus('Échec : ' + error.message, 'var(--burgundy)'); return; }
    siteIconeUrl = '';
    applyIdentity();
    iconeStatus("✓ Icône d'origine rétablie.", 'var(--good)');
  });

  // Revenir au logo d'origine (celui embarqué dans le fichier)
  document.getElementById('settings-logo-remove')?.addEventListener('click', async () => {
    identityStatus('Retrait du logo importé…');
    const { error } = await saveSiteContenu('logo_url', '');
    if (error) { identityStatus('Échec : ' + error.message, 'var(--burgundy)'); return; }
    siteLogoUrl = '';
    applyIdentity();
    identityStatus("✓ Logo d'origine rétabli.", 'var(--good)');
  });

  // Sélection de la couleur d'accent
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });
