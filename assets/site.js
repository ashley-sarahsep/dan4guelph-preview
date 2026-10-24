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

  /* The donation section shows the same address and copies it the same way. */
  (function () {
    var box = document.getElementById('donate-addr');
    if (!box) return;
    wire(document.getElementById('donate-copy'),
      document.getElementById('donate-status'),
      function () { return box.textContent.trim(); },
      'Copied. Paste it into your email app.',
      'Could not copy. Select the address above instead.');
  })();

})();

/* ---------------------------------------------------------------------------
   Season switch.
   A Halloween skin the reader turns on and off; the stylesheet does the work
   off html[data-season]. Built here rather than written into the markup
   because with scripting off it would be a button that does nothing, which is
   the same reason the accessibility panel is not in the markup either.

   **The choice is deliberately NOT remembered**, at the campaign's request on
   24 Oct 2026: every load starts on the regular site and the skin is only
   ever on because somebody pressed the button on this pageview. It used to
   be kept in localStorage under atkinson-season and re-applied by the inline
   script in <head>, which meant a reader who pressed it once came back to an
   orange campaign site days later - not what a candidate's site should open
   with two days before a vote. The key and that half of the head script are
   both gone, so nothing about the season is written to the reader's device
   at all.

   The accessibility settings are still stored, and still separately. They
   are the reader's access needs rather than a seasonal joke, and forgetting
   those on every load would be a real cost rather than the point.
   The label always says what the next press does.
   --------------------------------------------------------------------------- */
