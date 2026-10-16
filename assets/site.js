/* Dan Atkinson campaign site — accessibility panel, copy buttons, lightbox.
   No dependencies. The page is fully readable and navigable with this file absent;
   it only enhances. Nothing here is required to reach the campaign: the email
   address is plain text in the markup and the copy button is a convenience. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     Accessibility options
     Each option maps to a data-attribute on <html>. The same map is used by
     the inline script in <head>, which applies stored settings before first
     paint so the page never flashes in the wrong mode.
     ------------------------------------------------------------------- */
  var STORE = 'atkinson-a11y';
  var OPTIONS = {
    contrast: { attr: 'data-contrast', on: 'high' },
    text:     { attr: 'data-text',     on: 'large' },
    dyslexic: { attr: 'data-dyslexic', on: 'on' },
    spacing:  { attr: 'data-spacing',  on: 'on' },
    focus:    { attr: 'data-focus',    on: 'enhanced' },
    motion:   { attr: 'data-motion',   on: 'reduced' }
  };

  function read() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function write(state) {
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (e) { /* private mode, quota, blocked storage — settings just won't persist */ }
  }
  function apply(state) {
    var root = document.documentElement;
    Object.keys(OPTIONS).forEach(function (key) {
      if (state[key]) root.setAttribute(OPTIONS[key].attr, OPTIONS[key].on);
      else root.removeAttribute(OPTIONS[key].attr);
    });
  }

  var state = read();

  // First visit: inherit the reader's operating-system motion preference.
  if (!('motion' in state)) {
    try {
      state.motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { state.motion = false; }
  }
  apply(state);

  var fab      = document.getElementById('a11y-fab');
  var panel    = document.getElementById('a11y-panel');
  var backdrop = document.getElementById('a11y-backdrop');
  var closeBtn = document.getElementById('a11y-close');
  var resetBtn = document.getElementById('a11y-reset');
  var doneBtn  = document.getElementById('a11y-done');

  if (fab && panel) {
    var boxes = [].slice.call(panel.querySelectorAll('[data-a11y]'));

    function sync() {
      boxes.forEach(function (box) { box.checked = !!state[box.getAttribute('data-a11y')]; });
    }

    boxes.forEach(function (box) {
      box.addEventListener('change', function () {
        state[box.getAttribute('data-a11y')] = box.checked;
        apply(state);
        write(state);
      });
    });

    function focusables() {
      return [].slice.call(panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    }

    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      sync();
      panel.hidden = false;
      backdrop.hidden = false;
      fab.setAttribute('aria-expanded', 'true');
      var f = focusables();
      if (f.length) f[0].focus();
      document.addEventListener('keydown', onKeydown, true);
    }

    function close() {
      panel.hidden = true;
      backdrop.hidden = true;
      fab.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKeydown, true);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      else fab.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    fab.addEventListener('click', function () { panel.hidden ? open() : close(); });
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (doneBtn) doneBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
    if (resetBtn) resetBtn.addEventListener('click', function () {
      state = {};
      apply(state);
      write(state);
      sync();
      resetBtn.focus();
    });

    sync();
  }

})();

/* ---------------------------------------------------------------------------
   The two address cards: the web address in the share block, and the campaign
   email address in the contact block. Both show a value people need to copy
   accurately, so both get the same copy button. One IIFE so the clipboard
   helper is written once.

   Neither is load-bearing. The web address and the email address are both
   plain text in the markup, selectable with user-select:all, so a reader with
   scripting off can still read and copy them by hand. The buttons carry
   .js-only and are hidden entirely without JS.
   --------------------------------------------------------------------------- */
(function () {

  function fallbackCopy(text) {
    // execCommand is deprecated but it is the only thing that works outside a
    // secure context, which is where a campaign volunteer may well be.
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // done(true) on success, done(false) otherwise. Never claims a copy that
  // did not happen: a reader who is told "copied" and pastes nothing is worse
  // off than one who is told to select it by hand.
  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(fallbackCopy(text)); }
      );
    } else {
      done(fallbackCopy(text));
    }
  }

  function wire(btn, status, getText, okMsg, failMsg) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      var text = getText();
      if (!text) return;
      copy(text, function (ok) { if (status) status.textContent = ok ? okMsg : failMsg; });
    });
  }

  /* --- Share block ------------------------------------------------------ */
  /* The address is read from the browser rather than hard-coded, so it is
     correct wherever the page ends up. Opened from disk there is no real
     address to read, so the placeholder stands and the button says so. */
  (function () {
    var box = document.getElementById('share-url');
    if (!box) return;
    var copyBtn = document.getElementById('share-copy');
    var shareBtn = document.getElementById('share-native');
    var status = document.getElementById('share-status');
    var mail = document.getElementById('share-mail');

    var live = location.protocol === 'http:' || location.protocol === 'https:';
    var url = live ? location.origin + location.pathname : '';

    if (live) {
      box.textContent = url;
      if (mail) mail.href = mail.href + encodeURIComponent(url);
    }

    if (copyBtn && !live) {
      copyBtn.addEventListener('click', function () {
        if (status) status.textContent = 'This copy is open from a file, so there is no web address yet.';
      });
    } else {
      wire(copyBtn, status, function () { return url; },
        'Copied. Paste it anywhere.',
        'Could not copy. Select the address above instead.');
    }

    // The OS share sheet gives every app on the phone without embedding one.
    if (shareBtn && live && navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', function () {
        navigator.share({
          title: 'Dan Atkinson for school board trustee',
          text: 'There is a trustee race on the ballot this October. Here is where Dan Atkinson stands.',
          url: url
        }).catch(function () { /* the reader cancelled; nothing to report */ });
      });
    }
  })();

  /* --- Contact block ---------------------------------------------------- */
  /* The address is hard-coded in the markup, not built here, so it is there
     with scripting off. This only copies it. */
  (function () {
    var box = document.getElementById('contact-addr');
    if (!box) return;
    wire(document.getElementById('contact-copy'),
      document.getElementById('contact-status'),
      function () { return box.textContent.trim(); },
      'Copied. Paste it into your email app.',
      'Could not copy. Select the address above instead.');
  })();

})();

/* ---------------------------------------------------------------------------
   Photograph lightbox. The markup is already a link to the larger file, so
   this only intercepts the click when <dialog> can actually do the job.
   showModal() supplies the focus trap, Escape, the top layer and returning
   focus to the link on close, so none of that is reimplemented here.
   --------------------------------------------------------------------------- */
(function () {
  var dlg = document.getElementById('lightbox');
  var img = document.getElementById('lightbox-img');
  var cap = document.getElementById('lightbox-cap');
  var close = document.getElementById('lightbox-close');
  var links = [].slice.call(document.querySelectorAll('.photo-zoom'));
  if (!dlg || !img || !links.length || typeof dlg.showModal !== 'function') return;

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let
      e.preventDefault();                                                // "open
      var thumb = link.querySelector('img');                             // in new
      img.src = link.href;                                               // tab" work
      img.alt = thumb ? thumb.alt : '';
      var caption = link.closest('li') && link.closest('li').querySelector('.photo-cap');
      cap.textContent = caption ? caption.textContent.trim() : '';
      dlg.showModal();
    });
  });

  if (close) close.addEventListener('click', function () { dlg.close(); });

  // Clicking the backdrop closes it. The dialog fills the whole top layer, so
  // a click lands on the dialog itself only when it missed the inner panel.
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  // Drop the source on close so a large photograph is not held in memory.
  dlg.addEventListener('close', function () { img.removeAttribute('src'); });
})();
