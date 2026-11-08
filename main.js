/* Shrishti Gardens — Phase 1 prototype interactions (no backend) */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  window.addEventListener('load', () => requestAnimationFrame(() => document.body.classList.add('is-loaded')));
  setTimeout(() => document.body.classList.add('is-loaded'), 1500); // safety

  /* ---------- Sticky header ---------- */
  const header = $('#siteHeader');
  const hero = $('#home');
  const onScroll = () => {
    const past = window.scrollY > hero.offsetHeight * 0.6;
    header.classList.toggle('is-fixed', past);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.main-nav ul a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 90}ms`; revealIO.observe(el); });

  /* ---------- Gentle parallax ---------- */
  if (!reduceMotion) {
    const layers = $$('.parallax');
    let ticking = false;
    const update = () => {
      layers.forEach(l => {
        const r = l.parentElement.getBoundingClientRect();
        const speed = parseFloat(l.dataset.speed || '0.1');
        const offset = (r.top + r.height / 2 - innerHeight / 2) * -speed;
        l.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (toast.hidden = true), 4200);
  };
  $$('[data-toast]').forEach(b => b.addEventListener('click', () => showToast(b.dataset.toast)));

  /* ---------- Date helpers ---------- */
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = iso(new Date());

  // Blackout periods (inclusive). Informational only here — enforcement belongs to the backend.
  const BLACKOUTS = [
    ['Christmas & New Year', '2026-12-23', '2027-01-03'],
    ['Pongal', '2027-01-14', '2027-01-17'],
    ['Republic Day', '2027-01-23', '2027-01-26'],
    ['Holi / Good Friday / Easter', '2027-03-25', '2027-03-28'],
    ['Summer Peak / Flower Show', '2027-04-10', '2027-05-31'],
  ];
  // Stay occupies [in, out). Blackout occupies [start, end + 1 day).
  const blackoutHit = (ci, co) => BLACKOUTS.find(([, s, e]) => ci < addDays(e, 1) && co > s);
  // Dates without configured availability (1–9 Apr 2027, 1 Jun 2027 onwards)
  const unconfigured = (ci, co) => (ci < '2027-04-10' && co > '2027-04-01') || co > '2027-06-01';

  /* ---------- Hero enquiry (custom calendar + guest picker) ---------- */
  const hfIn = $('#hfIn'), hfOut = $('#hfOut'), hfAdults = $('#hfAdults'), hfKids = $('#hfKids'), hfNote = $('#heroFormNote');
  const bIn = $('#bIn'), bOut = $('#bOut'), bAdults = $('#bAdults'), bKids = $('#bKids'), bCat = $('#bCat');

  const heroCal = new SG.DateRangePicker({
    inInput: hfIn, outInput: hfOut, inBtn: $('#hfInBtn'), outBtn: $('#hfOutBtn'),
    anchor: $('#heroForm'), blackouts: BLACKOUTS,
  });
  const bookCal = new SG.DateRangePicker({
    inInput: bIn, outInput: bOut, inBtn: $('#bInBtn'), outBtn: $('#bOutBtn'),
    anchor: $('#bDates'), blackouts: BLACKOUTS,
  });
  new SG.GuestPicker({ button: $('#hfGuestsBtn'), anchor: $('#hfGuestsBtn').closest('.hf-field'), adultsInput: hfAdults, kidsInput: hfKids });

  hfOut.addEventListener('change', () => { if (hfOut.value) { hfNote.classList.remove('is-error'); hfNote.textContent = 'Booking enquiry only — your stay is confirmed by our team.'; } });

  $('#heroForm').addEventListener('submit', e => {
    e.preventDefault();
    hfNote.classList.remove('is-error');
    if (hfIn.value && !hfOut.value) {
      hfNote.textContent = 'Please choose a check-out date.'; hfNote.classList.add('is-error'); heroCal.open('out'); return;
    }
    bookCal.set(hfIn.value, hfOut.value);
    bAdults.value = String(Math.min(12, Number(hfAdults.value) || 2));
    bKids.value = String(Math.min(6, Number(hfKids.value) || 0));
    bKids.dispatchEvent(new Event('change'));
    hfNote.textContent = 'Booking enquiry only — your stay is confirmed by our team.';
    checkDates();
    openEnquiry();
  });

  $$('[data-enquire]').forEach(b => b.addEventListener('click', () => { bCat.value = b.dataset.enquire; openEnquiry(); }));

  /* ---------- Booking enquiry form ---------- */
  const kidAges = $('#kidAges');
  const renderKids = () => {
    const n = Number(bKids.value);
    const prev = $$('select', kidAges).map(s => s.value);
    kidAges.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const id = `kAge${i}`;
      const wrap = document.createElement('div');
      wrap.className = 'bf-field';
      // Age bands follow the tariff: 0–5 free, 6–12 ₹900 / night, 13+ ₹1,800 / night
      wrap.innerHTML = `<label for="${id}">Child ${i + 1} age *</label><select id="${id}" required>
        <option value="">Select age group</option>
        <option value="0-5">0 – 5 years · Free</option>
        <option value="6-12">6 – 12 years · ₹900 / night</option>
        <option value="13+">13 years &amp; above · ₹1,800 / night</option></select>`;
      kidAges.appendChild(wrap);
      if (prev[i]) $('select', wrap).value = prev[i];
    }
  };
  bKids.addEventListener('change', renderKids);

  const alertBox = $('#bfAlert');
  const showAlert = (msg, info = false) => { alertBox.textContent = msg; alertBox.hidden = !msg; alertBox.classList.toggle('is-info', info); };

  const checkDates = () => {
    if (!bIn.value || !bOut.value || bOut.value <= bIn.value) { showAlert(''); return true; }
    const hit = blackoutHit(bIn.value, bOut.value);
    if (hit) { showAlert(`These dates overlap the ${hit[0]} closure (${fmt(hit[1])} – ${fmt(hit[2])}). Please choose other dates.`); return false; }
    if (unconfigured(bIn.value, bOut.value)) { showAlert('Availability for part of these dates is still being set by our team. You can still send an enquiry and we will confirm.', true); return true; }
    showAlert(''); return true;
  };
  const fmt = s => parse(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  [bIn, bOut].forEach(el => el.addEventListener('change', checkDates));

  /* ---------- Estimate (prototype; the backend will own pricing) ---------- */
  const TARIFF = 5500, GST = 0.05, EXTRA_ADULT = 1800;
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const nightsOf = () => (bIn.value && bOut.value && bOut.value > bIn.value) ? Math.round((parse(bOut.value) - parse(bIn.value)) / 864e5) : 0;
  const CHILD_RATE = { '0-5': 0, '6-12': 900, '13+': EXTRA_ADULT };
  const childRate = band => CHILD_RATE[band] ?? 0;
  const estimate = () => {
    const n = nightsOf(), rooms = Number($('#bRooms').value) || 1;
    const adults = Number(bAdults.value) || 1;
    const ages = $$('select', kidAges).map(x => x.value === '' ? null : x.value);
    // Two guests per room are included. Included places go to adults first, then to the children
    // with the highest charge, so the estimate never overstates. Final pricing is confirmed by the team.
    let included = rooms * 2;
    const useA = Math.min(adults, included); included -= useA;
    let extra = (adults - useA) * EXTRA_ADULT;
    const kidRates = ages.map(a => (a == null ? 0 : childRate(a))).sort((x, y) => y - x);
    kidRates.forEach(r => { if (included > 0) included--; else extra += r; });
    const room = TARIFF * rooms * n, gst = room * GST, extras = extra * n;
    return { n, rooms, room, gst, extras, total: room + gst + extras, unknownAge: ages.some(a => a == null) };
  };

  /* ---------- Stay folio (left panel of the pop-up) ---------- */
  const ROOM_MEDIA = {
    'Suite with Balcony': 'assets/photos/room-balcony-800.jpg',
    'Standard Suite': 'assets/room-hero.jpg',
    'Garden Suite': 'assets/photos/room-garden-800.jpg',
    'Sky-View Suite': 'assets/photos/room-sky-view-800.jpg',
  };
  const fmtLong = s => parse(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const updateFolio = () => {
    const cat = bCat.value, e = estimate();
    $('#folioTitle').textContent = cat || 'Your stay at Shrishti Gardens';
    $('#folioDates').textContent = e.n ? `${fmtLong(bIn.value)} to ${fmtLong(bOut.value)} (${e.n} night${e.n > 1 ? 's' : ''})` : 'Add your dates to see an estimate';
    const media = $('#folioMedia'), src = ROOM_MEDIA[cat] || (cat ? null : 'assets/photos/about-aerial-800.jpg');
    const want = src ? `img:${src}` : `ph:${cat}`;
    if (media.dataset.k !== want) {
      media.dataset.k = want;
      media.innerHTML = src
        ? `<img src="${src}" alt="${cat ? `${cat} at Shrishti Gardens` : 'Shrishti Gardens'}" loading="lazy">${cat === 'Standard Suite' ? '<figcaption>Sample image</figcaption>' : ''}`
        : `<div class="ph"><span class="ph__tag">${cat} photograph to be supplied</span></div>`;
    }
    $('#fNights').textContent = e.n ? `${e.n} Night${e.n > 1 ? 's' : ''}` : '—';
    $('#fRooms').textContent = `${e.rooms} Room${e.rooms > 1 ? 's' : ''}`;
    $('#fExtraRow').hidden = !e.extras;
    $('#fExtra').textContent = e.extras ? `${inr(e.extras)}` : '';
    $('#fGst').textContent = e.n ? inr(e.gst) : '—';
    $('#fTotal').textContent = e.n ? inr(e.total) : '—';
  };
  $('#bookForm').addEventListener('change', updateFolio);
  // Clear an error highlight as soon as that field is filled in
  const clearInvalid = e => {
    const f = e.target.closest && e.target.closest('.bf-field');
    if (f && f.classList.contains('is-invalid')) {
      const inp = f.querySelector('input, select, textarea');
      if (inp && inp.value.trim()) f.classList.remove('is-invalid');
    }
    if (!$('#bookForm .is-invalid') && alertBox.textContent.startsWith('Please complete')) showAlert('');
  };
  $('#bookForm').addEventListener('input', clearInvalid);
  $('#bookForm').addEventListener('change', clearInvalid);
  $('#bookForm').addEventListener('input', updateFolio);

  /* ---------- Pop-up open / close ---------- */
  const enq = $('#enq'), panel = $('.enq__panel', enq), viewForm = $('#enqForm'), viewDone = $('#enqDone');
  let enqReturn = null;
  const resetForm = () => {
    viewDone.hidden = true; $('#enqPay').hidden = true; viewForm.hidden = false;
    enq.classList.remove('is-done'); currentRef = null;
  };
  function openEnquiry() {
    if (enq.classList.contains('is-done')) { // start a fresh enquiry after a completed one
      $('#bookForm').reset(); bookCal.set(hfIn.value, hfOut.value); renderKids(); resetForm();
    }
    enqReturn = document.activeElement;
    updateFolio();
    enq.hidden = false; document.body.classList.add('enq-lock');
    requestAnimationFrame(() => enq.classList.add('is-open'));
    panel.scrollTop = 0;
    setTimeout(() => { const t = !bIn.value ? $('#bInBtn') : $('#bName'); t.focus({ preventScroll: true }); }, reduceMotion ? 0 : 280);
  }
  function closeEnquiry() {
    if (enq.hidden) return;
    document.querySelectorAll('.sg-pop.is-open').forEach(p => p.querySelector('.sg-close')?.click());
    enq.classList.remove('is-open'); document.body.classList.remove('enq-lock');
    setTimeout(() => { enq.hidden = true; }, reduceMotion ? 0 : 280);
    enqReturn && enqReturn.focus && enqReturn.focus({ preventScroll: true });
  }
  window.openEnquiry = openEnquiry;
  $$('[data-open-enquiry]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); if (!menu.hidden) setMenu(false); openEnquiry(); }));
  $$('[data-close-enquiry]', enq).forEach(b => b.addEventListener('click', closeEnquiry));
  // Esc: let an open calendar / guest pop-over close first (capture phase runs before picker.js)
  document.addEventListener('keydown', e => {
    if (enq.hidden) return;
    if (e.key === 'Escape') { if (document.querySelector('.sg-pop.is-open')) return; e.preventDefault(); closeEnquiry(); }
    if (e.key === 'Tab') { // keep focus inside the pop-up
      if (document.querySelector('.sg-pop.is-open')?.contains(document.activeElement)) return;
      const f = $$('button, a[href], input:not([type="hidden"]), select, textarea, [tabindex="0"]', panel).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  /* ---------- Booking records (prototype store) ----------
     No backend yet, so submissions are kept in this browser's localStorage.
     In production, replace Bookings.save / find with calls to the enquiry API. */
  const Bookings = (() => {
    const KEY = 'sg-bookings';
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } };
    const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {} };
    const digits = v => String(v || '').replace(/\D/g, '').slice(-10);
    return {
      save(rec) { const list = read().filter(r => r.ref !== rec.ref); list.unshift(rec); write(list.slice(0, 50)); },
      byRef(ref) { const r = String(ref || '').trim().toUpperCase(); return read().filter(b => b.ref === r); },
      byPhone(phone) { const d = digits(phone); return d.length === 10 ? read().filter(b => digits(b.phone) === d) : []; },
    };
  })();
  const STATUS = {
    enquiry:         { label: 'Awaiting confirmation',        tone: 'wait', note: 'Our team is checking availability and will contact you with a confirmed quotation.' },
    payment_pending: { label: 'Payment verification pending', tone: 'wait', note: 'We have your UTR. Our team is verifying the payment and checking availability.' },
    confirmed:       { label: 'Confirmed',                    tone: 'ok',   note: 'Your stay is confirmed. We look forward to welcoming you.' },
    cancelled:       { label: 'Cancelled',                    tone: 'bad',  note: 'This booking has been cancelled. Please contact us if this is unexpected.' },
  };
  const AGE_LABEL = { '0-5': '0–5 yrs', '6-12': '6–12 yrs', '13+': '13+ yrs' };

  /* ---------- Form checks shared by "Make payment" and "Send enquiry" ---------- */
  const validateForm = () => {
    const form = $('#bookForm');
    $$('.bf-field', form).forEach(f => f.classList.remove('is-invalid'));
    const required = $$('[required]', form);
    const bad = required.filter(el => !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value)) || (el.type === 'tel' && el.value.replace(/\D/g, '').length < 10));
    if (bIn.value && bOut.value && bOut.value <= bIn.value) bad.push(bOut);
    bad.forEach(el => el.closest('.bf-field').classList.add('is-invalid'));
    if (bad.length) {
      showAlert('Please complete the highlighted fields.');
      const f = bad[0]; (f.type === 'hidden' ? f.closest('.bf-field').querySelector('button') : f).focus(); return false;
    }
    if (!checkDates()) { $('#bInBtn').focus(); return false; }
    showAlert('');
    return true;
  };
  let currentRef = null;
  const summary = () => {
    const est = estimate(), name = $('#bName').value.trim();
    const adults = Number(bAdults.value), kids = Number(bKids.value), rooms = est.rooms;
    const cat = bCat.value || 'No preference';
    if (!currentRef) currentRef = `SG-${bIn.value.slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return {
      est, name, first: name.split(/\s+/)[0], ref: currentRef,
      guests: `${adults} Adult${adults > 1 ? 's' : ''}${kids ? `, ${kids} ${kids > 1 ? 'Children' : 'Child'}` : ''}`,
      dates: `${fmtLong(bIn.value)} – ${fmtLong(bOut.value)} (${est.n} night${est.n > 1 ? 's' : ''})`,
      room: `${rooms} × ${cat === 'No preference' ? `Room${rooms > 1 ? 's' : ''} (no preference)` : cat}`,
    };
  };
  const showView = v => {
    [viewForm, $('#enqPay'), viewDone].forEach(x => (x.hidden = x !== v));
    enq.classList.toggle('is-done', v === viewDone);
    panel.scrollTop = 0; v.focus({ preventScroll: true });
  };
  const showDone = (paid, utr) => {
    const d = summary();
    $('#dName').textContent = d.first;
    $('#dRef').textContent = d.ref;
    $('#dDates').textContent = d.dates;
    $('#dGuests').textContent = d.guests;
    $('#dRoom').textContent = d.room;
    $('#dTotal').textContent = inr(d.est.total);
    $('#dTotalLbl').textContent = paid ? 'Amount paid' : 'Estimated total';
    $('#dPayRow').hidden = !paid;
    if (paid) $('#dPay').textContent = `UPI · UTR ${utr}`;
    $('#dEyebrow').textContent = paid ? 'Payment submitted' : 'Enquiry received';
    $('#dLede').textContent = paid
      ? 'Thank you for your payment. Our team will verify it against your UTR, check availability and confirm your stay shortly.'
      : 'Your stay enquiry has reached our team. Our retreat manager will check availability, review room allocation and contact you shortly with a confirmed quotation.';
    $('#dNote').textContent = paid
      ? 'Your stay is confirmed once our team has verified your payment. Keep your UTR for reference.'
      : 'Your stay is not confirmed until you hear from us. No payment has been taken.';
    const msg = paid
      ? `Hello Shrishti Gardens, I've paid ${inr(d.est.total)} by UPI for my stay (${d.ref}).\nUTR: ${utr}\nName: ${d.name}\nDates: ${d.dates}\nGuests: ${d.guests}\nRooms: ${d.room}`
      : `Hello Shrishti Gardens, I've sent a stay enquiry (${d.ref}).\nName: ${d.name}\nDates: ${d.dates}\nGuests: ${d.guests}\nRooms: ${d.room}\nEstimated total: ${inr(d.est.total)}`;
    $('#dWhatsApp').href = `https://wa.me/919488212345?text=${encodeURIComponent(msg)}`;
    Bookings.save({
      ref: d.ref, createdAt: new Date().toISOString(), status: paid ? 'payment_pending' : 'enquiry',
      name: d.name, phone: $('#bPhone').value.trim(), email: $('#bEmail').value.trim(),
      checkIn: bIn.value, checkOut: bOut.value, nights: d.est.n,
      adults: Number(bAdults.value), children: Number(bKids.value),
      childAges: $$('select', kidAges).map(x => x.value).filter(Boolean),
      rooms: d.est.rooms, category: bCat.value || '', message: $('#bMsg').value.trim(),
      total: Math.round(d.est.total), utr: paid ? utr : '',
    });
    showView(viewDone);
  };

  /* ---------- Send enquiry (secondary) ---------- */
  $('#bookForm').addEventListener('submit', e => { e.preventDefault(); if (validateForm()) showDone(false); });

  /* ---------- Make payment (primary): UPI QR with the exact amount ---------- */
  const UPI = { pa: '9150974111@hdfc', pn: 'Shrishti Gardens' };
  const upiLink = (amount, ref) =>
    `upi://pay?pa=${UPI.pa}&pn=${encodeURIComponent(UPI.pn)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Stay ${ref}`)}`;
  const payAmt = $('#bPayAmt');
  const updatePayBtn = () => { const e = estimate(); payAmt.textContent = e.n ? `· ${inr(e.total)}` : ''; };
  $('#bookForm').addEventListener('change', updatePayBtn);
  $('#bookForm').addEventListener('input', updatePayBtn);
  updatePayBtn();

  $('#bPay').addEventListener('click', () => {
    if (!validateForm()) return;
    const d = summary(), amount = Math.round(d.est.total);   // whole rupees, so the payer sees a clean figure
    const link = upiLink(amount, d.ref);
    $('#payAmount').textContent = inr(amount);
    $('#payFor').textContent = `${d.dates} · ${d.room} · ${d.guests} · incl. 5% GST`;
    $('#payRef').textContent = d.ref;
    $('#payOpen').href = link;
    const qrBox = $('#payQr');
    qrBox.innerHTML = window.SGQR ? SGQR(link, 'M') : '<p class="pay__qrerr">QR code could not load. Use the UPI ID below.</p>';
    qrBox.dataset.link = link;
    $('#payUtr').value = ''; $('#payAlert').hidden = true; $('#utrField').classList.remove('is-invalid'); syncUtr();
    showView($('#enqPay'));
  });
  $('#payBack').addEventListener('click', () => showView(viewForm));
  $$('.pay__copy').forEach(b => b.addEventListener('click', async () => {
    const t = $(b.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(t); b.textContent = 'Copied'; } catch (_) { b.textContent = 'Select & copy'; }
    setTimeout(() => (b.textContent = 'Copy'), 1600);
  }));
  const UTR_OK = /^[0-9A-Z]{12,22}$/;              // UPI UTRs are usually 12 digits; allow bank variants
  const syncUtr = () => {
    const ok = UTR_OK.test($('#payUtr').value.trim());
    $('#payRefRow').hidden = !ok; $('#utrOk').hidden = !ok;
    $('#utrField').classList.toggle('is-valid', ok);
  };
  $('#payUtr').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    $('#utrField').classList.remove('is-invalid'); $('#payAlert').hidden = true; syncUtr();
  });
  $('#payForm').addEventListener('submit', e => {
    e.preventDefault();
    const utr = $('#payUtr').value.trim();
    if (!UTR_OK.test(utr)) {
      $('#utrField').classList.add('is-invalid');
      const a = $('#payAlert'); a.textContent = 'Please enter the 12-digit UTR / transaction ID shown in your UPI app after paying.'; a.hidden = false;
      $('#payUtr').focus(); return;
    }
    showDone(true, utr);
  });

  /* ---------- Check booking status ---------- */
  (() => {
    const dlg = $('#statusDlg'); if (!dlg) return;
    const panelS = $('.st__panel', dlg), form = $('#stForm'), input = $('#stInput'), out = $('#stResults'), alertS = $('#stAlert');
    let back = null;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const when = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const setMode = () => {
      const byRef = form.stBy.value === 'ref';
      $('#stLabel').textContent = byRef ? 'Reference ID' : 'Phone number';
      input.type = byRef ? 'text' : 'tel'; input.inputMode = byRef ? 'text' : 'tel';
      input.autocomplete = byRef ? 'off' : 'tel';
      input.placeholder = byRef ? 'e.g. SG-2026-AB12' : '+91 98765 43210';
      input.value = ''; alertS.hidden = true; $('#stField').classList.remove('is-invalid');
    };
    $$('input[name="stBy"]', form).forEach(r => r.addEventListener('change', () => { setMode(); input.focus(); }));
    input.addEventListener('input', () => { if (form.stBy.value === 'ref') input.value = input.value.toUpperCase(); $('#stField').classList.remove('is-invalid'); alertS.hidden = true; });

    const open = () => {
      back = document.activeElement; out.innerHTML = ''; setMode();
      dlg.hidden = false; document.body.classList.add('enq-lock');
      requestAnimationFrame(() => dlg.classList.add('is-open'));
      setTimeout(() => input.focus({ preventScroll: true }), reduceMotion ? 0 : 250);
    };
    const close = () => {
      if (dlg.hidden) return;
      dlg.classList.remove('is-open'); document.body.classList.remove('enq-lock');
      setTimeout(() => { dlg.hidden = true; }, reduceMotion ? 0 : 280);
      back && back.focus && back.focus({ preventScroll: true });
    };
    $$('[data-open-status]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
    $$('[data-close-status]', dlg).forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if (dlg.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const f = $$('button, a[href], input, [tabindex="0"]', panelS).filter(x => !x.disabled && x.offsetParent !== null && !(x.type === 'radio' && !x.checked));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);

    const card = b => {
      const st = STATUS[b.status] || STATUS.enquiry;
      const guests = `${b.adults} Adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} ${b.children > 1 ? 'Children' : 'Child'}${b.childAges && b.childAges.length ? ` (${b.childAges.map(a => AGE_LABEL[a] || a).join(', ')})` : ''}` : ''}`;
      const dates = `${fmtLong(b.checkIn)} – ${fmtLong(b.checkOut)} (${b.nights} night${b.nights > 1 ? 's' : ''})`;
      const room = `${b.rooms} × ${b.category || `Room${b.rooms > 1 ? 's' : ''} (no preference)`}`;
      const paid = !!b.utr, confirmed = b.status === 'confirmed';
      const steps = [
        { t: 'Request submitted', d: when(b.createdAt), s: 'done' },
        paid ? { t: 'Payment submitted', d: `${inr(b.total)} by UPI · UTR ${esc(b.utr)}`, s: confirmed ? 'done' : 'now' }
             : { t: 'Payment', d: 'Pay after our team confirms availability', s: 'next' },
        { t: 'Stay confirmed', d: confirmed ? 'See you soon in Kodaikanal' : 'Our team will confirm by phone or WhatsApp', s: confirmed ? 'done' : (paid ? 'next' : 'now') },
      ];
      const msg = `Hello Shrishti Gardens, I'm checking on my booking ${b.ref}.\nCurrent status: ${st.label}\nName: ${b.name}\nDates: ${dates}\nGuests: ${guests}\nRooms: ${room}\n${paid ? `Amount paid: ${inr(b.total)} (UTR ${b.utr})` : `Estimated total: ${inr(b.total)}`}\nSubmitted: ${when(b.createdAt)}`;
      return `<article class="st-card">
        <header class="st-card__head">
          <div><p class="st-card__label">Reference</p><p class="st-card__ref">${esc(b.ref)}</p></div>
          <span class="st-badge st-badge--${st.tone}">${st.label}</span>
        </header>
        <p class="st-card__when">Submitted on ${when(b.createdAt)}</p>
        <p class="st-card__note">${st.note}</p>
        <ol class="st-steps">${steps.map(x => `<li class="is-${x.s}"><span class="st-steps__dot" aria-hidden="true"></span><div><p class="st-steps__t">${x.t}</p><p class="st-steps__d">${x.d}</p></div></li>`).join('')}</ol>
        <dl class="st-card__rows">
          <div><dt>Guest</dt><dd>${esc(b.name)}</dd></div>
          <div><dt>Phone</dt><dd>${esc(b.phone)}</dd></div>
          <div><dt>Email</dt><dd>${esc(b.email)}</dd></div>
          <div><dt>Stay dates</dt><dd>${dates}</dd></div>
          <div><dt>Guests</dt><dd>${guests}</dd></div>
          <div><dt>Accommodation</dt><dd>${esc(room)}</dd></div>
          <div><dt>${paid ? 'Amount paid' : 'Estimated total'}</dt><dd class="st-card__amt">${inr(b.total)}</dd></div>
          ${b.message ? `<div><dt>Message</dt><dd>${esc(b.message)}</dd></div>` : ''}
        </dl>
        <a class="btn-dark st-card__wa" href="https://wa.me/919488212345?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3 2.5 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1.2-.5-2.3-1.6-2.8-2.8l.8-1-1-2z"/></svg>Send status on WhatsApp</a>
      </article>`;
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      const byRef = form.stBy.value === 'ref', v = input.value.trim();
      const fail = m => { alertS.textContent = m; alertS.hidden = false; $('#stField').classList.add('is-invalid'); out.innerHTML = ''; input.focus(); };
      if (byRef && !/^SG-\d{4}-[A-Z0-9]{4}$/.test(v)) return fail('Enter your reference in the format SG-2026-AB12. You can find it on your confirmation screen or WhatsApp message.');
      if (!byRef && v.replace(/\D/g, '').length < 10) return fail('Enter the 10-digit phone number you used for the booking.');
      const found = byRef ? Bookings.byRef(v) : Bookings.byPhone(v);
      alertS.hidden = true;
      if (!found.length) {
        out.innerHTML = `<div class="st-empty"><p class="st-empty__t">No booking found</p><p>We couldn't find a booking for that ${byRef ? 'reference' : 'phone number'}. Please check it, or contact us on <a href="https://wa.me/919488212345" target="_blank" rel="noopener">WhatsApp</a> or <a href="tel:+919488212345">+91 94882 12345</a>.</p></div>`;
        return;
      }
      out.innerHTML = (found.length > 1 ? `<p class="st-count">${found.length} bookings found · newest first</p>` : '') + found.map(card).join('');
      out.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  })();

  /* ---------- Guest reviews: full-width auto-scrolling marquee ---------- */
  (() => {
    const track = $('#revTrack'), wrap = $('#revMarquee'), dataEl = $('#reviewsData');
    if (!track || !dataEl) return;
    let reviews = [];
    try { reviews = JSON.parse(dataEl.textContent); } catch (_) { reviews = []; }
    reviews = reviews.filter(r => Number(r.rating) >= 4);          // only 4- and 5-star reviews are shown
    if (!reviews.length) { wrap.hidden = true; return; }

    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const initials = n => esc(String(n).split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(dr|mr|mrs|ms)\.?$/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase());
    const STAR = '<svg viewBox="0 0 24 24"><path d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7z"/></svg>';
    const card = r => {
      const n = Math.round(Number(r.rating));
      return `<article class="rev-card${r.sample ? ' is-sample' : ''}">
        <div class="rev-card__top">
          <div class="rev-stars" role="img" aria-label="Rated ${n} out of 5">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${STAR}</span>`).join('')}</div>
          ${r.sample ? '<span class="rev-chip">Sample</span>' : ''}
        </div>
        <span class="rev-card__mark" aria-hidden="true">&rdquo;</span>
        <blockquote class="rev-card__quote"><p>&ldquo;${esc(r.quote)}&rdquo;</p></blockquote>
        <footer class="rev-card__by">
          <span class="rev-avatar" aria-hidden="true">${initials(r.name)}</span>
          <div>
            <p class="rev-name">${esc(r.name)}</p>
            <p class="rev-meta">${esc(r.city)} · Stayed ${esc(r.stayed)}</p>
            ${r.room ? `<p class="rev-room">${esc(r.room)}</p>` : ''}
          </div>
        </footer>
      </article>`;
    };
    const set = reviews.map(card).join('');
    track.innerHTML = `<div class="rev-set">${set}</div>`;

    let offset = 0, speed = 0, setW = 0, running = false, paused = false, visible = true, last = 0, raf = 0;
    // Always auto-scrolls; gentler when the visitor has reduced motion switched on
    const SPEED = reduceMotion ? 22 : 38; // px per second

    const layout = () => {
      track.querySelectorAll('.rev-set[aria-hidden]').forEach(n => n.remove());
      const first = track.firstElementChild;
      setW = first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
      const overflow = first.scrollWidth > wrap.clientWidth + 2;
      running = overflow;
      wrap.classList.toggle('is-moving', running);
      wrap.classList.toggle('is-static', !overflow);
      if (running) {
        // a copy for the seamless loop; hidden from screen readers and keyboard
        const clone = first.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); clone.setAttribute('inert', '');
        track.appendChild(clone);
        if (setW + wrap.clientWidth > setW * 2) { const c2 = clone.cloneNode(true); track.appendChild(c2); }
      } else { offset = 0; track.style.transform = ''; }
    };
    const tick = t => {
      const dt = Math.min(64, t - (last || t)); last = t;
      const target = (running && !paused && visible) ? SPEED : 0;
      speed += (target - speed) * Math.min(1, dt / 220);          // ease in/out when pausing and resuming
      if (running) {
        offset = (offset + speed * dt / 1000) % setW;
        track.style.transform = `translate3d(${-offset}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    const pause = () => { paused = true; wrap.classList.add('is-paused'); };
    const resume = () => { if (wrap.matches(':hover') || wrap.contains(document.activeElement)) return; paused = false; wrap.classList.remove('is-paused'); };
    wrap.addEventListener('mouseenter', pause);
    wrap.addEventListener('mouseleave', () => { paused = false; wrap.classList.remove('is-paused'); });
    wrap.addEventListener('focusin', pause);
    wrap.addEventListener('focusout', () => setTimeout(resume, 0));
    let touchT;
    wrap.addEventListener('touchstart', () => { clearTimeout(touchT); pause(); }, { passive: true });
    wrap.addEventListener('touchend', () => { touchT = setTimeout(() => { paused = false; wrap.classList.remove('is-paused'); }, 2500); }, { passive: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);
    document.addEventListener('visibilitychange', () => { last = 0; });

    let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(layout, 150); });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { layout(); raf = requestAnimationFrame(tick); });
  })();

  /* ---------- Live weather in the hero bar (Open-Meteo, no API key) ---------- */
  (() => {
    const box = $('#heroWeather'); if (!box) return;
    const LAT = 10.2381, LON = 77.4892; // Kodaikanal town
    const I = {
      sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      partly: '<svg viewBox="0 0 24 24"><path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M12.2 4.8l-1 1"/><path d="M5.6 11a3.5 3.5 0 1 1 6.3-2.6"/><path d="M8 19h9a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 8 13.2 3 3 0 0 0 8 19z"/></svg>',
      cloud: '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 11.3 3.4 3.4 0 0 0 7 18z"/></svg>',
      mist: '<svg viewBox="0 0 24 24"><path d="M4 9h16M3 13h18M5 17h14"/></svg>',
      drizzle: '<svg viewBox="0 0 24 24"><path d="M7 14h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 7.3 3.4 3.4 0 0 0 7 14z"/><path d="M8 17.5v.5M12 17.5v.5M16 17.5v.5M10 20.5v.5M14 20.5v.5"/></svg>',
      rain: '<svg viewBox="0 0 24 24"><path d="M7 13h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 6.3 3.4 3.4 0 0 0 7 13z"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3"/></svg>',
      storm: '<svg viewBox="0 0 24 24"><path d="M7 13h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 6.3 3.4 3.4 0 0 0 7 13z"/><path d="M12 14l-2 4h4l-2 4"/></svg>',
    };
    const describe = c =>
      c === 0 ? ['Clear skies', 'sun'] :
      c <= 2 ? ['Partly cloudy', 'partly'] :
      c === 3 ? ['Overcast', 'cloud'] :
      c === 45 || c === 48 ? ['Mountain mist', 'mist'] :
      c >= 51 && c <= 57 ? ['Mountain drizzle', 'drizzle'] :
      (c >= 61 && c <= 67) || (c >= 80 && c <= 82) ? ['Light rain', 'rain'] :
      c >= 95 ? ['Thunderstorms', 'storm'] :
      c >= 71 && c <= 77 ? ['Cold & cloudy', 'cloud'] : ['Cloudy', 'cloud'];
    const load = async () => {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`, { signal: ctl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(r.status);
        const d = await r.json();
        const temp = Math.round(d.current.temperature_2m), [label, icon] = describe(Number(d.current.weather_code));
        $('#heroWText').textContent = `${temp}°C · ${label}`;
        $('#heroWIcon').innerHTML = I[icon];
        box.hidden = false;
      } catch (_) { /* weather is a nicety: keep the slot empty if it can't load */ }
    };
    load(); setInterval(load, 30 * 60 * 1000);
  })();

  /* ---------- Experience background film: lazy, right-sized, paused off-screen ---------- */
  (() => {
    const v = $('.exp-video'); if (!v) return;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (saveData) return; // keep the still poster for visitors saving data
    let loaded = false, inView = false;
    const pick = () => (innerWidth < 768 || (navigator.connection && /2g/.test(navigator.connection.effectiveType || '')))
      ? v.dataset.srcMobile : v.dataset.srcDesktop;
    const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    const load = () => { if (loaded) return; loaded = true; v.src = pick(); v.load(); };
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) { load(); tryPlay(); } else if (!v.paused) v.pause();
    }, { rootMargin: '300px 0px' }).observe(v);
    document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (inView) tryPlay(); });
    v.addEventListener('canplay', () => { if (inView) tryPlay(); });
  })();

  /* ---------- Gallery lightbox ---------- */
  const items = $$('.gal-item');
  const lb = $('#lightbox'), stage = $('#lbStage'), cap = $('#lbCap');
  let idx = 0, lastFocus = null;
  const show = i => {
    idx = (i + items.length) % items.length;
    const it = items[idx];
    stage.innerHTML = '';
    const img = $('img', it);
    if (img) {
      const c = new Image(); c.alt = img.alt; c.decoding = 'async';
      c.src = it.dataset.full || img.currentSrc || img.src;
      stage.appendChild(c);
      // preload the neighbours so next / previous feel instant
      [idx + 1, idx - 1].forEach(j => { const n = items[(j + items.length) % items.length]; if (n && n.dataset.full) new Image().src = n.dataset.full; });
    }
    else stage.appendChild($('.ph', it).cloneNode(true));
    cap.textContent = `${it.dataset.caption}  ·  ${idx + 1} / ${items.length}`;
  };
  const open = i => { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  items.forEach((it, i) => it.addEventListener('click', () => open(i)));
  $('.lb-close', lb).addEventListener('click', close);
  $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
  $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'Tab') { // simple focus trap
      const f = $$('button', lb); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let tx = null;
  lb.addEventListener('touchstart', e => (tx = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', e => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); tx = null;
  });

  $('#year').textContent = new Date().getFullYear();
})();