(function () {
  var root = document.documentElement;
  if (!document.body) return;

  function on() { return root.getAttribute('data-season') === 'halloween'; }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'season-fab';
  btn.id = 'season-fab';

  function label() { btn.textContent = on() ? 'View regular site' : 'Trick or Treat'; }

  /* Any <img> carrying data-season-src swaps picture, alt text and intrinsic
     size with the skin. The alt goes with it because a costume photograph
     described as "outdoors among trees" is worse than no description, and the
     width/height go with it because the two files are not the same shape -
     leaving the old pair would reserve the wrong box while the new one
     loads. The originals are read off the element each time rather than
     cached up front, so this still works if anything else ever edits them. */
  function photos(halloween) {
    var imgs = document.querySelectorAll('img[data-season-src]');
    [].forEach.call(imgs, function (img) {
      var from = halloween ? ['src', 'alt', 'width', 'height']
                           : ['data-season-src', 'data-season-alt', 'data-season-w', 'data-season-h'];
      var to   = halloween ? ['data-season-src', 'data-season-alt', 'data-season-w', 'data-season-h']
                           : ['src', 'alt', 'width', 'height'];
      var held = from.map(function (a) { return img.getAttribute(a); });
      var next = to.map(function (a) { return img.getAttribute(a); });
      to.forEach(function (a, i) { img.setAttribute(a, held[i]); });
      from.forEach(function (a, i) { img.setAttribute(a, next[i]); });
    });
  }

  /* ---------------------------------------------------------------------
     The costume gallery.
     With the skin on, the hero photograph becomes a stack the reader can
     press through. The first one is whatever the markup's data-season-src
     names, so the swap above still does the real work and this only takes
     over from the second press onward - which means the skin looks right
     before this code has done anything, and a reader who never presses sees
     exactly what they saw before.

     Each entry carries its own alt text and its own intrinsic size for the
     same reason the swap does: the files are different shapes and a stale
     width/height pair reserves the wrong box.
     ------------------------------------------------------------------- */
  /* Order is the campaign's, 24 Oct 2026. Entry one has to match the
     data-season-src in the markup - that attribute is what the swap paints
     before any of this runs, and the two disagreeing would flash one
     costume and settle on another. Move one, move both. */
  /* Order is the campaign's, 24 Oct 2026. Entry one has to match the
     data-season-src in the markup - that attribute is what the swap paints
     before any of this runs, and the two disagreeing would flash one
     costume and settle on another. Move one, move both, alt text included.
     Dale Cooper was asked for first and went back to second: his source is
     214px against everyone else's 700-plus, and leading the skin with the
     one soft picture is not what it is for. */
  var COSTUMES = [
    { src: 'assets/dan-halloween.jpg', w: 761, h: 761,
      alt: 'Dan in costume as Max from Where the Wild Things Are, in a white wolf suit and a gold paper crown.' },
    { src: 'assets/dan-hw-detective.jpg', w: 214, h: 214,
      alt: 'Dan in costume as Dale Cooper: a trench coat, a dictaphone and a mug of coffee.' },
    { src: 'assets/dan-hw-hermes.jpg', w: 700, h: 700,
      alt: 'Dan in costume as Hermes, in a toga and a winged helmet, holding a caduceus.' },
    { src: 'assets/dan-hw-rocker.jpg', w: 700, h: 700,
      alt: 'Dan in costume as a rock guitarist, in a headband and a sleeveless shirt, playing a cardboard guitar.' },
    { src: 'assets/dan-hw-zeddy.jpg', w: 700, h: 700,
      alt: 'Dan in a bear costume at a row of payphones, mid-snarl.' }
  ];

  var costume = 0;
  var shuffle = null, shuffleSay = null;

  function heroPhoto() { return document.querySelector('.hero-photo'); }

  function showCostume(i) {
    var img = heroPhoto();
    if (!img) return;
    costume = (i + COSTUMES.length) % COSTUMES.length;
    var c = COSTUMES[costume];
    img.setAttribute('src', c.src);
    img.setAttribute('alt', c.alt);
    img.setAttribute('width', c.w);
    img.setAttribute('height', c.h);
    if (shuffle) {
      shuffle.setAttribute('aria-label',
        'Next costume. Showing ' + (costume + 1) + ' of ' + COSTUMES.length + '.');
    }
    /* An <img> whose alt changes announces nothing, so the description goes
       to a live region as well. Only after a press - saying it on arrival
       would read the photograph out twice. */
    if (shuffleSay) shuffleSay.textContent = c.alt + ' ' + (costume + 1) + ' of ' + COSTUMES.length + '.';
  }

  /* The button is laid over the photograph rather than wrapped around it:
     the frame, the mat and the drafting band behind it are all positioned
     against each other, and re-parenting the picture to make it a button
     would move all three. Built with the skin and removed with it, like the
     spider, so the regular site carries none of it. */
  function addShuffle() {
    var frame = document.querySelector('.photo-slot--hero .photo-frame');
    if (!frame || shuffle) return;
    shuffle = document.createElement('button');
    shuffle.type = 'button';
    shuffle.className = 'hw-shuffle';
    shuffle.setAttribute('aria-label',
      'Next costume. Showing 1 of ' + COSTUMES.length + '.');
    shuffle.innerHTML = '<span class="hw-shuffle__hint" aria-hidden="true">Next costume</span>';
    shuffle.addEventListener('click', function () { showCostume(costume + 1); });
    frame.appendChild(shuffle);

    shuffleSay = document.createElement('p');
    shuffleSay.className = 'sr-only';
    shuffleSay.setAttribute('aria-live', 'polite');
    frame.appendChild(shuffleSay);
  }

  function dropShuffle() {
    if (shuffle) { shuffle.remove(); shuffle = null; }
    if (shuffleSay) { shuffleSay.remove(); shuffleSay = null; }
    costume = 0;
  }

  /* ---------------------------------------------------------------------
     Easter eggs: a spider on the hero's right-hand cobweb and a pumpkin
     hidden in the footer. Both are built here and removed again when the
     skin goes off, so the regular site carries none of their markup. The
     stylesheet hides them under high contrast, which is why nothing below
     has to ask what mode the reader is in.
     ------------------------------------------------------------------- */
  var VOTE_URL = 'https://guelph.ca/city-government/mayor-and-council/' +
                 'municipal-elections/2026-municipal-and-school-board-elections-voting-locations/';

  var SPIDER = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
    '<g stroke="currentColor" stroke-width="2.6" stroke-linecap="round">' +
    '<path d="M16 18 C10 15, 7 10, 6 5"/><path d="M16 20 C9 20, 5 18, 2 15"/>' +
    '<path d="M16 22 C9 24, 6 28, 4 32"/><path d="M17 24 C13 28, 12 33, 12 37"/>' +
    '<path d="M24 18 C30 15, 33 10, 34 5"/><path d="M24 20 C31 20, 35 18, 38 15"/>' +
    '<path d="M24 22 C31 24, 34 28, 36 32"/><path d="M23 24 C27 28, 28 33, 28 37"/></g>' +
    '<ellipse cx="20" cy="23" rx="7.5" ry="8.5" fill="currentColor"/>' +
    '<circle cx="20" cy="14" r="5" fill="currentColor"/>' +
    '<circle cx="18" cy="13" r="1.6" fill="#FFFFFF"/><circle cx="22.4" cy="13" r="1.6" fill="#FFFFFF"/>' +
    '<circle cx="18" cy="13.3" r="0.7" fill="currentColor"/><circle cx="22.4" cy="13.3" r="0.7" fill="currentColor"/></svg>';

  var PUMPKIN = '<svg viewBox="0 0 40 40" aria-hidden="true">' +
    '<path d="M20.6 9.5 C20.6 6.5 22 4 25 3.2" stroke="#4E7A33" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M20 10 C13 10 8 15.5 8 22.5 C8 29.5 13 35 20 35 C27 35 32 29.5 32 22.5 C32 15.5 27 10 20 10 Z" fill="#FF7518"/>' +
    '<path d="M14.6 10.9 C12.2 13.6 11.2 17.8 11.2 22.5 C11.2 27.2 12.2 31.4 14.6 34.1" stroke="#D4600E" stroke-width="1.5" fill="none"/>' +
    '<path d="M25.4 10.9 C27.8 13.6 28.8 17.8 28.8 22.5 C28.8 27.2 27.8 31.4 25.4 34.1" stroke="#D4600E" stroke-width="1.5" fill="none"/>' +
    '<path d="M13.5 19.5 L17.8 19.5 L15.6 15.6 Z" fill="#1A1226"/>' +
    '<path d="M26.5 19.5 L22.2 19.5 L24.4 15.6 Z" fill="#1A1226"/>' +
    '<path d="M13 25 L16 24 L17.6 26.4 L20 24.6 L22.4 26.4 L24 24 L27 25 L25.6 29.6 L14.4 29.6 Z" fill="#1A1226"/></svg>';


  var stillSpider = null;

  function stillness() {
    return (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
           root.getAttribute('data-motion') === 'reduced';
  }

  /* ---------------------------------------------------------------------
     The heads.
     Press the spider and a dozen of the candidate's head rain down the
     page. The whole thing is one fixed layer with pointer-events off, so it
     cannot cover a link, shift the layout or widen the page - it is painted
     over the top and taken away again.

     aria-hidden, because it is a visual joke with nothing to read: the
     spider's own label is what a screen reader gets, and a live region
     announcing twelve heads would be noise rather than information.

     A reader who asked for less motion still gets the joke, they just get it
     standing still - the heads fade up where they are and fade out again,
     rather than falling. Checked against both the OS setting and the
     accessibility panel, the same pair the spider's thread checks.
     ------------------------------------------------------------------- */
  var headLayer = null, headTimer = null;

  /* How many comes off the width, because a count that reads as a downpour
     on a desktop is a solid wall of face on a phone. One head per 38px of
     viewport, floored and capped so neither end gets silly. 360px gives 16,
     1280 gives 34, and anything wider stays at 40. */
  function headCount() {
    return Math.max(16, Math.min(40, Math.round(window.innerWidth / 38)));
  }

  function clearHeads() {
    clearTimeout(headTimer);
    headTimer = null;
    if (headLayer) { headLayer.remove(); headLayer = null; }
  }

  function dropHeads() {
    clearHeads();
    var still = stillness();
    headLayer = document.createElement('div');
    headLayer.className = 'hw-heads' + (still ? ' is-still' : '');
    headLayer.setAttribute('aria-hidden', 'true');

    var n = headCount();
    for (var i = 0; i < n; i++) {
      var img = document.createElement('img');
      img.src = 'assets/dan-head.png';
      img.alt = '';
      img.width = 217; img.height = 300;
      img.className = 'hw-head';
      /* Spread across the width, with a little jitter so twelve heads do not
         come down in a comb. The last one is nudged back inside, because a
         head centred at 100% would hang half off the right-hand edge. */
      var lane = (i + 0.5) / n * 100 + (Math.random() * 7 - 3.5);
      img.style.left = Math.min(94, Math.max(2, lane)) + '%';
      img.style.width = (54 + Math.random() * 46) + 'px';
      if (still) {
        img.style.top = (8 + Math.random() * 74) + 'vh';
        img.style.animationDelay = (Math.random() * 0.3).toFixed(2) + 's';
      } else {
        img.style.animationDuration = (2.3 + Math.random() * 1.9).toFixed(2) + 's';
        /* Spread over a wider window than the twelve needed: dropping forty
           at once is a curtain, dropping them over two seconds is rain. */
        img.style.animationDelay = (Math.random() * 2.1).toFixed(2) + 's';
        img.style.setProperty('--spin', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      }
      headLayer.appendChild(img);
    }
    document.body.appendChild(headLayer);
    /* Longest run is delay + duration; clear a beat after the last one. */
    headTimer = setTimeout(clearHeads, still ? 2600 : 6800);
  }

  function addSpider(hero) {
    /* A real <button> with a real label, in the tab order from the moment it
       exists: pressing it does something, so the egg is the same egg for
       someone on a keyboard or a screen reader rather than a door only a
       mouse can open. */
    var sp = document.createElement('button');
    sp.type = 'button';
    sp.className = 'hw-spider';
    sp.setAttribute('aria-label', 'A spider in the cobweb. Press it.');
    sp.innerHTML = '<span class="hw-spider__thread"></span>' + SPIDER;
    sp.addEventListener('click', function () {
      /* Hover does the work on a pointer; a tap has no hover, so a touch
         drops it and it climbs back on its own. */
      sp.classList.add('is-down');
      clearTimeout(stillSpider);
      stillSpider = setTimeout(function () { sp.classList.remove('is-down'); }, 2400);
      dropHeads();
    });
    hero.appendChild(sp);
  }

  var found = null;

  function dialog() {
    if (found) return found;
    found = document.createElement('dialog');
    found.className = 'hw-found';
    found.setAttribute('aria-labelledby', 'hw-found-h');
    found.innerHTML =
      '<div class="hw-found__inner">' +
      '<div class="hw-found__art" aria-hidden="true">' + PUMPKIN + '</div>' +
      '<h2 id="hw-found-h">You found the pumpkin.</h2>' +
      '<p>Here is the treat: make sure you know where to vote on Monday, October 26. ' +
      'Polls are open 10am to 8pm.</p>' +
      '<p><a href="' + VOTE_URL + '" target="_blank" rel="noopener noreferrer">' +
      'Voting locations and accessibility<span class="sr-only"> (opens in a new tab)</span></a></p>' +
      '<p class="hw-found__next">One more thing is hidden on this page. ' +
      'There is a spider in the cobweb at the very top. Go and press it.</p>' +
      '<button type="button" class="btn btn--outline">Close</button></div>';
    found.querySelector('.hw-found__inner > button').addEventListener('click', function () { found.close(); });
    document.body.appendChild(found);
    return found;
  }

  function addPumpkin(footer) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hw-pumpkin';
    /* The name is what it is. A screen reader reader gets to find it too, and
       hiding the fact that it is a pumpkin would only make the dialog
       confusing when it opens. */
    btn.setAttribute('aria-label', 'A hidden pumpkin');
    btn.innerHTML = PUMPKIN;
    btn.addEventListener('click', function () {
      var d = dialog();
      if (typeof d.showModal === 'function') d.showModal();
    });
    footer.appendChild(btn);
  }

  function eggs(halloween) {
    var hero = document.querySelector('.hero');
    var footer = document.querySelector('.site-footer');
    [].forEach.call(document.querySelectorAll('.hw-spider, .hw-pumpkin'),
      function (el) { el.remove(); });
    if (!halloween) {
      /* The eggs are reachable only through the skin, so leaving the skin
         takes them with it - card closed, heads cleared, buttons gone. */
      if (found && found.open) found.close();
      clearHeads();
      dropShuffle();
      return;
    }
    if (hero) addSpider(hero);
    addShuffle();
    if (footer) addPumpkin(footer);
  }

  /* Anyone who pressed the button while the choice was still being stored
     has a stale atkinson-season key sitting on their device. Nothing reads
     it any more, so clear it: the footer tells readers the only thing this
     page keeps in their browser is their accessibility settings, and that
     should go on being exactly true rather than nearly true. */
  try { localStorage.removeItem('atkinson-season'); } catch (e) {}

  /* Nothing restores the skin any more, so there is nothing to catch up on:
     the page always starts regular. Kept as a guard rather than deleted
     because the attribute is still the single source of truth, and anything
     that ever sets it early - a date window, say - should find the rest of
     the page agreeing with it. */
  if (on()) { photos(true); eggs(true); }

  btn.addEventListener('click', function () {
    if (on()) {
      root.removeAttribute('data-season');
      photos(false);
      eggs(false);
    } else {
      root.setAttribute('data-season', 'halloween');
      photos(true);
      eggs(true);
    }
    label();
  });

  label();
  document.body.appendChild(btn);
})();

/* ---------------------------------------------------------------------------
   Keep --anchor-offset in step with the header.
   The sticky header is not one height: two rows below 860px, one above, and
   every accessibility mode rewraps it - measured between 73px and 203px. The
   breakpoint values in the stylesheet are right in the default mode and short
   in the others, so an in-page jump could drop a heading under the header.
   With scripting on, measure the header and keep the variable in step; with
   it off the breakpoint values stand, which is what the page did before. The
   22px is the clearance those values already carried.
   --------------------------------------------------------------------------- */
(function () {
  var header = document.querySelector('.site-header');
  if (!header || typeof ResizeObserver !== 'function') return;
  function set() {
    var h = Math.round(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--anchor-offset', (h + 22) + 'px');
  }
  new ResizeObserver(set).observe(header);
  set();
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
