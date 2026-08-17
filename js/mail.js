  // ==========================================================
  // BOÎTE MAIL — messagerie interne réelle (table Supabase "mails")
  // ==========================================================
  async function loadMails() {
    const { data } = await supabaseClient.from('mails').select('*').order('created_at', { ascending: false });
    allMails = data || [];
  }

  function updateMailBadge() {
    const badge = document.getElementById('mail-alert-count');
    if (!badge || !currentProfile) return;
    const unread = allMails.filter(m => m.recipient_id === currentProfile.id && !m.lu).length;
    badge.textContent = String(unread);
  }

  // Widget "Mails reçus" du Tableau de bord — plus grand, met en évidence les non-lus
  function renderDashboardMails() {
    const list = document.getElementById('dashboard-mails-list');
    const countBadge = document.getElementById('dash-mail-count-badge');
    if (!list || !currentProfile) return;

    const received = allMails.filter(m => m.recipient_id === currentProfile.id);
    const unreadCount = received.filter(m => !m.lu).length;

    if (countBadge) {
      if (unreadCount > 0) {
        countBadge.style.display = 'inline';
        countBadge.textContent = unreadCount + ' non lu' + (unreadCount > 1 ? 's' : '');
      } else {
        countBadge.style.display = 'none';
      }
    }

    if (received.length === 0) {
      list.innerHTML = '<p style="padding:1rem 2rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucun mail reçu pour l\'instant.</p>';
      return;
    }

    const shown = received.slice(0, 8);
    list.innerHTML = shown.map(m => {
      const from = escapeHtml(pseudoOf(m.sender_id)) + (m.broadcast_id ? ' → toute l\'équipe' : '');
      const initial = (pseudoOf(m.sender_id) || '?').trim().charAt(0).toUpperCase();
      const unread = !m.lu;
      return `
      <div class="dash-mail-item ${unread ? 'unread' : ''}" data-dash-mail-id="${m.id}">
        <div class="dash-mail-avatar">${initial}</div>
        <div style="flex:1; min-width:0;">
          <div class="dash-mail-from-row">
            <span class="dash-mail-from">${from}</span>
            <span class="dash-mail-time">${timeAgo(m.created_at)}</span>
          </div>
          <div class="dash-mail-subject">${escapeHtml(m.subject || '(sans objet)')}</div>
          <div class="dash-mail-snippet">${escapeHtml(m.body || '')}</div>
        </div>
        ${unread ? '<span class="dash-mail-unread-dot"></span>' : ''}
      </div>`;
    }).join('');

    list.querySelectorAll('.dash-mail-item').forEach(item => {
      item.addEventListener('click', async () => {
        const mailId = item.dataset.dashMailId;
        const mail = allMails.find(m => m.id === mailId);
        currentMailTab = 'inbox';
        selectedMailId = mailId;
        if (mail && !mail.lu) {
          mail.lu = true;
          updateMailBadge();
          renderDashboardMails();
          await supabaseClient.from('mails').update({ lu: true }).eq('id', mail.id);
        }
        document.querySelector('.sidenav button[data-view="mail"]').click();
        const inboxPill = document.querySelector('#mail-inbox-tabs [data-mailtab="inbox"]');
        if (inboxPill) {
          document.querySelectorAll('#mail-inbox-tabs .radio-pill').forEach(p => p.classList.remove('selected'));
          inboxPill.classList.add('selected');
        }
        renderMailList();
        renderMailReading();
      });
    });
  }

  // Sélecteur de destinataire du compose : chaque membre (hors moi-même) + "Toute l'équipe"
  function renderMailRecipientPills() {
    const wrap = document.getElementById('mail-recipient-pills');
    if (!wrap || !currentProfile) return;
    const others = allProfiles.filter(p => p.id !== currentProfile.id);
    if (others.length === 0) {
      wrap.innerHTML = '<span class="radio-pill" style="color:var(--muted);">Aucun autre membre pour l\'instant</span>';
      return;
    }
    if (!selectedMailRecipient) selectedMailRecipient = 'all';
    const pills = [`<span class="radio-pill ${selectedMailRecipient === 'all' ? 'selected' : ''}" data-mail-recipient="all">Toute l'équipe</span>`]
      .concat(others.map(p => `<span class="radio-pill ${selectedMailRecipient === p.id ? 'selected' : ''}" data-mail-recipient="${p.id}">${escapeHtml(p.pseudo)}${p.role === 'patron' ? ' (patron)' : ''}</span>`));
    wrap.innerHTML = pills.join('');
    wrap.querySelectorAll('.radio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedMailRecipient = pill.dataset.mailRecipient;
        wrap.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
      });
    });
  }

  // Liste (Reçus / Envoyés) — les mails "à toute l'équipe" partagent un broadcast_id,
  // on ne les affiche qu'une seule fois côté "Envoyés"
  // Étiquette de regroupement par date pour la liste des mails ("Aujourd'hui", "Hier", jour de la semaine, "Semaine dernière", ou date)
  function mailDateGroupLabel(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays <= 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) {
      const label = d.toLocaleDateString('fr-FR', { weekday: 'long' });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (diffDays < 14) return "Semaine dernière";
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  function renderMailList() {
    const content = document.getElementById('mail-list-content');
    if (!content || !currentProfile) return;

    let items;
    if (currentMailTab === 'inbox') {
      items = allMails.filter(m => m.recipient_id === currentProfile.id);
    } else {
      const seen = new Set();
      items = allMails.filter(m => m.sender_id === currentProfile.id).filter(m => {
        const key = m.broadcast_id || m.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (mailUnreadOnly) {
      items = items.filter(m => !m.lu);
    }

    const query = mailSearchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter(m => {
        const otherPseudo = (currentMailTab === 'inbox' ? pseudoOf(m.sender_id) : pseudoOf(m.recipient_id)) || '';
        return (m.subject || '').toLowerCase().includes(query)
          || (m.body || '').toLowerCase().includes(query)
          || otherPseudo.toLowerCase().includes(query);
      });
    }

    if (items.length === 0) {
      const emptyReason = query ? 'Aucun mail ne correspond à ta recherche.'
        : (mailUnreadOnly ? 'Aucun mail non lu.' : `Aucun mail ${currentMailTab === 'inbox' ? 'reçu' : 'envoyé'} pour l'instant.`);
      content.innerHTML = `<p style="padding:1.5rem 1.4rem; color:var(--muted); font-size:0.85rem;">${emptyReason}</p>`;
    } else {
      let lastGroup = null;
      const rows = items.map(m => {
        const otherLabel = currentMailTab === 'inbox'
          ? (escapeHtml(pseudoOf(m.sender_id)) + (m.broadcast_id ? ' → toute l\'équipe' : ''))
          : (m.broadcast_id ? "Toute l'équipe" : escapeHtml(pseudoOf(m.recipient_id)));
        const unread = currentMailTab === 'inbox' && !m.lu;
        const group = mailDateGroupLabel(m.created_at);
        const groupHeader = group !== lastGroup ? `<div class="mail-date-group">${escapeHtml(group)}</div>` : '';
        lastGroup = group;
        return `${groupHeader}
        <div class="mail-item ${unread ? 'unread' : ''} ${m.id === selectedMailId ? 'active' : ''}" data-mail-id="${m.id}">
          <div class="mail-avatar"></div>
          <div style="flex:1; min-width:0;">
            <div class="mail-from-row">
              <span class="mail-from">${otherLabel}</span>
              <span class="mail-time">${timeAgo(m.created_at)}</span>
            </div>
            <div class="mail-subject">${escapeHtml(m.subject || '(sans objet)')}</div>
            <div class="mail-snippet">${escapeHtml(m.body || '')}</div>
          </div>
          ${unread ? '<span class="mail-unread-dot"></span>' : ''}
        </div>`;
      });
      content.innerHTML = rows.join('');
    }

    content.querySelectorAll('.mail-item').forEach(item => {
      item.addEventListener('click', async () => {
        selectedMailId = item.dataset.mailId;
        const mail = allMails.find(m => m.id === selectedMailId);
        if (mail && currentMailTab === 'inbox' && !mail.lu) {
          mail.lu = true;
          renderMailList();
          updateMailBadge();
          renderDashboardMails();
          await supabaseClient.from('mails').update({ lu: true }).eq('id', mail.id);
        }
        renderMailReading();
      });
    });
  }

  // Recherche dans la Boîte mail
  const mailSearchInput = document.getElementById('mail-search-input');
  if (mailSearchInput) {
    mailSearchInput.addEventListener('input', () => {
      mailSearchQuery = mailSearchInput.value;
      renderMailList();
    });
  }

  // Filtre "Tous / Non lus" de la Boîte mail
  const mailUnreadToggle = document.getElementById('mail-unread-toggle');
  if (mailUnreadToggle) {
    mailUnreadToggle.querySelectorAll('.radio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        mailUnreadToggle.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        mailUnreadOnly = pill.dataset.unreadfilter === 'unread';
        renderMailList();
      });
    });
  }

  function renderMailReading() {
    const panel = document.getElementById('mail-reading-panel');
    if (!panel || !currentProfile) return;
    const mail = allMails.find(m => m.id === selectedMailId);
    if (!mail) {
      panel.innerHTML = '<p style="padding:1.5rem 1.4rem; color:var(--muted); font-size:0.85rem;">Sélectionne un mail pour le lire.</p>';
      return;
    }
    const isReceived = mail.recipient_id === currentProfile.id;
    const otherPseudo = isReceived
      ? pseudoOf(mail.sender_id)
      : (mail.broadcast_id ? "Toute l'équipe" : pseudoOf(mail.recipient_id));

    panel.innerHTML = `
      <div class="mail-reading-head">
        <div>
          <div class="mail-reading-subject">${escapeHtml(mail.subject || '(sans objet)')}</div>
          <div class="mail-reading-meta">${isReceived ? 'De' : 'À'} ${escapeHtml(otherPseudo)} · ${timeAgo(mail.created_at)}</div>
        </div>
        <button class="btn-mini decline" id="mail-delete-btn">Supprimer</button>
      </div>
      <div class="mail-reading-body">${escapeHtml(mail.body || '').replace(/\n/g, '<br>')}</div>
      ${isReceived ? `<div class="mail-reply"><button class="btn-gold" id="mail-reply-btn">Répondre</button></div>` : ''}
    `;

    const deleteBtn = document.getElementById('mail-delete-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
      deleteBtn.disabled = true;
      await supabaseClient.from('mails').delete().eq('id', mail.id);
      selectedMailId = null;
      await loadMails();
      renderMailList();
      renderMailReading();
      updateMailBadge();
      renderDashboardMails();
    });

    const replyBtn = document.getElementById('mail-reply-btn');
    if (replyBtn) replyBtn.addEventListener('click', () => {
      selectedMailRecipient = mail.sender_id;
      renderMailRecipientPills();
      const subjectInput = document.getElementById('mail-compose-subject');
      subjectInput.value = /^Re\s*:/i.test(mail.subject || '') ? mail.subject : ('Re : ' + (mail.subject || ''));
      document.getElementById('mail-compose-body').focus();
      subjectInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Onglets Reçus / Envoyés
  const mailInboxTabs = document.getElementById('mail-inbox-tabs');
  if (mailInboxTabs) {
    mailInboxTabs.querySelectorAll('.radio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        currentMailTab = pill.dataset.mailtab;
        mailInboxTabs.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        selectedMailId = null;
        renderMailList();
        renderMailReading();
      });
    });
  }

  // Envoi d'un mail — à un membre précis, ou à toute l'équipe (une copie par destinataire)
  const mailSendBtn = document.getElementById('mail-send-btn');
  if (mailSendBtn) {
    mailSendBtn.addEventListener('click', async () => {
      const subject = document.getElementById('mail-compose-subject').value.trim();
      const body = document.getElementById('mail-compose-body').value.trim();

      if (!selectedMailRecipient) { setStatus('mail-send-status', 'Choisis un destinataire.', true); return; }
      if (!subject && !body) { setStatus('mail-send-status', 'Écris un objet ou un message.', true); return; }

      let rows;
      if (selectedMailRecipient === 'all') {
        const broadcastId = crypto.randomUUID();
        rows = allProfiles.filter(p => p.id !== currentProfile.id).map(p => ({
          sender_id: currentProfile.id, recipient_id: p.id, subject, body, broadcast_id: broadcastId
        }));
        if (rows.length === 0) { setStatus('mail-send-status', 'Aucun autre membre à qui envoyer.', true); return; }
      } else {
        rows = [{ sender_id: currentProfile.id, recipient_id: selectedMailRecipient, subject, body, broadcast_id: null }];
      }

      mailSendBtn.disabled = true; mailSendBtn.textContent = 'Envoi...';
      const { error } = await supabaseClient.from('mails').insert(rows);
      mailSendBtn.disabled = false; mailSendBtn.textContent = 'Envoyer';

      if (error) { setStatus('mail-send-status', 'Erreur : ' + error.message, true); return; }

      setStatus('mail-send-status', 'Mail envoyé !', false);
      document.getElementById('mail-compose-subject').value = '';
      document.getElementById('mail-compose-body').value = '';
      await loadMails();
      renderMailList();
      updateMailBadge();
      renderDashboardMails();
    });
  }
