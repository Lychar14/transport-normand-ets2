  // ==========================================================
  // TRÉSORERIE — compte entreprise + opérations joueurs
  // ==========================================================
  let allTransactions = [];

  async function loadTransactions() {
    const { data } = await supabaseClient
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    allTransactions = data || [];
  }

  // Compte entreprise = mouvements sans joueur associé (type 'entreprise', ou anciens mouvements sans chauffeur_id)
  function entrepriseTx() {
    return allTransactions.filter(tx => !tx.chauffeur_id && tx.type !== 'operation');
  }
  // Opérations joueurs = mouvements liés à un joueur (paie, remboursements, primes...)
  function operationsTx() {
    return allTransactions.filter(tx => tx.chauffeur_id);
  }

  function formatMontant(m) {
    const n = Number(m);
    const sign = n >= 0 ? '+' : '';
    return sign + n.toLocaleString('fr-FR');
  }

  function movementRowHtml(tx) {
    const cls = Number(tx.montant) >= 0 ? 'credit' : 'debit';
    const sousLigne = tx.sous_libelle
      ? `<div class="movement-sub">${tx.sous_libelle}</div>`
      : `<div class="movement-sub">${timeAgo(tx.created_at)}</div>`;
    return `
      <div class="movement-row">
        <div><div class="movement-label">${tx.libelle}</div>${sousLigne}</div>
        <span class="mono ${cls}">${formatMontant(tx.montant)}</span>
      </div>`;
  }

  function operationRowHtml(tx) {
    const cls = Number(tx.montant) >= 0 ? 'credit' : 'debit';
    return `
      <div class="movement-row">
        <div><div class="movement-label">${pseudoOf(tx.chauffeur_id)} — ${tx.libelle}</div><div class="movement-sub">${tx.sous_libelle || timeAgo(tx.created_at)}</div></div>
        <span class="mono ${cls}">${formatMontant(tx.montant)}</span>
      </div>`;
  }

  function renderOdometer(containerId, value) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const n = Math.round(Number(value) || 0);
    const formatted = n.toLocaleString('fr-FR');
    el.innerHTML = [...formatted].map(ch => `<span>${ch === ' ' || ch === '\u202f' ? '&nbsp;' : ch}</span>`).join('');
  }

  function renderTransactions() {
    const compteEntreprise = entrepriseTx();
    const operations = operationsTx();

    // Onglet Trésorerie — mouvements du compte entreprise
    const list = document.getElementById('transactions-list');
    if (list) {
      list.innerHTML = compteEntreprise.length
        ? compteEntreprise.map(movementRowHtml).join('')
        : '<p style="color:var(--muted); font-size:0.85rem;">Aucun mouvement enregistré pour l\'instant.</p>';
    }

    // Onglet Trésorerie — historique des opérations joueurs
    const opsList = document.getElementById('operations-list');
    if (opsList) {
      opsList.innerHTML = operations.length
        ? operations.map(operationRowHtml).join('')
        : '<p style="color:var(--muted); font-size:0.85rem;">Aucune opération enregistrée pour l\'instant.</p>';
    }

    // Dashboard — aperçu des 3 dernières opérations du compte perso du joueur
    // connecté (paie, remboursements, primes) — jamais les mouvements de la
    // caisse commune, qui restent privés au Bureau du patron > Trésorerie
    const dashList = document.getElementById('dashboard-movements');
    if (dashList && currentProfile) {
      const mesOperations = operations.filter(tx => tx.chauffeur_id === currentProfile.id).slice(0, 3);
      dashList.innerHTML = mesOperations.length
        ? mesOperations.map(movementRowHtml).join('')
        : '<p style="color:var(--muted); font-size:0.85rem;">Aucun mouvement pour l\'instant.</p>';
    }

    // Bureau du patron — Compte entreprise (uniquement les mouvements entreprise, pas les opérations joueurs)
    const totalEntreprise = compteEntreprise.reduce((sum, tx) => sum + Number(tx.montant), 0);
    const caisseEl = document.getElementById('office-stat-caisse');
    if (caisseEl) caisseEl.textContent = totalEntreprise.toLocaleString('fr-FR');
    const tresorerieEl = document.getElementById('tresorerie-solde-entreprise');
    if (tresorerieEl) tresorerieEl.textContent = totalEntreprise.toLocaleString('fr-FR');

    // Dashboard — solde personnel réel du joueur connecté (somme de ses opérations)
    if (currentProfile) {
      const soldePerso = operations
        .filter(tx => tx.chauffeur_id === currentProfile.id)
        .reduce((sum, tx) => sum + Number(tx.montant), 0);
      renderOdometer('dashboard-solde-odometer', soldePerso);
    }

    // Export comptable + clôture mensuelle (Trésorerie, patron)
    renderComptaMensuelle();
  }

  // ==========================================================
  // COMPTABILITÉ — export CSV mensuel + clôture du compte entreprise
  // ==========================================================
  const MOIS_COMPTA_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  // Clé de mois locale "AAAA-MM" à partir de la date d'écriture
  function moisCleDe(tx) {
    const d = new Date(tx.created_at);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function moisLibelle(cle) {
    if (!cle) return '';
    const [a, m] = cle.split('-');
    return MOIS_COMPTA_FR[Number(m) - 1] + ' ' + a;
  }
  // Dernier instant du mois (pour dater la ligne de report à nouveau)
  function finDeMois(cle) {
    const [a, m] = cle.split('-').map(Number);
    return new Date(a, m, 0, 23, 59, 59);
  }
  function dateFR(dateStr) {
    const d = new Date(dateStr);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  function heureFR(dateStr) {
    const d = new Date(dateStr);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function euros(n) {
    return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Mouvements du compte entreprise triés du plus ancien au plus récent
  function entrepriseTxChrono() {
    return entrepriseTx().slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  // Liste des mois contenant au moins un mouvement, du plus récent au plus ancien
  function moisDisponibles() {
    const map = new Map();
    entrepriseTxChrono().forEach(tx => {
      const cle = moisCleDe(tx);
      map.set(cle, (map.get(cle) || 0) + 1);
    });
    return [...map.entries()].map(([cle, n]) => ({ cle, n })).sort((a, b) => b.cle.localeCompare(a.cle));
  }

  function remplirSelectMois(selectId, mois) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const choixActuel = select.value;
    select.innerHTML = mois.length
      ? mois.map(m => `<option value="${m.cle}">${moisLibelle(m.cle)} (${m.n} mouvement${m.n > 1 ? 's' : ''})</option>`).join('')
      : '<option value="">Aucun mouvement</option>';
    if (mois.some(m => m.cle === choixActuel)) select.value = choixActuel;
  }

  function renderComptaMensuelle() {
    const mois = moisDisponibles();
    remplirSelectMois('compta-mois-select', mois);
    remplirSelectMois('cloture-mois-select', mois);
    renderComptaResume();
  }

  // Récapitulatif chiffré du mois sélectionné, affiché sous le sélecteur d'export
  function renderComptaResume() {
    const el = document.getElementById('compta-mois-resume');
    const select = document.getElementById('compta-mois-select');
    if (!el || !select) return;
    const cle = select.value;
    if (!cle) { el.textContent = 'Aucun mouvement à exporter pour l\'instant.'; return; }

    const chrono = entrepriseTxChrono();
    const ouverture = chrono.filter(tx => moisCleDe(tx) < cle).reduce((s, tx) => s + Number(tx.montant), 0);
    const duMois = chrono.filter(tx => moisCleDe(tx) === cle);
    const credits = duMois.filter(tx => Number(tx.montant) >= 0).reduce((s, tx) => s + Number(tx.montant), 0);
    const debits = duMois.filter(tx => Number(tx.montant) < 0).reduce((s, tx) => s + Number(tx.montant), 0);

    el.innerHTML =
      `<strong style="color:var(--text);">${moisLibelle(cle)}</strong> — ouverture ${euros(ouverture)} € · ` +
      `<span style="color:var(--good);">crédits +${euros(credits)} €</span> · ` +
      `<span style="color:var(--burgundy);">débits ${euros(debits)} €</span> · ` +
      `clôture <strong style="color:var(--gold);">${euros(ouverture + credits + debits)} €</strong>`;
  }

  // ---------- Génération du fichier CSV ----------
  function csvChamp(valeur) {
    const s = String(valeur === null || valeur === undefined ? '' : valeur);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function categorieTx(tx) {
    if (tx.operation_ref) return 'Opération joueur';
    if (tx.mission_id) return 'Revenu de mission';
    return 'Mouvement entreprise';
  }

  function construireCsv(lignes, soldeOuverture, titreOuverture) {
    const entetes = ['Date', 'Heure', 'Libellé', 'Détail', 'Catégorie', 'Débit (€)', 'Crédit (€)', 'Solde (€)'];
    const out = [entetes.map(csvChamp).join(';')];

    let solde = soldeOuverture;
    out.push(['', '', titreOuverture, '', '', '', '', euros(solde)].map(csvChamp).join(';'));

    lignes.forEach(tx => {
      const montant = Number(tx.montant);
      solde += montant;
      out.push([
        dateFR(tx.created_at),
        heureFR(tx.created_at),
        tx.libelle || '',
        tx.sous_libelle || '',
        categorieTx(tx),
        montant < 0 ? euros(Math.abs(montant)) : '',
        montant >= 0 ? euros(montant) : '',
        euros(solde)
      ].map(csvChamp).join(';'));
    });

    const credits = lignes.filter(tx => Number(tx.montant) >= 0).reduce((s, tx) => s + Number(tx.montant), 0);
    const debits = lignes.filter(tx => Number(tx.montant) < 0).reduce((s, tx) => s + Math.abs(Number(tx.montant)), 0);
    out.push('');
    out.push(['', '', 'TOTAUX', '', '', euros(debits), euros(credits), ''].map(csvChamp).join(';'));
    out.push(['', '', 'SOLDE DE CLÔTURE', '', '', '', '', euros(solde)].map(csvChamp).join(';'));
    return out.join('\r\n');
  }

  // Le BOM en tête permet à Excel d'afficher correctement les accents
  function telechargerCsv(nomFichier, contenu) {
    const blob = new Blob(['\ufeff' + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const comptaSelect = document.getElementById('compta-mois-select');
  if (comptaSelect) comptaSelect.addEventListener('change', renderComptaResume);

  const comptaExportMoisBtn = document.getElementById('compta-export-mois-btn');
  if (comptaExportMoisBtn) {
    comptaExportMoisBtn.addEventListener('click', () => {
      const cle = document.getElementById('compta-mois-select').value;
      if (!cle) return;
      const chrono = entrepriseTxChrono();
      const ouverture = chrono.filter(tx => moisCleDe(tx) < cle).reduce((s, tx) => s + Number(tx.montant), 0);
      const duMois = chrono.filter(tx => moisCleDe(tx) === cle);
      const csv = construireCsv(duMois, ouverture, 'Solde à l\'ouverture du mois');
      telechargerCsv(`compte-entreprise-${cle}.csv`, csv);
    });
  }

  const comptaExportToutBtn = document.getElementById('compta-export-tout-btn');
  if (comptaExportToutBtn) {
    comptaExportToutBtn.addEventListener('click', () => {
      const chrono = entrepriseTxChrono();
      if (!chrono.length) return;
      const csv = construireCsv(chrono, 0, 'Solde de départ');
      telechargerCsv('compte-entreprise-historique-complet.csv', csv);
    });
  }

  // ---------- Clôture mensuelle ----------
  const clotureBtn = document.getElementById('cloture-btn');
  if (clotureBtn) {
    clotureBtn.addEventListener('click', async () => {
      if (!currentProfile || currentProfile.role !== 'patron') return;
      const cle = document.getElementById('cloture-mois-select').value;
      if (!cle) { setStatus('cloture-status', 'Aucun mouvement à clôturer.', true); return; }

      const garderReport = document.getElementById('cloture-report').checked;
      // On efface tout ce qui est antérieur ou égal au mois choisi
      const cibles = entrepriseTxChrono().filter(tx => moisCleDe(tx) <= cle);
      const ids = cibles.map(tx => tx.id);
      const solde = cibles.reduce((s, tx) => s + Number(tx.montant), 0);
      const fin = finDeMois(cle);

      if (!ids.length) { setStatus('cloture-status', 'Aucun mouvement à clôturer.', true); return; }

      if (!confirm(
        `Clôturer ${moisLibelle(cle)} ?\n\n` +
        `${ids.length} mouvement${ids.length > 1 ? 's' : ''} du compte entreprise ${ids.length > 1 ? 'seront supprimés' : 'sera supprimé'} ` +
        `(tout ce qui est enregistré jusqu'au ${dateFR(fin)} inclus).\n` +
        (garderReport
          ? `Une ligne « Report à nouveau » de ${euros(solde)} € sera recréée pour conserver l'argent en caisse.\n`
          : `Le compte entreprise repartira à 0 €.\n`) +
        `\nPense à exporter le CSV avant : cette suppression est irréversible.`
      )) return;

      clotureBtn.disabled = true; clotureBtn.textContent = 'Clôture...';

      const suppression = await psSupprimer(supabaseClient.from('transactions').delete().in('id', ids));

      if (suppression.error) {
        clotureBtn.disabled = false; clotureBtn.textContent = 'Clôturer le mois';
        setStatus('cloture-status', 'Erreur : ' + suppression.error.message, true);
        return;
      }
      if (suppression.n === 0) {
        // Aucune erreur mais rien de supprimé = policy RLS DELETE manquante
        clotureBtn.disabled = false; clotureBtn.textContent = 'Clôturer le mois';
        setStatus('cloture-status',
          'Rien n\'a été supprimé : la base a refusé la suppression sans message d\'erreur. ' +
          'Exécute le script 23-policies-suppression.sql dans Supabase, puis réessaie.', true);
        return;
      }

      // Ligne de report à nouveau, datée du dernier jour du mois clôturé
      let messageReport = '';
      if (garderReport && solde !== 0) {
        const ligne = {
          libelle: `Report à nouveau — solde au ${dateFR(fin)}`,
          sous_libelle: `Clôture de ${moisLibelle(cle)}`,
          montant: solde,
          type: 'entreprise',
          created_by: currentProfile.id
        };
        let res = await supabaseClient.from('transactions').insert([{ ...ligne, created_at: fin.toISOString() }]);
        // Si la colonne created_at n'accepte pas d'être forcée, on réessaie sans
        if (res.error) res = await supabaseClient.from('transactions').insert([ligne]);
        messageReport = res.error
          ? ` Attention : la ligne de report n'a pas pu être créée (${res.error.message}).`
          : ` Report à nouveau de ${euros(solde)} € recréé.`;
      }

      clotureBtn.disabled = false; clotureBtn.textContent = 'Clôturer le mois';

      await loadTransactions();
      renderTransactions();
      renderOfficeOverview();
      renderDashboardStats();

      setStatus('cloture-status',
        `${moisLibelle(cle)} clôturé — ${suppression.n} mouvement${suppression.n > 1 ? 's' : ''} supprimé${suppression.n > 1 ? 's' : ''}.` + messageReport,
        false);
    });
  }

  // ---------- Créer une opération joueur (paie, remboursement, prime...) ----------
  function populateOperationMemberSelect() {
    const select = document.getElementById('op-member-select');
    if (!select) return;
    select.innerHTML = allProfiles.map(p => `<option value="${p.id}">${p.pseudo}</option>`).join('');
  }

  const opSubmitBtn = document.getElementById('op-submit-btn');
  if (opSubmitBtn) {
    opSubmitBtn.addEventListener('click', async () => {
      const chauffeurId = document.getElementById('op-member-select').value;
      const typeLabel = document.getElementById('op-type-select').value;
      const montantRaw = document.getElementById('op-montant').value;
      const motif = document.getElementById('op-motif').value.trim();
      const estDebit = document.getElementById('op-debit-joueur').checked;

      if (!chauffeurId) { setStatus('op-submit-status', 'Choisis un joueur.', true); return; }
      if (montantRaw === '' || isNaN(Number(montantRaw)) || Number(montantRaw) <= 0) { setStatus('op-submit-status', 'Le montant doit être un nombre positif.', true); return; }
      if (!motif) { setStatus('op-submit-status', 'Indique un motif.', true); return; }

      const montant = Math.abs(Number(montantRaw));
      const signeJoueur = estDebit ? -1 : 1;
      const opRef = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

      opSubmitBtn.disabled = true; opSubmitBtn.textContent = 'Enregistrement...';
      const { error } = await supabaseClient.from('transactions').insert([
        {
          libelle: motif,
          sous_libelle: `${typeLabel} — ${estDebit ? 'Débit' : 'Crédit'} ${pseudoOf(chauffeurId)}`,
          montant: montant * -signeJoueur,
          type: 'entreprise',
          operation_ref: opRef,
          created_by: currentProfile.id
        },
        {
          libelle: `${typeLabel} — ${motif}`,
          sous_libelle: estDebit ? 'Débit' : 'Crédit',
          montant: montant * signeJoueur,
          type: 'operation',
          chauffeur_id: chauffeurId,
          operation_ref: opRef,
          created_by: currentProfile.id
        }
      ]);
      opSubmitBtn.disabled = false; opSubmitBtn.textContent = 'Valider l\'opération';

      if (error) {
        setStatus('op-submit-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('op-submit-status', 'Opération enregistrée !', false);
      document.getElementById('op-montant').value = '';
      document.getElementById('op-motif').value = '';
      document.getElementById('op-debit-joueur').checked = false;
      await loadTransactions();
      renderTransactions();
      renderOfficeOverview();
    });
  }

  const txSubmitBtn = document.getElementById('tx-submit-btn');
  if (txSubmitBtn) {
    txSubmitBtn.addEventListener('click', async () => {
      const libelle = document.getElementById('tx-libelle').value.trim();
      const sousLibelle = document.getElementById('tx-sous-libelle').value.trim();
      const montantRaw = document.getElementById('tx-montant').value;

      if (!libelle) { setStatus('tx-submit-status', 'Le libellé est obligatoire.', true); return; }
      if (montantRaw === '' || isNaN(Number(montantRaw))) { setStatus('tx-submit-status', 'Le montant doit être un nombre (ex : -350 ou 800).', true); return; }

      txSubmitBtn.disabled = true; txSubmitBtn.textContent = 'Enregistrement...';
      const { error } = await supabaseClient.from('transactions').insert({
        libelle,
        sous_libelle: sousLibelle || null,
        montant: Number(montantRaw),
        created_by: currentProfile.id
      });
      txSubmitBtn.disabled = false; txSubmitBtn.textContent = 'Enregistrer';

      if (error) {
        setStatus('tx-submit-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('tx-submit-status', 'Mouvement enregistré !', false);
      document.getElementById('tx-libelle').value = '';
      document.getElementById('tx-sous-libelle').value = '';
      document.getElementById('tx-montant').value = '';
      await loadTransactions();
      renderTransactions();
    });
  }
