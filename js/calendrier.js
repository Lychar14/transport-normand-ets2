  // ---------- Calendrier ----------
  let allCalendarEvents = [];
  let selectedEventType = 'conge';
  const CAL_TYPE_LABEL = { conge: 'Congé', reunion: 'Réunion', rappel: 'Rappel', rdv: 'Rendez-vous' };
  const CAL_TYPE_COLOR = { conge: 'var(--gold)', reunion: '#7fb3d5', rappel: '#c98bd6', rdv: '#7fd6a0' };
  const MONTH_LABEL_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function toISODate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  async function loadCalendarEvents() {
    const { data } = await supabaseClient
      .from('calendar_events')
      .select('*')
      .order('date_debut', { ascending: true });
    allCalendarEvents = data || [];
  }

  // Rendez-vous confirmés (table appointment_slots) affichés comme événements en lecture seule dans le calendrier
  function appointmentVirtualEvents() {
    return allAppointmentSlots
      .filter(s => s.status === 'booked')
      .map(s => ({
        id: 'apt-' + s.id,
        type: 'rdv',
        title: 'Rendez-vous — ' + pseudoOf(nonPatronPartyOf(s)),
        date_debut: s.slot_date,
        date_fin: s.slot_date,
        created_by: nonPatronPartyOf(s),
        isAppointment: true
      }));
  }

  // Un événement "couvre" un jour s'il est compris entre date_debut et date_fin
  function eventsOnDay(isoDate) {
    return [...allCalendarEvents, ...appointmentVirtualEvents()].filter(ev => ev.date_debut <= isoDate && isoDate <= ev.date_fin);
  }

  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-month-title');
    if (!grid) return;

    const today = new Date();
    const todayISO = toISODate(today);
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexé

    if (title) title.textContent = `Calendrier — ${MONTH_LABEL_FR[month]} ${year}`;

    // Réunion et rappel réservés au patron : on masque ces pills pour les chauffeurs
    const isPatronNow = currentProfile && currentProfile.role === 'patron';
    document.querySelectorAll('#calendar-type-pills .radio-pill').forEach(pill => {
      if (pill.dataset.type !== 'conge') pill.style.display = isPatronNow ? '' : 'none';
    });

    // Repart des 7 en-têtes de jour (Lun...Dim), déjà dans le HTML — on les garde puis on ajoute les cellules
    grid.querySelectorAll('.cal-cell').forEach(c => c.remove());

    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // getDay() : 0 = dimanche ... 6 = samedi → on convertit pour que la semaine commence Lundi
    const startOffset = (firstOfMonth.getDay() + 6) % 7;

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-cell empty';
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const iso = toISODate(cellDate);
      const cell = document.createElement('div');
      cell.className = 'cal-cell' + (iso === todayISO ? ' today' : '');
      cell.style.position = 'relative';
      cell.textContent = String(day);

      const dayEvents = eventsOnDay(iso);
      if (dayEvents.length) {
        const dots = document.createElement('div');
        dots.className = 'cal-dots';
        const seenTypes = [...new Set(dayEvents.map(ev => ev.type))];
        seenTypes.forEach(type => {
          const dot = document.createElement('span');
          dot.style.background = CAL_TYPE_COLOR[type] || 'var(--gold)';
          dots.appendChild(dot);
        });
        cell.appendChild(dots);
        cell.title = dayEvents.map(ev => ev.isAppointment ? ev.title : `${CAL_TYPE_LABEL[ev.type]} — ${ev.title} (${pseudoOf(ev.created_by)})`).join('\n');
      }

      grid.appendChild(cell);
    }

    renderCalendarUpcoming(todayISO);
  }

  function formatFrShort(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function renderCalendarUpcoming(todayISO) {
    const list = document.getElementById('calendar-upcoming-list');
    if (!list || !currentProfile) return;

    const upcoming = [...allCalendarEvents, ...appointmentVirtualEvents()]
      .filter(ev => ev.date_fin >= todayISO)
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

    if (!upcoming.length) {
      list.innerHTML = '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucun événement pour l\'instant.</p>';
      return;
    }

    const isPatron = currentProfile.role === 'patron';
    list.innerHTML = upcoming.map(ev => {
      const canDelete = !ev.isAppointment && (isPatron || ev.created_by === currentProfile.id);
      const dateRange = ev.date_debut === ev.date_fin
        ? formatFrShort(ev.date_debut)
        : `${formatFrShort(ev.date_debut)} → ${formatFrShort(ev.date_fin)}`;
      return `
        <div class="movement-row" style="align-items:center;">
          <div>
            <div class="movement-label">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${CAL_TYPE_COLOR[ev.type] || 'var(--gold)'}; margin-right:6px;"></span>
              ${ev.title}
            </div>
            <div class="movement-sub">${ev.isAppointment ? dateRange : `${CAL_TYPE_LABEL[ev.type]} · ${dateRange} · ${pseudoOf(ev.created_by)}`}</div>
          </div>
          ${canDelete ? `<button class="btn-mini decline cal-delete-btn" data-event-id="${ev.id}">Supprimer</button>` : ''}
        </div>`;
    }).join('');

    list.querySelectorAll('.cal-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error } = await supabaseClient.from('calendar_events').delete().eq('id', btn.dataset.eventId);
        if (!error) {
          await loadCalendarEvents();
          renderCalendar();
        } else {
          btn.disabled = false;
        }
      });
    });
  }

  // Sélection du type d'événement (Congé / Réunion / Rappel)
  const calTypePills = document.getElementById('calendar-type-pills');
  if (calTypePills) {
    calTypePills.querySelectorAll('.radio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        // Réunion et rappel réservés au patron
        if (pill.dataset.type !== 'conge' && !(currentProfile && currentProfile.role === 'patron')) {
          setStatus('calendar-add-status', 'Seul le patron peut créer une réunion ou un rappel.', true);
          return;
        }
        selectedEventType = pill.dataset.type;
        calTypePills.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
      });
    });
  }

  const calendarAddBtn = document.getElementById('calendar-add-btn');
  if (calendarAddBtn) {
    calendarAddBtn.addEventListener('click', async () => {
      const titleVal = document.getElementById('calendar-title').value.trim();
      const dateDebut = document.getElementById('calendar-date-debut').value;
      let dateFin = document.getElementById('calendar-date-fin').value;

      if (!titleVal) { setStatus('calendar-add-status', 'Donne un titre à l\'événement.', true); return; }
      if (!dateDebut) { setStatus('calendar-add-status', 'Choisis une date de début.', true); return; }
      if (!dateFin) dateFin = dateDebut;
      if (dateFin < dateDebut) { setStatus('calendar-add-status', 'La date de fin doit être après la date de début.', true); return; }

      calendarAddBtn.disabled = true; calendarAddBtn.textContent = 'Ajout...';
      const { error } = await supabaseClient.from('calendar_events').insert({
        type: selectedEventType,
        title: titleVal,
        date_debut: dateDebut,
        date_fin: dateFin,
        created_by: currentProfile.id
      });
      calendarAddBtn.disabled = false; calendarAddBtn.textContent = 'Ajouter au calendrier';

      if (error) {
        setStatus('calendar-add-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('calendar-add-status', 'Événement ajouté au calendrier !', false);
      document.getElementById('calendar-title').value = '';
      document.getElementById('calendar-date-debut').value = '';
      document.getElementById('calendar-date-fin').value = '';
      await loadCalendarEvents();
      renderCalendar();
    });
  }
