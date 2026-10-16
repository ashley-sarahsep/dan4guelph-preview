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
   the same reason the accessibility panel is not in the markup either. The
   choice is remembered in localStorage on the reader's own device, like the
   accessibility settings, and the inline script in <head> re-applies it
   before first paint so the page never flashes the wrong way round.
   The label always says what the next press does.
   --------------------------------------------------------------------------- */
(function () {
  var KEY = 'atkinson-season';
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


  /* ---------------------------------------------------------------------
     James's Quest.
     A three room parser adventure hidden behind both eggs: find the pumpkin,
     and it tells you to go looking for the spider; tap the spider and the
     game opens. Two steps and the length of the page between them, which is
     what "a bit hard to get to" was asked for.

     An homage to the genre the candidate's son loves, not to anybody's
     property: the verb and noun parser, the score in the corner and the
     deadpan refusals are mechanics. No Sierra art, text, music or names.
     Nobody can die in it, which is the one place it parts company with the
     originals on purpose.
     ------------------------------------------------------------------- */
  var HERO = 'James';

  /* The game is finished enough to play and not finished enough to show, so
     it is switched off while the campaign works on the copy and the art.
     Off means the chain never arms: the spider stays a spider that drops on
     a thread, and the pumpkin's card stops at the voting link rather than
     pointing anywhere. Flip this to true and everything below wakes up.
     It is a constant rather than a difference injected by
     tools/build-preview.py on purpose - that script changes index.html and
     nothing else, so that a diff between the two public repositories stays
     worth reading. A fourth difference, in a second file, would cost more
     than it buys. */
  var QUEST_READY = false;

  function art(inner) {
    return '<svg class="quest__scene" viewBox="0 0 320 132" aria-hidden="true">' + inner + '</svg>';
  }
  var ART_HALL = art(
    '<rect width="320" height="132" fill="#0E0A17"/>' +
    '<rect x="196" y="22" width="78" height="110" rx="4" fill="#3A2A1C"/>' +
    '<rect x="204" y="30" width="62" height="60" rx="3" fill="#2A1E14"/>' +
    '<circle cx="262" cy="104" r="3.5" fill="#FFC14D"/>' +
    '<rect x="0" y="118" width="320" height="14" fill="#241B2E"/>' +
    '<rect x="34" y="26" width="52" height="5" rx="2" fill="#4A3B63"/>' +
    '<path d="M44 31 l-6 26 h14 z" fill="#6A0DAD"/><path d="M70 31 l-6 22 h12 z" fill="#8A2BE2"/>' +
    '<ellipse cx="140" cy="112" rx="30" ry="11" fill="#1A1226"/>' +
    '<circle cx="117" cy="105" r="8" fill="#1A1226"/>' +
    '<path d="M111 99 l-1 -7 l6 4 z" fill="#1A1226"/><path d="M123 99 l1 -7 l-6 4 z" fill="#1A1226"/>' +
    '<path d="M168 112 q14 -4 10 -14" stroke="#1A1226" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M113 104 h3 M120 104 h3" stroke="#FFC14D" stroke-width="2" stroke-linecap="round"/>'
  );
  var ART_FRONT = art(
    '<rect width="320" height="132" fill="#0E0A17"/>' +
    '<rect x="0" y="118" width="320" height="14" fill="#241B2E"/>' +
    '<rect x="26" y="18" width="92" height="74" rx="3" fill="#3A2F4F"/>' +
    '<rect x="32" y="24" width="80" height="62" fill="#1A1226"/>' +
    '<rect x="34" y="26" width="36" height="58" fill="#FFC14D"/>' +
    '<rect x="74" y="26" width="36" height="58" fill="#FFC14D"/>' +
    '<rect x="20" y="14" width="18" height="84" rx="4" fill="#8A2BE2"/>' +
    '<rect x="106" y="14" width="18" height="84" rx="4" fill="#8A2BE2"/>' +
    '<rect x="150" y="54" width="118" height="8" fill="#3A2A1C"/>' +
    '<rect x="186" y="38" width="30" height="16" rx="3" fill="#D42351"/>' +
    '<rect x="226" y="40" width="26" height="14" rx="2" fill="#107A93"/>' +
    '<rect x="252" y="84" width="16" height="34" rx="6" fill="#2A2139"/>' +
    '<path d="M260 84 v-34" stroke="#1A1226" stroke-width="5"/>' +
    '<path d="M260 50 q10 0 10 9" stroke="#6A5B86" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<rect x="150" y="96" width="76" height="22" rx="5" fill="#3A2F4F"/>'
  );
  var ART_GATE = art(
    '<rect width="320" height="132" fill="#0E0A17"/>' +
    '<rect x="0" y="116" width="320" height="16" fill="#241B2E"/>' +
    '<g stroke="#6A5B86" stroke-width="5" stroke-linecap="round">' +
    '<path d="M96 116 V34"/><path d="M124 116 V28"/><path d="M152 116 V24"/>' +
    '<path d="M180 116 V28"/><path d="M208 116 V34"/>' +
    '<path d="M92 60 H212"/><path d="M92 92 H212"/>' +
    '<path d="M96 34 Q152 10 208 34"/></g>' +
    '<rect x="212" y="40" width="20" height="9" rx="3" fill="#FFA500"/>' +
    '<circle cx="36" cy="92" r="9" fill="#F7F2E8"/>' +
    '<rect x="29" y="101" width="14" height="19" rx="5" fill="#8A2BE2"/>' +
    '<circle cx="62" cy="74" r="12" fill="#F7F2E8"/>' +
    '<rect x="50" y="88" width="24" height="32" rx="7" fill="#107A93"/>'
  );
  var ART_SCHOOL = art(
    '<rect width="320" height="132" fill="#0E0A17"/>' +
    '<rect x="40" y="20" width="240" height="96" fill="#2A2139"/>' +
    '<path d="M32 20 L160 -2 L288 20 Z" fill="#1A1226"/>' +
    '<rect x="64" y="40" width="34" height="28" fill="#FFC14D"/>' +
    '<rect x="110" y="40" width="34" height="28" fill="#FFC14D"/>' +
    '<rect x="176" y="40" width="34" height="28" fill="#3A2F4F"/>' +
    '<rect x="222" y="40" width="34" height="28" fill="#3A2F4F"/>' +
    '<rect x="138" y="80" width="44" height="36" rx="3" fill="#3A2A1C"/>' +
    '<rect x="0" y="116" width="320" height="16" fill="#241B2E"/>' +
    '<circle cx="232" cy="98" r="7" fill="#F7F2E8"/>' +
    '<rect x="226" y="105" width="12" height="13" rx="4" fill="#D42351"/>' +
    '<ellipse cx="262" cy="116" rx="18" ry="5" fill="#107A93" opacity="0.65"/>' +
    '<rect x="256" y="110" width="11" height="7" rx="3" fill="#FF7518"/>'
  );

  /* The world. Rooms, items and flags are data; the verbs below are the only
     code that knows how to act on them. Adding a room or a puzzle means
     editing this table and nothing else. */
  var ROOMS = {
    hall: {
      name: 'The front hall',
      art: ART_HALL,
      look: function (f) {
        return 'The front hall, on the morning of the Big Day. Coats, chaos, one small window. ' +
          (f.curtains
            ? 'A long bar of sunlight has come through from the front room and landed on the mat.'
            : 'The cat is asleep on a lump by the door, and the lump is boot shaped.') +
          ' The front room is west. The front door is north.';
      },
      exits: { west: 'front', north: 'street' }
    },
    front: {
      name: 'The front room',
      art: ART_FRONT,
      look: function (f) {
        return 'Books, a battered sofa, and a window with the curtains ' +
          (f.curtains ? 'wide open, pouring light across the floor and out into the hall.' : 'firmly shut.') +
          ' There is a tin on the shelf and an umbrella in the stand. The hall is east.';
      },
      exits: { east: 'hall' }
    },
    street: {
      name: 'The street',
      art: ART_GATE,
      look: function (f) {
        return 'Your street, going quiet and golden. A great grey gate guards the path to the school, ' +
          (f.gate ? 'and it stands wide open.' : 'and its latch sits one whole Dad above your head.') +
          (f.binmoved ? ' The blue bin is parked against the gatepost.' : ' A blue bin sits by the kerb.') +
          ' Dad is beside you with a big box of papers in both arms. Home is south.' +
          (f.gate ? ' The school is north.' : '');
      },
      exits: { south: 'hall' }
    },
    yard: {
      name: 'The schoolyard',
      art: ART_SCHOOL,
      look: function (f) {
        return 'The schoolyard. A warm yellow light is on in the library. On the step sits a smaller kid, ' +
          (f.mittengiven ? 'wearing two mittens and looking enormously improved.' : 'staring sadly at their shoes.') +
          (f.mitten || f.mittengiven ? '' : ' A red mitten is down in the storm drain, out of reach.') +
          ' The street is south.' + (f.mittengiven ? ' The side door is north.' : '');
      },
      exits: { south: 'street' }
    }
  };

  /* Where each thing starts, what it is called, and what you see when you
     look at it. `fixed` things cannot be picked up, which is how a parser
     game says "that is scenery" without being rude about it. */
  var THINGS = {
    boot: { at: null, words: /\b(boot|boots|shoe)\b/,
      desc: 'A sturdy brown boot. Dad owns two and can currently find one.' },
    umbrella: { at: 'front', words: /\b(umbrella|brolly)\b/,
      desc: 'A big black umbrella with a hooked wooden handle. The hook looks useful.' },
    tarts: { at: 'front', words: /\b(tin|tart|tarts|butter)\b/,
      desc: 'A tin of butter tarts. Raspberry coconut. Still slightly warm.' },
    mitten: { at: null, words: /\b(mitten|glove)\b/,
      desc: 'One red mitten, spectacularly damp, having the soggiest morning of its life.' },
    cat: { at: 'hall', fixed: true, words: /\b(cat|kitty|lump)\b/,
      desc: function (f) {
        return f.curtains
          ? 'The cat has relocated to the bar of sunlight and is lying in it like a puddle of cat.'
          : 'A cosy, comfy, completely immovable lump of cat, sitting squarely on the shape of a boot.';
      } },
    curtains: { at: 'front', fixed: true, words: /\b(curtain|curtains|window|blind|blinds)\b/,
      desc: function (f) { return f.curtains ? 'Open, and doing excellent work.' : 'Shut tight. Behind them, you suspect, is the morning.'; } },
    dad: { at: '*', fixed: true, words: /\b(dad|daddy|father|papa)\b/,
      desc: 'Dad. One boot on if you are early, two if you have been clever. His hair is doing something wildly optimistic.' },
    gate: { at: 'street', fixed: true, words: /\b(gate|latch|lock)\b/,
      desc: function (f) { return f.gate ? 'Open at last, and rather pleased about it.' : 'One simple latch, sitting one whole Dad above your head.'; } },
    bin: { at: 'street', fixed: true, words: /\b(bin|recycling|crate|box)\b/,
      desc: function (f) { return f.binmoved ? 'Parked against the gatepost, lid down, looking very stand-on-able.' : 'A big blue recycling bin by the kerb. Empty, by the sound of it.'; } },
    drain: { at: 'yard', fixed: true, words: /\b(drain|grate|gutter|puddle)\b/,
      desc: function (f) { return f.mitten || f.mittengiven ? 'A storm drain. Mittenless now.' : 'A storm drain. Down in the dark, a red mitten, well out of arm reach.'; } },
    kid: { at: 'yard', fixed: true, words: /\b(kid|child|girl|boy|them|they)\b/,
      desc: function (f) { return f.mittengiven ? 'Two mittens. Vastly cheerier.' : 'Smaller than you. Wearing one mitten, which is absolutely the wrong number of mittens.'; } }
  };

  /* The puzzles. Each is a guard and a result: when the guard is happy the
     result fires once, banks its points and sets its flag. Everything else
     the parser understands - looking, taking, going - is generic. */
  var DEEDS = [
    { id: 'curtains', at: 'front', points: 5,
      m: /\b(open|pull|draw|move|up)\b.*\b(curtain|curtains|blind|blinds)\b/,
      r: 'You heave the curtains back. Light floods in, crosses the floor, goes out through the ' +
         'door and lies down in the hall like something that has been waiting all morning.' },
    { id: 'boot', at: 'hall', points: 5, needs: 'curtains',
      blockR: 'You tug at the lump. The cat opens one eye and sits down harder. ' +
              'Cats get heavier on purpose. It is their very best trick. ' +
              'What this cat wants is somewhere better to be.',
      m: /\b(take|get|grab|pull|lift|pick)\b.*\b(boot|lump|shoe)\b/,
      r: 'The cat has already moved to the sunbeam. You lift a slightly warm boot and carry it ' +
         'to Dad, who hauls it on. "Hero," he says.',
      then: function () { THINGS.boot.at = 'carried'; } },
    { id: 'binmoved', at: 'street', points: 5,
      m: /\b(push|shove|drag|pull|move|roll|put)\b.*\b(bin|recycling|crate|box)\b/,
      r: 'You lean on the bin and walk it, scraping and grumbling, across to the gatepost.' },
    { id: 'gate', at: 'street', points: 10, needs: 'binmoved',
      m: /\b(ask|tell|call|help|lift|hold|steady|boost|dad|father)\b/,
      pre: /\b(stand|climb|get|up|on|top)\b.*\b(bin|recycling|crate|box)\b/,
      preR: 'You clamber up. The latch is close enough to see the rust on it, and the bin is ' +
            'wobbling like a bin that has opinions. You could use a second pair of hands.',
      preId: 'onbin',
      r: 'Dad sets the box down and puts one hand flat on the lid. The wobble stops dead. ' +
         'You stretch, flip the latch with one finger, and the gate groans open. ' +
         '"Team Atkinson," says Dad.' },
    { id: 'mitten', at: 'yard', points: 5, carry: 'umbrella',
      m: /\b(use|hook|fish|get|reach|poke|put|take)\b.*\b(umbrella|brolly|mitten|drain|grate)\b/,
      r: 'You post the umbrella down through the grate, turn the hook, and lift out one red ' +
         'mitten. It is spectacularly wet. The smaller kid watches with enormous interest.',
      then: function () { THINGS.mitten.at = 'carried'; } },
    { id: 'mittengiven', at: 'yard', points: 5, carry: 'mitten',
      m: /\b(give|hand|offer|return|help|wring|squeeze|dry)\b/,
      r: 'You wring it out and hand it over. The kid grins a gappy grin, pulls it on, and points ' +
         'round the side of the school to the door that is actually unlocked - the one everybody ' +
         'forgets. "Thanks," they say, and mean it.',
      then: function () { THINGS.mitten.at = null; } },
    /* Optional points, the way the old games hid a few. */
    { id: 'tartgiven', at: '*', points: 5, carry: 'tarts',
      m: /\b(give|offer|share|hand)\b.*\b(tart|tarts|tin)\b/,
      r: 'You offer Dad a butter tart. He takes one, looks at it, takes a second, and says ' +
         '"well, now the day is properly started." You have one too. Obviously.' }
  ];

  var MISSES = [
    'Nope! Nice try though.',
    'Nothing happens. Dad looks at you encouragingly.',
    'A fine idea. Just not a today idea.',
    'You give it a go. It does not go. You may absolutely go again.',
    'That is not going to work, but it was worth finding out.'
  ];

  var DIRS = { north: 'north', n: 'north', south: 'south', s: 'south',
               east: 'east', e: 'east', west: 'west', w: 'west' };

  var quest = null, here = 'hall', score = 0, missed = 0, flags = {};
  var MAX = 40;

  function carried(id) { return THINGS[id] && THINGS[id].at === 'carried'; }

  function say(text, you) {
    var log = quest.querySelector('.quest__log');
    var p = document.createElement('p');
    if (you) p.className = 'is-you';
    p.textContent = you ? '> ' + text : text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function hintsFor() {
    if (here === 'front') return ['look at curtains', 'open the curtains', 'take umbrella'];
    if (here === 'hall') return flags.curtains ? ['take boot', 'north'] : ['look at cat', 'west'];
    if (here === 'street') {
      if (flags.gate) return ['north', 'look at dad'];
      if (flags.onbin) return ['ask dad for help'];
      if (flags.binmoved) return ['stand on the bin'];
      return ['look at the latch', 'push the bin to the gate'];
    }
    if (here === 'yard') {
      if (flags.mittengiven) return ['north'];
      if (carried('mitten')) return ['give the mitten to the kid'];
      return ['look at the drain', 'hook the mitten with the umbrella'];
    }
    return ['look'];
  }

  function paint() {
    quest.querySelector('.quest__art').innerHTML = ROOMS[here].art;
    quest.querySelector('.quest__score').textContent = 'Score ' + score + ' of ' + MAX;
    quest.querySelector('.quest__where').textContent = ROOMS[here].name;
    var box = quest.querySelector('.quest__hints');
    box.innerHTML = '';
    hintsFor().forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'quest__hint'; b.textContent = h;
      b.addEventListener('click', function () { submit(h); });
      box.appendChild(b);
    });
  }

  function describe(id) {
    var t = THINGS[id];
    return typeof t.desc === 'function' ? t.desc(flags) : t.desc;
  }

  function visible(id) {
    var t = THINGS[id];
    return t.at === 'carried' || t.at === '*' || t.at === here;
  }

  function finish() {
    quest.querySelector('.quest__form').hidden = true;
    quest.querySelector('.quest__hints').innerHTML = '';
    say('You and Dad go round the side and in through the forgotten door, together, and the ' +
        'evening starts properly.');
    say('THE END. Score ' + score + ' of ' + MAX + '.');
    if (score < MAX) say('There are ' + (MAX - score) + ' points you did not find. There usually are.');
    say('Nobody can die in this game. That is the one and only way it is not like the old ones.');
  }

  function go(dir) {
    var exits = ROOMS[here].exits, dest = exits[dir];
    if (dir === 'north' && here === 'street' && flags.gate) dest = 'yard';
    if (dir === 'north' && here === 'yard' && flags.mittengiven) { finish(); return; }
    if (dir === 'north' && here === 'hall' && !flags.boot) {
      say('Dad is still hopping about on one boot. You are not going anywhere until that is sorted.');
      return;
    }
    if (dir === 'north' && here === 'street' && !flags.gate) {
      say('The gate is shut, and the latch is a long way up.');
      return;
    }
    if (!dest) { say('You cannot go ' + dir + ' from here.'); return; }
    here = dest;
    paint();
    say(ROOMS[here].look(flags));
  }

  function submit(raw) {
    var said = String(raw || '').trim();
    if (!said) return;
    say(said, true);
    var t = said.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

    /* Movement first, because "north" must never be mistaken for a noun. */
    var first = t.split(' ')[0];
    if (DIRS[first] || /^go /.test(t)) {
      var d = DIRS[first] || DIRS[t.split(' ')[1]];
      if (d) { go(d); return; }
    }
    if (/\b(inventory|inv|i am carrying)\b/.test(t) || t === 'i') {
      var held = Object.keys(THINGS).filter(carried);
      say(held.length ? 'You are carrying: ' + held.join(', ') + '.' : 'You are carrying nothing at all.');
      return;
    }
    if (/^(look|l)$/.test(t) || /^look around$/.test(t)) { say(ROOMS[here].look(flags)); return; }
    /* Exact match only. A loose /help/ here swallowed "ask dad for help",
       which is the solution to the gate - the game was unwinnable and the
       hint button under the box typed the very phrase that broke it. */
    if (/^(help|hint|stuck|what now|what do i do)$/.test(t)) {
      say('Press a button under the box, or type two words. LOOK AT things, TAKE things, ' +
          'PUSH things, GIVE things, and go NORTH, SOUTH, EAST or WEST.');
      return;
    }

    /* A puzzle, if one fits here and you are carrying what it wants. */
    for (var i = 0; i < DEEDS.length; i++) {
      var dd = DEEDS[i];
      if (flags[dd.id]) continue;
      if (dd.at !== '*' && dd.at !== here) continue;
      if (dd.carry && !carried(dd.carry)) continue;
      /* A two-stage puzzle: the pre step has to happen before the real one,
         and until it does the real verb gets the pre step's answer. */
      if (dd.pre && !flags[dd.preId]) {
        if (dd.pre.test(t)) { flags[dd.preId] = true; say(dd.preR); return; }
        if (dd.m.test(t)) { say('Dad has his arms full of papers, and you are still a long way below that latch.'); return; }
        continue;
      }
      if (dd.needs && !flags[dd.needs]) {
        /* Reaching for the right thing too early deserves a real answer, not
           "there is nothing like that here". */
        if (dd.blockR && dd.m.test(t)) { say(dd.blockR); return; }
        continue;
      }
      if (!dd.m.test(t)) continue;
      flags[dd.id] = true;
      score += dd.points;
      if (dd.then) dd.then();
      say(dd.r);
      paint();
      return;
    }

    /* Generic verbs over whatever is in reach. */
    var noun = null;
    for (var id in THINGS) { if (visible(id) && THINGS[id].words.test(t)) { noun = id; break; } }

    if (/\b(look|examine|x|see|inspect|read)\b/.test(t)) {
      say(noun ? describe(noun) : 'You look, and see nothing like that here.');
      return;
    }
    if (/\b(take|get|grab|pick|steal)\b/.test(t)) {
      if (!noun) { say('There is nothing like that to take.'); return; }
      if (carried(noun)) { say('You already have it.'); return; }
      if (THINGS[noun].fixed) { say('That is not the sort of thing that comes with you.'); return; }
      THINGS[noun].at = 'carried';
      say('Taken.');
      return;
    }
    if (/\b(drop|put down)\b/.test(t) && noun && carried(noun)) {
      THINGS[noun].at = here; say('Dropped.'); return;
    }
    if (/\b(pet|stroke|scritch|scratch|pat|tickle|cuddle)\b/.test(t) && noun === 'cat') {
      say(flags.curtains
        ? 'The cat, warm as a scone, permits it.'
        : 'You scritch away. The cat purrs, and does not move one inch. Cats get heavier on purpose.');
      return;
    }
    if (/\b(talk|say|hello|hi|ask)\b/.test(t) && noun === 'dad') {
      say('"Nearly there," says Dad. "Thanks for helping. I mean it."');
      return;
    }

    say(MISSES[missed % MISSES.length]);
    missed += 1;
  }

  function buildQuest() {
    if (quest) return quest;
    quest = document.createElement('dialog');
    quest.className = 'quest';
    quest.setAttribute('aria-labelledby', 'quest-h');
    quest.innerHTML =
      '<div class="quest__inner">' +
      '<div class="quest__bar"><span id="quest-h">' + HERO + "'s Quest</span>" +
      '<span class="quest__where"></span>' +
      '<span class="quest__score">Score 0 of 40</span></div>' +
      '<div class="quest__art"></div>' +
      '<div class="quest__body">' +
      /* tabindex 0 because the log scrolls: a region you can scroll with a
         mouse but not with a keyboard is a WCAG failure, and axe caught it. */
      '<div class="quest__log" role="log" aria-live="polite" tabindex="0"></div>' +
      '<div class="quest__hints"></div>' +
      '<form class="quest__form">' +
      '<label class="sr-only" for="quest-in">Type what to do next</label>' +
      '<input class="quest__input" id="quest-in" type="text" autocomplete="off" ' +
      'placeholder="type what you want to do, then press enter" />' +
      '<button type="submit" class="btn btn--donate">Do it</button>' +
      '</form>' +
      '<div class="quest__foot">' +
      '<p class="quest__note">Two words is usually plenty. LOOK AT things, TAKE them, ' +
      'PUSH them, GIVE them. Go NORTH, SOUTH, EAST, WEST. Type I for what you are carrying.</p>' +
      '<button type="button" class="btn btn--outline quest__close">Close</button>' +
      '</div></div></div>';
    quest.querySelector('.quest__form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = quest.querySelector('.quest__input');
      submit(input.value);
      input.value = '';
    });
    quest.querySelector('.quest__close').addEventListener('click', function () { quest.close(); });
    document.body.appendChild(quest);
    return quest;
  }

  function openQuest() {
    buildQuest();
    /* A clean world every time. The item table is mutated during play, so it
       has to be put back as well as the counters - otherwise a second go
       starts with the boot already in hand. */
    here = 'hall'; score = 0; missed = 0; flags = {};
    THINGS.boot.at = null;
    THINGS.mitten.at = null;
    THINGS.umbrella.at = 'front';
    THINGS.tarts.at = 'front';
    quest.querySelector('.quest__log').innerHTML = '';
    quest.querySelector('.quest__form').hidden = false;
    paint();
    say('It is the morning of the Big Day. Dad is hopping about on one foot by the front door. ' +
        '"' + HERO + '!" he hollers. "I have one boot. I need two boots. There are no boots anywhere!"');
    say(ROOMS.hall.look(flags));
    if (typeof quest.showModal === 'function') quest.showModal();
  }

  var stillSpider = null;

  function stillness() {
    return (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
           root.getAttribute('data-motion') === 'reduced';
  }

  /* Set once the pumpkin has been found. Session only - finding it again
     next time is part of the fun, and nothing about a child's game belongs
     in storage. */
  var pumpkinFound = false;

  function addSpider(hero) {
    /* A real <button> from the start, but hidden from the accessibility tree
       and out of the tab order while it is only a spider. The moment the
       pumpkin names it, both of those come off and it is an ordinary labelled
       button - so the hunt is the same hunt for someone using a keyboard or a
       screen reader, rather than a door only a mouse can open. */
    var sp = document.createElement('button');
    sp.type = 'button';
    sp.className = 'hw-spider';
    sp.setAttribute('aria-hidden', 'true');
    sp.tabIndex = -1;
    sp.innerHTML = '<span class="hw-spider__thread"></span>' + SPIDER;
    if (QUEST_READY && pumpkinFound) unmaskSpider(sp);
    sp.addEventListener('click', function () {
      if (QUEST_READY && pumpkinFound) { openQuest(); return; }
      /* Hover does the work on a pointer; a tap has no hover, so a touch
         drops it and it climbs back on its own. */
      sp.classList.add('is-down');
      clearTimeout(stillSpider);
      stillSpider = setTimeout(function () { sp.classList.remove('is-down'); }, 2400);
    });
    hero.appendChild(sp);
  }

  function unmaskSpider(sp) {
    sp.removeAttribute('aria-hidden');
    sp.tabIndex = 0;
    sp.setAttribute('aria-label', 'The spider in the cobweb. Opens ' + HERO + "'s Quest.");
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
      (QUEST_READY
        ? '<p class="hw-found__next">One more thing is hidden on this page. ' +
          'There is a spider in the cobweb at the very top. Go and press it.</p>'
        : '') +
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
      /* Finding the pumpkin is what arms the spider. Two steps, and the whole
         length of the page between them. */
      pumpkinFound = true;
      var sp = QUEST_READY && document.querySelector('.hw-spider');
      if (sp) unmaskSpider(sp);
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
      /* The game is reachable only through the skin, so leaving the skin
         takes it with you. Otherwise the regular site could be left sitting
         behind an open quest, which is the one place it must never appear. */
      if (found && found.open) found.close();
      if (quest && quest.open) quest.close();
      pumpkinFound = false;
      return;
    }
    if (hero) addSpider(hero);
    if (footer) addPumpkin(footer);
  }

  /* A stored choice is already on <html> by now, so catch up before painting
     anything else. */
  if (on()) { photos(true); eggs(true); }

  btn.addEventListener('click', function () {
    if (on()) {
      root.removeAttribute('data-season');
      photos(false);
      eggs(false);
      try { localStorage.removeItem(KEY); } catch (e) {}
    } else {
      root.setAttribute('data-season', 'halloween');
      photos(true);
      eggs(true);
      try { localStorage.setItem(KEY, 'halloween'); } catch (e) {}
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
