/* Shrishti Gardens — date-range calendar and guest selector (no dependencies)
 *
 * DateRangePicker: two-month calendar in a pop-over (bottom sheet on phones).
 *   - Click a day: ripple, then the check-in dot pops in.
 *   - Hover after choosing check-in: a light preview band follows the pointer.
 *   - Click a later day: check-out dot pops in and the band draws across, day by day.
 *   - Clicking after a full range starts a new selection. Earlier day = new check-in.
 *   - Past days and blackout days are disabled; a stay cannot run across a blackout.
 * GuestPicker: adults/children steppers, presets, "Selected" summary and Select button.
 */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MON_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const DOW_L = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const fmtShort = s => { const d = parse(s); return `${DOW_L[d.getDay()]}, ${d.getDate()} ${MON_S[d.getMonth()]}`; };
  const fmtLong = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const pad2 = n => String(n).padStart(2, '0');

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const isPhone = () => window.matchMedia('(max-width: 639px)').matches;

  /* Shared pop-over shell: positions under an anchor on desktop, bottom sheet on phones */
  let openPop = null;
  const scrim = el('div', 'sg-scrim'); scrim.hidden = true; document.body.appendChild(scrim);
  scrim.addEventListener('click', () => openPop && openPop.close());

  function positionPop(pop, anchor, align = 'start') {
    if (isPhone()) { pop.style.left = pop.style.top = ''; pop.classList.add('is-sheet'); return; }
    pop.classList.remove('is-sheet');
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 12;
    let left = align === 'end' ? r.right - pw : r.left;
    left = Math.max(16, Math.min(left, innerWidth - pw - 16));
    let top = r.bottom + gap;
    pop.classList.remove('is-above');
    if (top + ph > innerHeight - 12 && r.top - gap - ph > 12) { top = r.top - gap - ph; pop.classList.add('is-above'); }
    pop.style.left = `${left + scrollX}px`;
    pop.style.top = `${top + scrollY}px`;
  }
  /* After opening, make sure the whole pop-over is on screen (scrolls only as much as needed) */
  function revealPop(pop) {
    if (pop.classList.contains('is-sheet')) return;
    const r = pop.getBoundingClientRect(), header = 90;
    let dy = 0;
    if (r.bottom > innerHeight - 12) dy = r.bottom - innerHeight + 16;
    if (r.top - dy < header) dy = r.top - header;
    if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ===================== Date range picker ===================== */
  class DateRangePicker {
    constructor(opts) {
      this.o = Object.assign({ months: 2, maxMonthsAhead: 14, blackouts: [] }, opts);
      this.inInput = opts.inInput; this.outInput = opts.outInput;
      this.inBtn = opts.inBtn; this.outBtn = opts.outBtn; this.anchor = opts.anchor;
      this.start = this.inInput.value || null; this.end = this.outInput.value || null;
      this.hover = null; this.active = 'in'; this.today = iso(new Date());
      const t = parse(this.today); this.minMonth = new Date(t.getFullYear(), t.getMonth(), 1);
      this.maxMonth = new Date(t.getFullYear(), t.getMonth() + this.o.maxMonthsAhead, 1);
      this.view = new Date(this.minMonth);
      this.build();
      [['in', this.inBtn], ['out', this.outBtn]].forEach(([k, b]) => b.addEventListener('click', () => this.open(k)));
      this.syncButtons();
    }

    blackoutOf(day) { return this.o.blackouts.find(([, s, e]) => day >= s && day <= e); }
    /* Latest valid check-out for the current start: the first blackout day after it (checkout morning is fine) */
    maxEnd() {
      if (!this.start) return null;
      const next = this.o.blackouts.map(b => b[1]).filter(s => s > this.start).sort()[0];
      return next || null;
    }
    dayState(day) {
      if (day < this.today) return 'past';
      const choosingEnd = this.start && !this.end;
      if (choosingEnd && day > this.start) {
        const me = this.maxEnd();
        if (me && day > me) return this.blackoutOf(day) ? 'blackout' : 'blocked';
        return 'ok'; // checkout morning may fall on a blackout start
      }
      if (this.blackoutOf(day)) return 'blackout';
      return 'ok';
    }

    build() {
      const p = this.pop = el('div', 'sg-pop sg-cal');
      p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'false'); p.setAttribute('aria-label', 'Choose check-in and check-out dates'); p.hidden = true;
      p.innerHTML = `
        <div class="sg-cal__head">
          <button type="button" class="sg-icon-btn sg-prev" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
          <div class="sg-cal__titles"></div>
          <button type="button" class="sg-icon-btn sg-next" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
          <button type="button" class="sg-close" aria-label="Close calendar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="sg-cal__months"></div>
        <div class="sg-cal__foot">
          <p class="sg-cal__summary" aria-live="polite"></p>
          <div class="sg-cal__actions">
            <button type="button" class="sg-link sg-clear">Clear dates</button>
            <button type="button" class="sg-done">Done</button>
          </div>
        </div>`;
      document.body.appendChild(p);
      this.titles = p.querySelector('.sg-cal__titles');
      this.monthsEl = p.querySelector('.sg-cal__months');
      this.summary = p.querySelector('.sg-cal__summary');
      p.querySelector('.sg-prev').addEventListener('click', () => this.shift(-1));
      p.querySelector('.sg-next').addEventListener('click', () => this.shift(1));
      p.querySelector('.sg-close').addEventListener('click', () => this.close());
      p.querySelector('.sg-done').addEventListener('click', () => this.close());
      p.querySelector('.sg-clear').addEventListener('click', () => { this.start = this.end = null; this.active = 'in'; this.commit(); this.render(); });
      this.monthsEl.addEventListener('click', e => { const b = e.target.closest('.sg-day'); if (b && !b.disabled) this.pick(b.dataset.date, b); });
      this.monthsEl.addEventListener('mouseover', e => { const b = e.target.closest('.sg-day'); if (b) this.preview(b.dataset.date); });
      this.monthsEl.addEventListener('mouseleave', () => this.preview(null));
      this.monthsEl.addEventListener('keydown', e => this.keys(e));
      p.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.close(true); } });
    }

    open(which) {
      if (openPop && openPop !== this) openPop.close();
      this.active = which === 'out' && this.start ? 'out' : (which === 'out' ? 'in' : 'in');
      if (which === 'in' && this.start && this.end) this.active = 'in';
      const focusDay = (this.active === 'out' ? this.end || this.start : this.start) || this.today;
      const fm = parse(focusDay); this.view = new Date(fm.getFullYear(), fm.getMonth(), 1);
      if (this.view < this.minMonth) this.view = new Date(this.minMonth);
      this.render(true);
      this.pop.hidden = false; openPop = this;
      scrim.hidden = !isPhone(); document.body.classList.toggle('sg-lock', isPhone());
      positionPop(this.pop, this.anchor);
      requestAnimationFrame(() => { this.pop.classList.add('is-open'); revealPop(this.pop); });
      this.markActive();
      const f = this.pop.querySelector('.sg-day[tabindex="0"]'); f && f.focus({ preventScroll: true });
      this._out = e => { if (!this.pop.contains(e.target) && !this.inBtn.contains(e.target) && !this.outBtn.contains(e.target)) this.close(); };
      this._rs = () => positionPop(this.pop, this.anchor);
      setTimeout(() => document.addEventListener('pointerdown', this._out), 0);
      addEventListener('resize', this._rs); addEventListener('scroll', this._rs, true);
    }
    close(returnFocus) {
      if (this.pop.hidden) return;
      this.pop.classList.remove('is-open');
      document.removeEventListener('pointerdown', this._out); removeEventListener('resize', this._rs); removeEventListener('scroll', this._rs, true);
      scrim.hidden = true; document.body.classList.remove('sg-lock');
      [this.inBtn, this.outBtn].forEach(b => { b.closest('.is-active')?.classList.remove('is-active'); b.setAttribute('aria-expanded', 'false'); });
      setTimeout(() => { if (!this.pop.classList.contains('is-open')) this.pop.hidden = true; }, reduceMotion ? 0 : 220);
      if (openPop === this) openPop = null;
      if (returnFocus) (this.active === 'out' ? this.outBtn : this.inBtn).focus();
    }
    markActive() {
      [['in', this.inBtn], ['out', this.outBtn]].forEach(([k, b]) => {
        const f = b.closest('.sg-trigger'); f && f.classList.toggle('is-active', this.active === k);
        b.setAttribute('aria-expanded', String(!this.pop.hidden));
      });
    }

    shift(n) {
      const v = new Date(this.view.getFullYear(), this.view.getMonth() + n, 1);
      const lastFirst = new Date(this.maxMonth.getFullYear(), this.maxMonth.getMonth() - (this.visibleMonths() - 1), 1);
      if (v < this.minMonth || v > lastFirst) return;
      this.view = v; this.render(true);
    }
    visibleMonths() { return isPhone() ? 2 : this.o.months; }

    render(slide) {
      const n = this.visibleMonths();
      const fr = document.createDocumentFragment();
      this.titles.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const m = new Date(this.view.getFullYear(), this.view.getMonth() + i, 1);
        this.titles.appendChild(el('h3', 'sg-cal__title', `${MONTHS[m.getMonth()]} <span>${m.getFullYear()}</span>`));
        fr.appendChild(this.monthGrid(m));
      }
      this.monthsEl.innerHTML = ''; this.monthsEl.appendChild(fr);
      if (slide && !reduceMotion) { this.monthsEl.classList.remove('is-sliding'); void this.monthsEl.offsetWidth; this.monthsEl.classList.add('is-sliding'); }
      const lastFirst = new Date(this.maxMonth.getFullYear(), this.maxMonth.getMonth() - (n - 1), 1);
      this.pop.querySelector('.sg-prev').disabled = this.view <= this.minMonth;
      this.pop.querySelector('.sg-next').disabled = this.view >= lastFirst;
      this.paint(false);
      this.updateSummary();
    }

    monthGrid(m) {
      const wrap = el('div', 'sg-month');
      wrap.appendChild(el('h3', 'sg-month__title', `${MONTHS[m.getMonth()]} <span>${m.getFullYear()}</span>`));
      const dow = el('div', 'sg-dow'); DOW.forEach(d => dow.appendChild(el('span', '', d))); wrap.appendChild(dow);
      const grid = el('div', 'sg-grid'); grid.setAttribute('role', 'grid');
      const lead = (m.getDay() + 6) % 7; // Monday-first
      for (let i = 0; i < lead; i++) grid.appendChild(el('span', 'sg-cell sg-cell--empty'));
      const dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        const date = iso(new Date(m.getFullYear(), m.getMonth(), d));
        const cell = el('span', 'sg-cell');
        const col = (lead + d - 1) % 7;
        if (col === 0 || d === 1) cell.classList.add('is-row-start');
        if (col === 6 || d === dim) cell.classList.add('is-row-end');
        cell.appendChild(el('span', 'sg-band'));
        const b = el('button', 'sg-day', `<span class="sg-num">${d}</span>`);
        b.type = 'button'; b.dataset.date = date; b.tabIndex = -1;
        if (date === this.today) b.classList.add('is-today');
        cell.appendChild(b); grid.appendChild(cell);
      }
      wrap.appendChild(grid);
      return wrap;
    }

    /* Apply selection classes to rendered days. `animate` draws the band day by day. */
    paint(animate) {
      const s = this.start, e = this.end, h = (!e && s && this.hover && this.hover > s) ? this.hover : null;
      const days = [...this.monthsEl.querySelectorAll('.sg-day')];
      let roving = null, idx = 0;
      const focusTarget = (this.active === 'out' ? (e || s) : s) || null;
      days.forEach(b => {
        const d = b.dataset.date, cell = b.parentElement, st = this.dayState(d);
        b.disabled = st !== 'ok';
        b.classList.toggle('is-past', st === 'past');
        b.classList.toggle('is-blackout', st === 'blackout');
        b.classList.toggle('is-blocked', st === 'blocked');
        const bo = st === 'blackout' ? this.blackoutOf(d) : null;
        const isS = d === s, isE = d === e;
        b.classList.toggle('is-start', isS); b.classList.toggle('is-end', isE);
        const inRange = s && e && d > s && d < e;
        const inPrev = h && d > s && d <= h;
        cell.classList.toggle('in-range', !!(inRange || (isS && e) || (isE && s)));
        cell.classList.toggle('range-start', !!(isS && (e || h)));
        cell.classList.toggle('range-end', !!(isE && s) || d === h);
        cell.classList.toggle('in-preview', !!(inPrev || (isS && h)));
        b.classList.toggle('is-hover-end', d === h);
        if (animate && (inRange || isE)) { cell.style.setProperty('--d', `${Math.min(idx++, 40) * 18}ms`); cell.classList.remove('draw'); void cell.offsetWidth; cell.classList.add('draw'); }
        else if (!animate) cell.style.removeProperty('--d');
        let label = fmtLong(d);
        if (isS) label += ', check-in'; if (isE) label += ', check-out';
        if (st === 'past') label += ', unavailable';
        if (st === 'blackout') label += `, closed for ${bo[0]}`;
        if (st === 'blocked') label += ', unavailable: stay would cross a closed period';
        b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', String(isS || isE));
        if (bo) b.title = `Closed: ${bo[0]}`; else b.removeAttribute('title');
        if (!roving && !b.disabled && (focusTarget ? d === focusTarget : true)) roving = b;
      });
      if (!roving) roving = days.find(b => !b.disabled);
      days.forEach(b => (b.tabIndex = b === roving ? 0 : -1));
    }

    preview(d) {
      if (!this.start || this.end) { if (this.hover) { this.hover = null; this.paint(false); } return; }
      const h = d && d > this.start && this.dayState(d) === 'ok' ? d : null;
      if (h === this.hover) return;
      this.hover = h; this.paint(false);
      if (h) this.summary.textContent = `${fmtShort(this.start)} → ${fmtShort(h)} · ${nightsBetween(this.start, h)} night${nightsBetween(this.start, h) > 1 ? 's' : ''}`;
      else this.updateSummary();
    }

    pick(d, btn) {
      this.ripple(btn);
      const choosingEnd = this.start && !this.end && d > this.start;
      if (this.active === 'out' && this.start && this.end && d > this.start && this.dayState(d) === 'ok') {
        this.end = null; this.end = d; this.hover = null; this.commit(); this.paint(true); this.pop_(btn); this.finish(); return;
      }
      if (choosingEnd) {
        this.end = d; this.hover = null; this.active = 'out'; this.commit(); this.paint(true); this.pop_(btn); this.finish(); return;
      }
      // new check-in (also when clicking an earlier date, or after a complete range)
      const hadRange = this.start && this.end;
      if (hadRange && !reduceMotion) this.monthsEl.querySelectorAll('.sg-cell.in-range').forEach(c => c.classList.add('clearing'));
      const go = () => {
        this.start = d; this.end = null; this.hover = null; this.active = 'out';
        this.commit(); this.paint(false); this.markActive();
        const nb = this.monthsEl.querySelector(`.sg-day[data-date="${d}"]`); nb && (this.pop_(nb), nb.focus({ preventScroll: true }));
      };
      hadRange && !reduceMotion ? setTimeout(go, 140) : go();
    }
    finish() {
      this.markActive();
      setTimeout(() => this.close(), reduceMotion ? 0 : 650);
    }
    ripple(btn) {
      if (reduceMotion || !btn) return;
      const r = el('span', 'sg-ripple'); btn.appendChild(r); setTimeout(() => r.remove(), 600);
    }
    pop_(btn) { if (reduceMotion || !btn) return; btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }

    keys(e) {
      const b = e.target.closest('.sg-day'); if (!b) return;
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in map) {
        e.preventDefault();
        let d = addDays(b.dataset.date, map[e.key]);
        const tgt = () => this.monthsEl.querySelector(`.sg-day[data-date="${d}"]`);
        if (!tgt()) { this.shift(map[e.key] > 0 ? 1 : -1); }
        const t = tgt(); if (t) { this.monthsEl.querySelectorAll('.sg-day').forEach(x => (x.tabIndex = -1)); t.tabIndex = 0; t.focus(); this.preview(d); }
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!b.disabled) this.pick(b.dataset.date, b); }
    }

    commit() {
      this.inInput.value = this.start || ''; this.outInput.value = this.end || '';
      this.syncButtons(); this.updateSummary();
      this.inInput.dispatchEvent(new Event('change', { bubbles: true }));
      this.outInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncButtons() {
      const set = (btn, v) => { const s = btn.querySelector('.sg-val'); s.textContent = v ? fmtShort(v) : 'Add date'; btn.classList.toggle('is-empty', !v); };
      set(this.inBtn, this.start); set(this.outBtn, this.end);
    }
    updateSummary() {
      if (!this.summary) return;
      if (this.start && this.end) { const n = nightsBetween(this.start, this.end); this.summary.innerHTML = `<strong>${n} night${n > 1 ? 's' : ''}</strong> · ${fmtShort(this.start)} – ${fmtShort(this.end)}`; }
      else if (this.start) this.summary.textContent = `Check-in ${fmtShort(this.start)} · now choose check-out`;
      else this.summary.textContent = 'Select your check-in date';
    }
    /* Programmatic set (e.g. copy hero dates into the booking form) */
    set(start, end) { this.start = start || null; this.end = end || null; this.commit(); if (!this.pop.hidden) this.render(); }
  }

  /* ===================== Guest picker ===================== */
  class GuestPicker {
    constructor(opts) {
      this.o = Object.assign({ maxAdults: 12, maxChildren: 6, eyebrow: 'Shrishti Gardens' }, opts);
      this.btn = opts.button; this.anchor = opts.anchor || opts.button;
      this.adultsInput = opts.adultsInput; this.kidsInput = opts.kidsInput;
      this.a = Number(this.adultsInput.value) || 2; this.c = Number(this.kidsInput.value) || 0;
      this.build(); this.sync();
      this.btn.addEventListener('click', () => (this.pop.hidden ? this.open() : this.close()));
    }
    label(a, c) {
      const A = `${pad2(a)} Adult${a > 1 ? 's' : ''}`;
      return c ? `${A}, ${c} ${c > 1 ? 'Kids' : 'Kid'}` : A;
    }
    short(a, c) { const t = a + c; return `${t} Guest${t > 1 ? 's' : ''}`; }
    build() {
      const p = this.pop = el('div', 'sg-pop sg-guests');
      p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Select guests'); p.hidden = true;
      const presets = [[2, 0, 'Couples & Duo'], [2, 2, 'Family Stay'], [1, 0, 'Solo Mountain Stay'], [3, 0, 'Friends · one room']];
      p.innerHTML = `
        <div class="sg-g__head">
          <div><p class="sg-g__eyebrow">${this.o.eyebrow}</p><h3 class="sg-g__title">Select Guests</h3></div>
          <button type="button" class="sg-close" aria-label="Close guest selector"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="sg-g__rows">
          <div class="sg-g__row" data-k="a">
            <div><p class="sg-g__name" id="sgAdultsLbl">Adults</p><p class="sg-g__hint">Ages 13 and above</p></div>
            <div class="sg-step" role="group" aria-labelledby="sgAdultsLbl">
              <button type="button" class="sg-step__btn" data-d="-1" aria-label="Fewer adults"><svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>
              <output class="sg-step__val" aria-live="polite"></output>
              <button type="button" class="sg-step__btn" data-d="1" aria-label="More adults"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></button>
            </div>
          </div>
          <div class="sg-g__row" data-k="c">
            <div><p class="sg-g__name" id="sgKidsLbl">Children</p><p class="sg-g__hint">Ages 0 to 12</p></div>
            <div class="sg-step" role="group" aria-labelledby="sgKidsLbl">
              <button type="button" class="sg-step__btn" data-d="-1" aria-label="Fewer children"><svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>
              <output class="sg-step__val" aria-live="polite"></output>
              <button type="button" class="sg-step__btn" data-d="1" aria-label="More children"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></button>
            </div>
          </div>
        </div>
        <p class="sg-g__label">Popular presets</p>
        <div class="sg-g__presets">${presets.map(([a, c, t]) =>
          `<button type="button" class="sg-preset" data-a="${a}" data-c="${c}"><span>${this.label(a, c)}</span><small>${t}</small></button>`).join('')}</div>
        <p class="sg-g__note">Each room sleeps up to 3 adults, or 2 adults with up to 2 children. Larger groups can request more rooms.</p>
        <div class="sg-g__foot">
          <p class="sg-g__sel">Selected: <b></b></p>
          <button type="button" class="sg-done">Select</button>
        </div>`;
      document.body.appendChild(p);
      p.querySelector('.sg-close').addEventListener('click', () => this.close(true));
      p.querySelector('.sg-done').addEventListener('click', () => { this.commit(); this.close(true); });
      p.querySelectorAll('.sg-g__row').forEach(row => row.querySelectorAll('.sg-step__btn').forEach(b => b.addEventListener('click', () => {
        const d = Number(b.dataset.d);
        if (row.dataset.k === 'a') this.a = Math.max(1, Math.min(this.o.maxAdults, this.a + d));
        else this.c = Math.max(0, Math.min(this.o.maxChildren, this.c + d));
        this.bump(row); this.render();
      })));
      p.querySelectorAll('.sg-preset').forEach(b => b.addEventListener('click', () => { this.a = +b.dataset.a; this.c = +b.dataset.c; this.render(); }));
      p.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.close(true); } });
    }
    bump(row) { if (reduceMotion) return; const v = row.querySelector('.sg-step__val'); v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); }
    render() {
      const [ra, rc] = this.pop.querySelectorAll('.sg-g__row');
      ra.querySelector('.sg-step__val').textContent = pad2(this.a);
      rc.querySelector('.sg-step__val').textContent = this.c;
      ra.querySelector('[data-d="-1"]').disabled = this.a <= 1; ra.querySelector('[data-d="1"]').disabled = this.a >= this.o.maxAdults;
      rc.querySelector('[data-d="-1"]').disabled = this.c <= 0; rc.querySelector('[data-d="1"]').disabled = this.c >= this.o.maxChildren;
      this.pop.querySelectorAll('.sg-preset').forEach(b => b.classList.toggle('is-on', +b.dataset.a === this.a && +b.dataset.c === this.c));
      this.pop.querySelector('.sg-g__sel b').textContent = this.label(this.a, this.c);
    }
    open() {
      if (openPop && openPop !== this) openPop.close();
      this.a = Number(this.adultsInput.value) || 2; this.c = Number(this.kidsInput.value) || 0;
      this.render(); this.pop.hidden = false; openPop = this;
      scrim.hidden = !isPhone(); document.body.classList.toggle('sg-lock', isPhone());
      positionPop(this.pop, this.anchor, 'end');
      requestAnimationFrame(() => { this.pop.classList.add('is-open'); revealPop(this.pop); });
      this.btn.closest('.sg-trigger')?.classList.add('is-active'); this.btn.setAttribute('aria-expanded', 'true');
      this.pop.querySelector('.sg-step__btn:not(:disabled)').focus({ preventScroll: true });
      this._out = e => { if (!this.pop.contains(e.target) && !this.btn.contains(e.target)) { this.commit(); this.close(); } };
      this._rs = () => positionPop(this.pop, this.anchor, 'end');
      setTimeout(() => document.addEventListener('pointerdown', this._out), 0); addEventListener('resize', this._rs); addEventListener('scroll', this._rs, true);
    }
    close(returnFocus) {
      if (this.pop.hidden) return;
      this.pop.classList.remove('is-open');
      document.removeEventListener('pointerdown', this._out); removeEventListener('resize', this._rs); removeEventListener('scroll', this._rs, true);
      scrim.hidden = true; document.body.classList.remove('sg-lock');
      this.btn.closest('.sg-trigger')?.classList.remove('is-active'); this.btn.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!this.pop.classList.contains('is-open')) this.pop.hidden = true; }, reduceMotion ? 0 : 220);
      if (openPop === this) openPop = null;
      if (returnFocus) this.btn.focus();
    }
    commit() {
      this.adultsInput.value = this.a; this.kidsInput.value = this.c; this.sync();
      this.adultsInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync() { this.btn.querySelector('.sg-val').textContent = this.short(Number(this.adultsInput.value) || 2, Number(this.kidsInput.value) || 0); }
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openPop) openPop.close(true); });
  window.SG = { DateRangePicker, GuestPicker };
})();
