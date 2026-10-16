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

  var SCENES = [
    {
      art: ART_HALL,
      open: 'It is the morning of the Big Day. Dad is hopping about on one foot by the front door. ' +
            '"' + HERO + '!" he hollers. "I have one boot. I need two boots. There are no boots anywhere!" ' +
            'The cat is asleep on a lump. The lump is extremely lumpy.',
      hints: ['look at cat', 'take boot', 'pet cat'],
      rules: [
        { m: /(look|examine|x|see)\b.*\b(cat)\b/,
          r: 'The cat is a cosy, comfy, completely immovable lump of cat. Underneath it is a second lump, ' +
             'and that one is exactly boot shaped.' },
        { m: /(look|examine|x|see)\b.*\b(boot|lump|shoe)\b/,
          r: 'No boot to be seen. Only a cat, sitting squarely on the shape of one.' },
        { m: /(take|get|grab|pull|lift)\b.*\b(boot|lump|shoe)\b/,
          r: 'You tug. The cat opens one eye and sits down harder. Cats get heavier on purpose. ' +
             'It is their very best trick.' },
        { m: /(pet|stroke|pat|scratch|scritch|tickle|cuddle|move|push|hug)\b.*\b(cat)\b/, win: true,
          r: 'You scritch the cat behind the ears. It stretches, yawns, and strolls off to find a sunnier spot. ' +
             'And there it is. One boot, slightly warm. Dad hauls it on. "Hero," he says.' },
        { m: /(look|examine|x|see)\b.*\b(dad|father|door)\b/,
          r: 'Dad has one boot on and his hair is doing something wildly optimistic.' }
      ]
    },
    {
      art: ART_GATE,
      open: 'A great grey gate guards the path to the school. The latch is up high. Way, way up high. ' +
            'Dad is right behind you with a big box of papers in both arms.',
      hints: ['look at latch', 'jump', 'ask dad for help'],
      rules: [
        { m: /(look|examine|x|see)\b.*\b(latch|gate|lock)\b/,
          r: 'One simple latch, sitting one whole Dad above your head.' },
        { m: /\b(jump|reach|stretch|hop)\b/,
          r: 'You jump. You are a tremendous jumper, honestly a top ten jumper. The latch is unimpressed.' },
        { m: /(climb|scale)\b/,
          r: 'The bars are cold and slippery, and behind you Dad says "hmmmm" in his Dad voice.' },
        { m: /(ask|tell|call|help|lift|carry|shout|boost|yell)\b.*\b(dad|father|help|me|up)\b/, win: true,
          r: 'You ask. Dad sets the box down, swoops you up by the middle, and you flip that latch with one finger. ' +
             'The gate groans open. "Team Atkinson," says Dad.' },
        { m: /(look|examine|x|see)\b.*\b(box|papers|dad|father)\b/,
          r: 'A big box of papers about schools. Dad has read every single one of them twice.' }
      ]
    },
    {
      art: ART_SCHOOL,
      open: 'The school! A warm yellow light is on in the library. ' +
            'On the step sits a smaller kid, staring sadly at their shoes. ' +
            'Beside them is a puddle. In the puddle is a mitten.',
      hints: ['look at kid', 'take mitten', 'give mitten to kid'],
      rules: [
        { m: /(look|examine|x|see)\b.*\b(kid|child|girl|boy|them)\b/,
          r: 'Smaller than you. Wearing one mitten, which is absolutely the wrong number of mittens.' },
        { m: /(look|examine|x|see)\b.*\b(mitten|puddle)\b/,
          r: 'A red mitten, floating in a puddle, having the soggiest morning of its life.' },
        { m: /(take|get|grab|fish|pick)\b.*\b(mitten|puddle)\b/,
          r: 'You fish the mitten out. It is spectacularly wet. The smaller kid watches you with enormous interest.' },
        { m: /(give|hand|offer|return|help|wring|squeeze|dry)\b/, win: true,
          r: 'You wring it out and hand it over. The kid grins a gappy grin, pulls it on, and points round the ' +
             'side of the school to the door that is actually unlocked - the one everybody forgets. ' +
             'In you go. You and Dad, together.' },
        { m: /(look|examine|x|see)\b.*\b(school|library|light|door)\b/,
          r: 'Warm yellow light in the library window. The front door, you are fairly sure, is locked tight.' }
      ]
    }
  ];

  var MISSES = [
    'Nope! Nice try though.',
    'Nothing happens. Dad looks at you encouragingly.',
    'A fine idea. Just not a today idea.',
    'You give it a go. It does not go. You may absolutely go again.'
  ];

  var quest = null, scene = 0, score = 0, missed = 0;

  function say(text, you) {
    var log = quest.querySelector('.quest__log');
    var p = document.createElement('p');
    if (you) p.className = 'is-you';
    p.textContent = you ? '> ' + text : text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function paint() {
    quest.querySelector('.quest__art').innerHTML = SCENES[scene].art;
    quest.querySelector('.quest__score').textContent = 'Score ' + score + ' of 3';
    var hints = quest.querySelector('.quest__hints');
    hints.innerHTML = '';
    SCENES[scene].hints.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'quest__hint';
      b.textContent = h;
      b.addEventListener('click', function () { submit(h); });
      hints.appendChild(b);
    });
  }

  function finish() {
    quest.querySelector('.quest__hints').innerHTML = '';
    quest.querySelector('.quest__form').hidden = true;
    say('THE END. Score 3 of 3.');
    say('Nobody can die in this game. That is the one and only way it is not like the old ones.');
  }

  function submit(raw) {
    var said = String(raw || '').trim();
    if (!said) return;
    say(said, true);
    var text = said.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ');
    var rules = SCENES[scene].rules, hit = null;
    for (var i = 0; i < rules.length; i++) { if (rules[i].m.test(text)) { hit = rules[i]; break; } }
    if (!hit) {
      if (/\b(help|hint|stuck)\b/.test(text)) {
        say('Press one of the buttons under the box. Or go and LOOK AT something - that is usually how these go.');
      } else {
        say(MISSES[missed % MISSES.length]);
        missed += 1;
      }
      return;
    }
    say(hit.r);
    if (!hit.win) return;
    score += 1;
    scene += 1;
    if (scene >= SCENES.length) { paintScore(); finish(); return; }
    paint();
    say(SCENES[scene].open);
  }

  function paintScore() { quest.querySelector('.quest__score').textContent = 'Score ' + score + ' of 3'; }

  function buildQuest() {
    if (quest) return quest;
    quest = document.createElement('dialog');
    quest.className = 'quest';
    quest.setAttribute('aria-labelledby', 'quest-h');
    quest.innerHTML =
      '<div class="quest__inner">' +
      '<div class="quest__bar"><span id="quest-h">' + HERO + "'s Quest</span>" +
      '<span class="quest__score">Score 0 of 3</span></div>' +
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
      '<p class="quest__note">Two words is usually plenty. LOOK AT things. TAKE things. ASK DAD.</p>' +
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
    scene = 0; score = 0; missed = 0;
    quest.querySelector('.quest__log').innerHTML = '';
    quest.querySelector('.quest__form').hidden = false;
    paint();
    say(SCENES[0].open);
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
    if (pumpkinFound) unmaskSpider(sp);
    sp.addEventListener('click', function () {
      if (pumpkinFound) { openQuest(); return; }
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
      /* Finding the pumpkin is what arms the spider. Two steps, and the whole
         length of the page between them. */
      pumpkinFound = true;
      var sp = document.querySelector('.hw-spider');
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
