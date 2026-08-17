  // ---------- Rendez-vous ----------
  let allAppointmentSlots = [];
  let selectedSlotId = null;

  async function loadAppointmentSlots() {
    const { data } = await supabaseClient
      .from('appointment_slots')
      .select('*')
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });
    allAppointmentSlots = data || [];
  }

  function formatSlot(slot) {
    const d = new Date(slot.slot_date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const timeStr = slot.slot_time.slice(0, 5);
    return `${dateStr} à ${timeStr}`;
  }

  function roleOf(id) {
    const p = allProfiles.find(p => p.id === id);
    return p ? p.role : null;
  }

  // Pour un créneau donné, renvoie l'id de "l'autre partie" par rapport à moi
  // (utile côté patron : celui des deux — créateur ou réservataire — qui n'est pas patron)
  function nonPatronPartyOf(slot) {
    return roleOf(slot.created_by) === 'patron' ? slot.booked_by : slot.created_by;
  }

  // ---- Côté employé : "Mes rendez-vous", "Prendre rendez-vous", "Mes créneaux proposés" ----
  function renderAppointments() {
    if (!currentProfile) return;

    // Mes rendez-vous confirmés : que je les aie réservés, ou que le patron ait réservé un créneau que j'ai proposé
    const mineList = document.getElementById('my-appointments-list');
    if (mineList) {
      const mine = allAppointmentSlots.filter(s =>
        s.status === 'booked' && (s.booked_by === currentProfile.id || s.created_by === currentProfile.id)
      );
      mineList.innerHTML = mine.length
        ? mine.map(s => `
          <div class="movement-row" style="align-items:center;">
            <div>
              <div class="movement-label">${formatSlot(s)}</div>
              <div class="movement-sub">${s.motif || 'Sans motif précisé'}</div>
            </div>
            <button class="btn-mini decline appt-cancel-btn" data-slot-id="${s.id}">Annuler</button>
          </div>`).join('')
        : '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucun rendez-vous pour l\'instant.</p>';

      mineList.querySelectorAll('.appt-cancel-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await supabaseClient.from('appointment_slots')
            .update({ status: 'open', booked_by: null, motif: null })
            .eq('id', btn.dataset.slotId);
          if (!error) {
            await loadAppointmentSlots();
            renderAppointments();
            if (currentProfile.role === 'patron') renderOfficeAppointments();
            renderCalendar();
          } else {
            btn.disabled = false;
          }
        });
      });
    }

    // Créneaux ouverts proposés par le patron → à réserver
    const pillsWrap = document.getElementById('appointment-slot-pills');
    if (pillsWrap) {
      const open = allAppointmentSlots.filter(s => s.status === 'open' && roleOf(s.created_by) === 'patron');
      if (!open.length) {
        pillsWrap.innerHTML = '<span class="radio-pill" style="color:var(--muted);">Aucun créneau proposé par le patron pour l\'instant.</span>';
        selectedSlotId = null;
      } else {
        if (!selectedSlotId || !open.some(s => s.id === selectedSlotId)) selectedSlotId = open[0].id;
        pillsWrap.innerHTML = open.map(s =>
          `<span class="radio-pill ${s.id === selectedSlotId ? 'selected' : ''}" data-slot-id="${s.id}">${formatSlot(s)}</span>`
        ).join('');
        pillsWrap.querySelectorAll('.radio-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            selectedSlotId = pill.dataset.slotId;
            pillsWrap.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
          });
        });
      }
    }

    // Mes créneaux proposés au patron, encore en attente
    const myOpenList = document.getElementById('my-open-slots-list');
    if (myOpenList) {
      const mineOpen = allAppointmentSlots.filter(s => s.status === 'open' && s.created_by === currentProfile.id);
      myOpenList.innerHTML = mineOpen.length
        ? mineOpen.map(s => `
          <div class="movement-row" style="align-items:center;">
            <div>
              <div class="movement-label">${formatSlot(s)}</div>
              <div class="movement-sub">${s.motif || 'Sans motif précisé'} · en attente du patron</div>
            </div>
            <button class="btn-mini decline my-slot-delete-btn" data-slot-id="${s.id}">Retirer</button>
          </div>`).join('')
        : '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucun créneau proposé pour l\'instant.</p>';

      myOpenList.querySelectorAll('.my-slot-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await supabaseClient.from('appointment_slots').delete().eq('id', btn.dataset.slotId);
          if (!error) {
            await loadAppointmentSlots();
            renderAppointments();
            if (currentProfile.role === 'patron') renderOfficeAppointments();
          } else {
            btn.disabled = false;
          }
        });
      });
    }
  }

  const appointmentBookBtn = document.getElementById('appointment-book-btn');
  if (appointmentBookBtn) {
    appointmentBookBtn.addEventListener('click', async () => {
      if (!selectedSlotId) { setStatus('appointment-book-status', 'Aucun créneau disponible à réserver.', true); return; }
      const motif = document.getElementById('appointment-motif').value.trim();

      appointmentBookBtn.disabled = true; appointmentBookBtn.textContent = 'Réservation...';
      const { error } = await supabaseClient.from('appointment_slots')
        .update({ status: 'booked', booked_by: currentProfile.id, motif: motif || null })
        .eq('id', selectedSlotId);
      appointmentBookBtn.disabled = false; appointmentBookBtn.textContent = 'Réserver ce créneau';

      if (error) {
        setStatus('appointment-book-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('appointment-book-status', 'Rendez-vous réservé !', false);
      document.getElementById('appointment-motif').value = '';
      selectedSlotId = null;
      await loadAppointmentSlots();
      renderAppointments();
      if (currentProfile.role === 'patron') renderOfficeAppointments();
      renderCalendar();
    });
  }

  // Proposer un créneau au patron (côté employé)
  const mySlotAddBtn = document.getElementById('my-slot-add-btn');
  if (mySlotAddBtn) {
    mySlotAddBtn.addEventListener('click', async () => {
      const slotDate = document.getElementById('my-slot-date').value;
      const slotTime = document.getElementById('my-slot-time').value;
      const motif = document.getElementById('my-slot-motif').value.trim();
      if (!slotDate || !slotTime) { setStatus('my-slot-add-status', 'Choisis une date et une heure.', true); return; }

      mySlotAddBtn.disabled = true; mySlotAddBtn.textContent = 'Ajout...';
      const { error } = await supabaseClient.from('appointment_slots').insert({
        slot_date: slotDate,
        slot_time: slotTime,
        motif: motif || null,
        created_by: currentProfile.id
      });
      mySlotAddBtn.disabled = false; mySlotAddBtn.textContent = 'Proposer ce créneau';

      if (error) {
        setStatus('my-slot-add-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('my-slot-add-status', 'Créneau proposé au patron !', false);
      document.getElementById('my-slot-date').value = '';
      document.getElementById('my-slot-time').value = '';
      document.getElementById('my-slot-motif').value = '';
      await loadAppointmentSlots();
      renderAppointments();
      if (currentProfile.role === 'patron') renderOfficeAppointments();
    });
  }

  // ---- Côté patron : Bureau du patron > Communication ----
  function renderOfficeAppointments() {
    // Créneaux proposés par le patron, encore ouverts
    const openList = document.getElementById('office-open-slots-list');
    if (openList) {
      const open = allAppointmentSlots.filter(s => s.status === 'open' && roleOf(s.created_by) === 'patron');
      openList.innerHTML = open.length
        ? open.map(s => `
          <div class="movement-row" style="align-items:center;">
            <div class="movement-label">${formatSlot(s)}</div>
            <button class="btn-mini decline slot-delete-btn" data-slot-id="${s.id}">Supprimer</button>
          </div>`).join('')
        : '<p style="color:var(--muted); font-size:0.85rem;">Aucun créneau pour l\'instant.</p>';

      openList.querySelectorAll('.slot-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await supabaseClient.from('appointment_slots').delete().eq('id', btn.dataset.slotId);
          if (!error) {
            await loadAppointmentSlots();
            renderAppointments();
            renderOfficeAppointments();
          } else {
            btn.disabled = false;
          }
        });
      });
    }

    // Créneaux proposés par l'équipe, en attente que le patron réserve
    const employeeSlotsList = document.getElementById('office-employee-slots-list');
    if (employeeSlotsList) {
      const proposed = allAppointmentSlots.filter(s => s.status === 'open' && roleOf(s.created_by) !== 'patron');
      employeeSlotsList.innerHTML = proposed.length
        ? proposed.map(s => `
          <div class="movement-row" style="align-items:center;">
            <div>
              <div class="movement-label">${pseudoOf(s.created_by)} — ${formatSlot(s)}</div>
              <div class="movement-sub">${s.motif || 'Sans motif précisé'}</div>
            </div>
            <button class="btn-mini accept slot-reserve-btn" data-slot-id="${s.id}">Réserver</button>
          </div>`).join('')
        : '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucun créneau proposé par l\'équipe pour l\'instant.</p>';

      employeeSlotsList.querySelectorAll('.slot-reserve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await supabaseClient.from('appointment_slots')
            .update({ status: 'booked', booked_by: currentProfile.id })
            .eq('id', btn.dataset.slotId);
          if (!error) {
            await loadAppointmentSlots();
            renderAppointments();
            renderOfficeAppointments();
            renderCalendar();
          } else {
            btn.disabled = false;
          }
        });
      });
    }

    // Rendez-vous confirmés (les deux sens confondus)
    const requestsList = document.getElementById('office-appointment-requests-list');
    if (requestsList) {
      const booked = allAppointmentSlots.filter(s => s.status === 'booked');
      requestsList.innerHTML = booked.length
        ? booked.map(s => `
          <div class="movement-row" style="align-items:center;">
            <div>
              <div class="movement-label">${pseudoOf(nonPatronPartyOf(s))} — ${formatSlot(s)}</div>
              <div class="movement-sub">${s.motif || 'Sans motif précisé'}</div>
            </div>
            <button class="btn-mini decline slot-free-btn" data-slot-id="${s.id}">Libérer</button>
          </div>`).join('')
        : '<p style="padding:0 1.4rem 1.5rem; color:var(--muted); font-size:0.85rem;">Aucune demande pour l\'instant.</p>';

      requestsList.querySelectorAll('.slot-free-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await supabaseClient.from('appointment_slots')
            .update({ status: 'open', booked_by: null, motif: null })
            .eq('id', btn.dataset.slotId);
          if (!error) {
            await loadAppointmentSlots();
            renderAppointments();
            renderOfficeAppointments();
            renderCalendar();
          } else {
            btn.disabled = false;
          }
        });
      });
    }
  }

  const slotAddBtn = document.getElementById('slot-add-btn');
  if (slotAddBtn) {
    slotAddBtn.addEventListener('click', async () => {
      const slotDate = document.getElementById('slot-date').value;
      const slotTime = document.getElementById('slot-time').value;
      if (!slotDate || !slotTime) { setStatus('slot-add-status', 'Choisis une date et une heure.', true); return; }

      slotAddBtn.disabled = true; slotAddBtn.textContent = 'Ajout...';
      const { error } = await supabaseClient.from('appointment_slots').insert({
        slot_date: slotDate,
        slot_time: slotTime,
        created_by: currentProfile.id
      });
      slotAddBtn.disabled = false; slotAddBtn.textContent = 'Ajouter le créneau';

      if (error) {
        setStatus('slot-add-status', 'Erreur : ' + error.message, true);
        return;
      }
      setStatus('slot-add-status', 'Créneau ajouté !', false);
      document.getElementById('slot-date').value = '';
      document.getElementById('slot-time').value = '';
      await loadAppointmentSlots();
      renderAppointments();
      renderOfficeAppointments();
    });
  }
