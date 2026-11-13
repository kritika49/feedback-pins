/* prototype-comments: right-click "Comment" pins for any HTML prototype.
 * Comments are stored by the Netlify function in examples/comments.mjs
 * (Netlify Blobs) and shared by everyone who opens the same site.
 * Optional: window.__protoNav = { snap(), nav(state), switchPerson(person, domain) } lets the
 * comment list restore the exact app state (page, tab, selected record, previewed person). */
(function() {
  'use strict';
  // Configure with window.PROTO_COMMENTS = {...} BEFORE this script runs. All keys optional.
  //   api:     full URL of the comments function (default: <this origin>/.netlify/functions/comments)
  //   prod:    live site origin, used when the file is opened from disk (file://)
  //   app:     short id of this prototype/role, stored on each comment (for multi-app setups)
  //   session: function() -> {domain, person, role, lang}: who/what state is being previewed
  //   who:     function() -> short text naming the current preview (shown in the comment list)
  //   heading: CSS selector for the element whose text names the current screen
  //   route:   function() -> string naming the current route (default: path + '#/…' hash routes)
  //   layers:  extra CSS selector for modal-like layers (default covers dialog, role=dialog, aria-modal, popover)
  //   tabs:    extra CSS selector for tab-like controls (default: [role=tab])
  //   legacyCtx: [domain, person, role, lang] the prototype opens in (only for comments without ctx)
  //   fabBottom: px from the bottom for the "Comments (N)" button
  var CFG = window.PROTO_COMMENTS || {};
  var origin = /^https?:/.test(location.origin) ? location.origin : (CFG.prod || '');
  var API = CFG.api || (origin + '/.netlify/functions/comments');
  var FAB = CFG.fabBottom || 24;
  var forced = null,
    comments = [],
    pins = {},
    openId = null,
    composing = null,
    authorName = '',
    panelOpen = false;
  try {
    authorName = localStorage.getItem('cm-author') || '';
  } catch (e) {}
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  }, true);
  var host = document.createElement('div');
  host.setAttribute('data-cm-host', '');
  host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647';
  var root = host.attachShadow({
    mode: 'open'
  });
  root.innerHTML = '<style> ' + ':host {all:initial }* {box-sizing:border-box;font-family:"Source Sans 3",system-ui,-apple-system,Segoe UI,Arial,sans-serif }' + '.menu {position:fixed;min-width:168px;padding:4px;background:#fff;border:1px solid #D5DEE7;border-radius:8px;box-shadow:0 8px 24px rgba(1,15,43,.18);color:#012049;font-size:14px }' + '.menu button {display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:6px;background:none;font:inherit;color:inherit;cursor:pointer;text-align:left }' + '.menu button:hover,.menu button:focus-visible {background:#E8EFF6;outline:none }' + '.pin {position:fixed;width:28px;height:28px;margin:-28px 0 0 -2px;border-radius:50% 50% 50% 0;background:#F26B00;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(1,15,43,.35);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0 }' + '.pin:hover,.pin.on {background:#C95500 }.pin.draft {background:#FFB070;color:#3A1A00 }' + '.hl {position:fixed;border:2px solid #F26B00;background:rgba(242,107,0,.08);border-radius:4px;pointer-events:none }' + '.pop {position:fixed;width:280px;padding:12px;background:#fff;border:1px solid #D5DEE7;border-radius:10px;box-shadow:0 12px 32px rgba(1,15,43,.22);color:#012049;font-size:14px }' + '.pop h4 {margin:0 0 6px;font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px }' + '.ts {font-weight:400;color:#6B7F92;font-size:12px }' + '.pop p {margin:0 0 10px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-break:break-word }' + '.on-el {margin:0 0 10px;font-size:12px;color:#6B7F92 }' + '.pop input,.pop textarea {width:100%;display:block;margin:0 0 8px;padding:8px;border:1px solid #9FB4C4;border-radius:6px;font:inherit;font-size:14px;color:#012049;resize:vertical }' + '.pop textarea {min-height:72px }.pop input:focus,.pop textarea:focus {outline:2px solid #1B6FB5;outline-offset:0 }' + '.row {display:flex;justify-content:flex-end;gap:8px }' + '.btn {padding:6px 12px;border-radius:6px;border:1px solid #9FB4C4;background:#fff;color:#012049;font:inherit;font-size:13px;font-weight:600;cursor:pointer }' + '.btn.pri {background:#012049;border-color:#012049;color:#fff }.btn.pri:disabled {opacity:.45;cursor:not-allowed }' + '.toast {position:fixed;left:50%;bottom:20px;transform:translateX(-50%);padding:8px 16px;background:#012049;color:#fff;border-radius:8px;font-size:13px }' + '.fab {position:fixed;right:16px;bottom:' + FAB + 'px;display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:999px;border:0;background:#F26B00;color:#fff;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(1,15,43,.3) }' + '.fab:hover {background:#C95500 }' + '.panel {position:fixed;right:16px;bottom:' + (FAB + 44) + 'px;width:320px;max-height:min(70vh,520px);display:flex;flex-direction:column;background:#fff;border:1px solid #D5DEE7;border-radius:12px;box-shadow:0 12px 32px rgba(1,15,43,.25);color:#012049 }' + '.panel header {padding:12px 16px;font-weight:700;font-size:14px;border-bottom:1px solid #E3EAF1 }' + '.panel ul {list-style:none;margin:0;padding:6px;overflow:auto }' + '.panel li button {display:block;width:100%;text-align:left;padding:8px 10px;border:0;border-radius:8px;background:none;font:inherit;color:inherit;cursor:pointer }' + '.panel li button:hover,.panel li button:focus-visible {background:#E8EFF6;outline:none }' + '.panel .who {display:flex;justify-content:space-between;font-size:13px;font-weight:700 }' + '.panel .txt {font-size:13px;margin-top:2px;line-height:1.35;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden }' + '.panel .meta {font-size:11px;color:#6B7F92;margin-top:4px }' + '.panel .empty {padding:16px 16px;font-size:13px;color:#6B7F92 }' + ' </style>';

  function attach() {
    if (!host.isConnected && document.body) document.body.appendChild(host);
  }
  attach();

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function toast(msg) {
    var t = el('div', 'toast', msg);
    root.appendChild(t);
    setTimeout(function() {
      t.remove();
    }, 3000);
  }
  // ---------- Anchoring ----------
  // Each comment stores TWO anchors so it survives scrolling, layout changes and re-renders:
  //  1) the element that was clicked (+ pixel offset inside it) and
  //  2) the scrolling area that holds it (+ position inside that area's scrollable content).
  function pathOf(node) {
    if (node === document.documentElement) return 'html';
    var parts = [];
    while (node && node !== document.body && node.nodeType === 1) {
      var idx = 1,
        sib = node.previousElementSibling;
      while (sib) {
        if (sib.tagName === node.tagName) idx++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + idx + ')');
      node = node.parentElement;
    }
    return 'body > ' + parts.join(' > ');
  }

  function textOf(node) {
    return (node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function snip(node) {
    return textOf(node).slice(0, 24);
  }

  function isScroller(n) {
    if (n === document.documentElement) return true;
    var cs = getComputedStyle(n);
    return (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) || (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 2);
  }

  function scrollerOf(n) {
    while (n && n !== document.body && n !== document.documentElement) {
      if (n.nodeType === 1 && isScroller(n)) return n;
      n = n.parentElement;
    }
    return document.documentElement;
  }

  function q(sel) {
    try {
      return document.querySelector(sel);
    } catch (e) {
      return null;
    }
  }

  function sized(n) {
    if (!n) return false;
    var r = n.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  // ---------- Layers (modals, drawers, popovers) and tabs ----------
  var LAYER_SEL = 'dialog[open], [role=dialog], [role=alertdialog], [aria-modal=true], [popover]' + (CFG.layers ? ', ' + CFG.layers : '');
  var TAB_SEL = '[role=tab]' + (CFG.tabs ? ', ' + CFG.tabs : '');

  function layerOf(n) {
    var e = n && n.nodeType === 1 ? n : n && n.parentElement;
    try { return e ? e.closest(LAYER_SEL) : null; } catch (x) { return null; }
  }

  function isOn(e) {
    return e.getAttribute('aria-selected') === 'true' || e.getAttribute('aria-pressed') === 'true' || /(^|\s)(is-on|active|selected)(\s|$)/.test(e.className || '');
  }

  function tabLabel(e) {
    return textOf(e).replace(/\s*\d+$/, '').slice(0, 40);
  }

  function tabsAll() {
    var out = [];
    try { document.querySelectorAll(TAB_SEL).forEach(function(e) { if (!host.contains(e)) out.push(e); }); } catch (x) {}
    return out;
  }
  // Labels of the selected tabs that control the area this element is in: the tab's aria-controls panel, a
  // role=tabpanel next to its tab list, or else the first visible element after the tab list (its panel).
  // Content further down the page and unrelated toggles are not tied to the tab.
  function tabsFor(target) {
    var out = [];
    tabsAll().forEach(function(t) {
      if (!isOn(t) || out.length >= 6) return;
      var panel = t.getAttribute('aria-controls') && document.getElementById(t.getAttribute('aria-controls'));
      var gov = false;
      if (panel) gov = panel.contains(target);
      else {
        var list = t.closest('[role=tablist]') || t.parentElement;
        if (list && !list.contains(target)) {
          var first = true;
          for (var sib = list.nextElementSibling; sib; sib = sib.nextElementSibling) {
            if (sib.matches('[role=tablist]') || sib.querySelector('[role=tablist]')) break;
            var isPanel = sib.matches('[role=tabpanel]');
            if ((first || isPanel) && sib.contains(target)) { gov = true; break; }
            if (sized(sib) && !isPanel) first = false;
          }
        }
      }
      if (gov) out.push(tabLabel(t));
    });
    return out;
  }

  function tabsOnNow() {
    var on = {};
    tabsAll().forEach(function(t) { if (isOn(t) && sized(t)) on[tabLabel(t)] = 1; });
    return on;
  }
  // The route: path plus hash routes ('#/…', '#!…'); plain '#section' anchors are not a different screen.
  function routeNow() {
    try { if (CFG.route) return String(CFG.route() || ''); } catch (e) {}
    return location.pathname + (/^#[\/!]/.test(location.hash) ? location.hash : '');
  }
  // Context = domain|person|role|lang|heading|route. Comments saved without the route part match any route.
  function ctxMatch(a, b) {
    if (!a || !b) return false;
    var x = a.split('|'), y = b.split('|');
    if (x.slice(0, 5).join('|') !== y.slice(0, 5).join('|')) return false;
    return x.length < 6 || y.length < 6 || x[5] === y[5];
  }

  // Something drawn over the spot (a modal backdrop, a drawer, a dropdown) hides the pin underneath.
  function uncovered(x, y, n, c) {
    var px = Math.min(Math.max(x + 2, 0), window.innerWidth - 1), py = Math.min(Math.max(y + 2, 0), window.innerHeight - 1);
    var top = document.elementsFromPoint(px, py).filter(function(e) { return e !== host && !host.contains(e); })[0];
    if (!top) return true;
    if (n) return n.contains(top) || top.contains(n);
    return !!layerOf(top) === !!c.inLayer;
  }

  function findEl(c) {
    if (!c.selector) return null;
    var n = q(c.selector);
    var textOk = function(e) {
      return !c.snippet || snip(e).indexOf(c.snippet.slice(0, 24)) === 0 || c.snippet.indexOf(snip(e)) === 0;
    };
    // A comment made in a modal only matches elements in a modal, and a page comment never matches modal content.
    var layerOk = function(e) {
      return !!layerOf(e) === !!c.inLayer;
    };
    if (n && textOk(n) && layerOk(n)) {
      if (sized(n)) return n;
      // Hidden. If the window is a different size than when the comment was made, this is probably a responsive
      // layout hiding it, so use its nearest visible parent. At the same size it's a closed tab, modal or panel:
      // show nothing rather than pin the comment on the wrong thing.
      if (Math.abs(window.innerWidth - (c.vw || window.innerWidth)) < 120) return null;
      var up = n.parentElement;
      while (up && up !== document.body && !sized(up)) up = up.parentElement;
      if (up && up !== document.body && up !== document.documentElement) return up;
    }
    // The page was re-rendered or reordered: look the element up again by tag and text.
    if (c.tag && c.snippet && c.snippet.length >= 4) {
      var all = document.getElementsByTagName(c.tag);
      for (var i = 0; i < all.length; i++)
        if (!host.contains(all[i]) && sized(all[i]) && layerOk(all[i]) && snip(all[i]).indexOf(c.snippet.slice(0, 24)) === 0) return all[i];
    }
    var norm = function(s) {
      return (s || '').replace(/[0-9]+/g, '').replace(/[·•|]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    };
    var key = norm(c.snippet).slice(0, 20);
    if (c.tag && key.length >= 4) {
      var best = null,
        bl = 1e9,
        list = document.getElementsByTagName(c.tag);
      for (var j = 0; j < list.length; j++) {
        var e = list[j];
        if (host.contains(e) || !sized(e) || !layerOk(e)) continue;
        var tx = norm(textOf(e));
        if (tx.indexOf(key) !== 0) continue;
        if (tx.length < bl) {
          best = e;
          bl = tx.length;
        }
      }
      if (best) return best;
    }
    return null;
  }

  function findScroller(c) {
    if (!c.scroller) return null;
    var n = c.scroller === 'html' ? document.documentElement : q(c.scroller);
    return n && (n === document.documentElement || sized(n)) ? n : null;
  }
  // ---------- Which screen is this? ----------
  // The URL alone is not enough: switching role, site or language keeps the same URL but shows
  // different content, and some pages have no URL at all. So a screen is identified by who is previewing
  // (domain, person, role), the language, and the page heading that is actually on screen.
  function sessionNow() {
    var s = {};
    try { s = (CFG.session && CFG.session()) || {}; } catch (e) {}
    return {
      domain: s.domain || '',
      person: s.person || '',
      role: s.role || '',
      lang: s.lang || document.documentElement.lang || ''
    };
  }

  function headingNow() {
    var h = document.querySelector(CFG.heading || 'main h1, h1, main h2, h2');
    return h && !host.contains(h) ? textOf(h).slice(0, 60) : '';
  }

  function ctxNow() {
    var s = sessionNow();
    return [s.domain, s.person, s.role, s.lang, headingNow(), routeNow()].join('|');
  }
  // The visible tab / view toggles (Board, List, ...): only needed for comments not tied to an element.
  function sigNow() {
    var out = [];
    document.querySelectorAll('main .is-on, main [aria-selected="true"], main [aria-pressed="true"]').forEach(function(e) {
      if (out.length < 8 && !host.contains(e)) out.push(textOf(e).slice(0, 20));
    });
    return out.join('|');
  }

  function ctxLabelNow() {
    var who = '';
    try { who = (CFG.who && CFG.who()) || ''; } catch (e) {}
    var h = headingNow();
    return (h || 'page') + (who ? ' · ' + who : '');
  }
  // Comments saved before screens were recorded only know their URL. LEGACY_CTX says which context the prototype
  // opens in, so those are treated as made there on the matching page. Nothing is written back to the database.
  var LEGACY_PAGES = {}; // optional: { '#/old-hash': 'Page heading' } for comments saved before ctx existed

  function ctxOf(c) {
    if (c.ctx) return c.ctx;
    return c.view && LEGACY_PAGES[c.view] ? (CFG.legacyCtx || ['', '', '', '']).concat(LEGACY_PAGES[c.view]).join('|') : '';
  }
  // Where is this comment right now, in viewport coordinates? null = not on this screen.
  function locate(c) {
    if (c.id !== forced && !ctxMatch(ctxOf(c), currentCtx)) return null; // other role, language, page or route: never shown here
    if (c.id !== forced && c.tabs && c.tabs.length) { // made under a tab that is not selected now
      for (var k = 0; k < c.tabs.length; k++)
        if (!currentTabs[c.tabs[k]]) return null;
    }
    var n = findEl(c),
      x, y, clip = n;
    if (n) {
      var r = n.getBoundingClientRect();
      x = r.left + Math.min(c.dx || 0, Math.max(0, r.width - 4));
      y = r.top + Math.min(c.dy || 0, Math.max(0, r.height - 4));
    } else {
      // A comment on a specific element is only shown where that element is. The scroll-position fallback
      // is for comments placed on empty page area, and only on the same tabs / view.
      if (c.id !== forced && (c.selector || (c.sig || '') !== currentSig)) return null;
      var s = findScroller(c) || (c.id === forced ? document.documentElement : null);
      if (!s) return null;
      if (s === document.documentElement) {
        x = (c.sx || 0) - window.scrollX;
        y = (c.sy || 0) - window.scrollY;
      } else {
        var sr = s.getBoundingClientRect();
        x = sr.left + c.sx - s.scrollLeft + s.clientLeft;
        y = sr.top + c.sy - s.scrollTop + s.clientTop;
        clip = s;
      }
    }
    return {
      x: x,
      y: y,
      el: n,
      clip: clip,
      visible: inView(x, y, clip) && (c.id === forced && !n ? true : uncovered(x, y, n, c))
    };
  }
  // A pin must not float over the header or outside a scrolling area once its spot has scrolled out of sight.
  function inView(x, y, node) {
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
    var a = node;
    while (a && a !== document.body && a !== document.documentElement) {
      var cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        var r = a.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
      }
      a = a.parentElement;
    }
    return true;
  }
  // ---------- Network ----------
  function api(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? {
        'Content-Type': 'application/json'
      } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  function load() {
    return api('GET', API).then(function(list) {
      comments = list.sort(function(a, b) {
        return a.ts - b.ts;
      });
      render();
      renderPanel();
    }).catch(function() {});
  }
  // ---------- Rendering ----------
  function place(node, x, y, w, h) {
    node.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
    node.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
  }

  function fmt(ts) {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  var popEl = null,
    hlEl = null,
    pinLayer = el('div');
  root.appendChild(pinLayer);
  var currentCtx = '',
    currentSig = '',
    currentTabs = {},
    goingTo = false;

  function render() {
    attach();
    var prev = currentCtx;
    currentCtx = ctxNow();
    currentSig = sigNow();
    currentTabs = tabsOnNow();
    if (prev && prev !== currentCtx && !goingTo) {
      forced = null;
      closeAll();
      renderPanel();
    } // the screen changed under an open popup
    var seen = {},
      openLoc = null;
    comments.forEach(function(c, i) {
      var p = locate(c),
        pin = pins[c.id];
      if (!p || !p.visible) {
        if (pin) {
          pin.remove();
          delete pins[c.id];
        }
        return;
      }
      if (!pin) {
        pin = el('button', 'pin');
        pin.type = 'button';
        pin.setAttribute('aria-label', 'Comment by ' + c.author);
        pin.appendChild(el('span', '', String(i + 1)));
        pin.addEventListener('click', function(e) {
          e.stopPropagation();
          openThread(c.id);
        });
        pinLayer.appendChild(pin);
        pins[c.id] = pin;
      }
      pin.firstChild.textContent = String(i + 1);
      pin.classList.toggle('on', openId === c.id);
      pin.style.left = p.x + 'px';
      pin.style.top = p.y + 'px';
      seen[c.id] = 1;
      if (openId === c.id) openLoc = p;
    });
    Object.keys(pins).forEach(function(id) {
      if (!seen[id]) {
        pins[id].remove();
        delete pins[id];
      }
    });
    if (composing) {
      var pr = composing.refresh && composing.refresh();
      if (pr) {
        composing.pin.style.left = pr.x + 'px';
        composing.pin.style.top = pr.y + 'px';
        composing.pin.style.display = pr.visible ? '' : 'none';
      }
    }
    if (openId && popEl) {
      if (openLoc) place(popEl, openLoc.x + 18, openLoc.y - 20, 280, popEl.offsetHeight);
      else closePop();
    }
    // Outline the element the open comment is about.
    if (hlEl) {
      hlEl.remove();
      hlEl = null;
    }
    if (openLoc && openLoc.el) {
      var r = openLoc.el.getBoundingClientRect();
      if (r.width * r.height < window.innerWidth * window.innerHeight * 0.6) {
        hlEl = el('div', 'hl');
        hlEl.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        root.insertBefore(hlEl, pinLayer);
      }
    }
  }

  function closePop() {
    if (popEl) {
      popEl.remove();
      popEl = null;
    }
    openId = null;
    if (hlEl) {
      hlEl.remove();
      hlEl = null;
    }
  }

  function closeAll() {
    closePop();
    closeMenu();
    if (composing) {
      composing.pin.remove();
      composing = null;
    }
  }

  function openThread(id) {
    closeAll();
    var c = comments.filter(function(x) {
      return x.id === id;
    })[0];
    if (!c) return;
    openId = id;
    popEl = el('div', 'pop');
    var h = el('h4');
    h.appendChild(el('span', '', c.author));
    h.appendChild(el('span', 'ts', fmt(c.ts)));
    popEl.appendChild(h);
    if (c.label) popEl.appendChild(el('div', 'on-el', 'On: ' + c.label));
    popEl.appendChild(el('p', '', c.body));
    var row = el('div', 'row');
    var del = el('button', 'btn', 'Delete');
    del.type = 'button';
    del.onclick = function() {
      api('DELETE', API + '?id=' + encodeURIComponent(c.id)).then(function() {
        comments = comments.filter(function(x) {
          return x.id !== c.id;
        });
        closePop();
        render();
        renderPanel();
      }).catch(function() {
        toast('Could not delete the comment.');
      });
    };
    var close = el('button', 'btn', 'Close');
    close.type = 'button';
    close.onclick = closePop;
    row.appendChild(del);
    row.appendChild(close);
    popEl.appendChild(row);
    root.appendChild(popEl);
    render();
  }
  // ---------- Comment list: nothing can get lost ----------
  var fab = el('button', 'fab');
  fab.type = 'button';
  var panelEl = null;
  root.appendChild(fab);
  fab.onclick = function(e) {
    e.stopPropagation();
    panelOpen = !panelOpen;
    renderPanel();
  };

  function whereName(c) {
    return c.ctxLabel || (!c.ctx && LEGACY_PAGES[c.view] ? LEGACY_PAGES[c.view] : '') || (c.view ? c.view.replace(/^#\/?/, '') : '') || 'older comment (screen not recorded)';
  }

  function renderPanel() {
    fab.textContent = 'Comments (' + comments.length + ')';
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
    }
    if (!panelOpen) return;
    panelEl = el('div', 'panel');
    panelEl.appendChild(el('header', '', 'All comments'));
    var ul = el('ul');
    if (!comments.length) panelEl.appendChild(el('div', 'empty', 'No comments yet. Right-click anything and choose Comment.'));
    comments.forEach(function(c, i) {
      var li = el('li'),
        b = el('button');
      b.type = 'button';
      var who = el('div', 'who');
      who.appendChild(el('span', '', (i + 1) + '. ' + c.author));
      who.appendChild(el('span', 'ts', fmt(c.ts)));
      b.appendChild(who);
      b.appendChild(el('div', 'txt', c.body));
      var here = ctxMatch(ctxOf(c), currentCtx);
      b.appendChild(el('div', 'meta', (c.label ? 'On: ' + c.label + ' · ' : '') + 'Screen: ' + whereName(c) + (here ? '' : ' (not the screen you are on)')));
      if (!here) b.style.opacity = '0.75';
      b.onclick = function() {
        goTo(c);
      };
      li.appendChild(b);
      ul.appendChild(li);
    });
    if (comments.length) panelEl.appendChild(ul);
    root.appendChild(panelEl);
  }
  // Take the viewer to the exact spot: restore the role and page it was made on, scroll to it, open it.
  function wait(ms) {
    return new Promise(function(r) {
      setTimeout(r, ms);
    });
  }

  function clickByText(sel, test) {
    var all = document.querySelectorAll(sel);
    for (var i = 0; i < all.length; i++)
      if (!host.contains(all[i]) && test(textOf(all[i]))) {
        all[i].click();
        return true;
      }
    return false;
  }

  function clickTabs(labels) {
    (labels || []).forEach(function(lb) {
      var all = tabsAll();
      for (var i = 0; i < all.length; i++)
        if (tabLabel(all[i]) === lb && !isOn(all[i]) && sized(all[i])) { all[i].click(); break; }
    });
  }

  function goTo(c) {
    closeAll();
    panelOpen = false;
    renderPanel();
    var parts = ctxOf(c).split('|'),
      domain = parts[0],
      person = parts[1],
      lang = parts[3],
      heading = parts[4],
      api = window.__protoNav;
    (async function() {
      if (!ctxOf(c) && !c.view) return toast('This older comment has no screen recorded, so it cannot be located. You can delete it from here.');
      goingTo = true;
      try {
        var s = sessionNow();
        if (person && (s.person !== person || (domain && s.domain !== domain))) { // 1. same person and area
          if (api && api.switchPerson) api.switchPerson(person, domain);
          await wait(700);
        }
        if (lang && sessionNow().lang !== lang && api) {
          api.nav({
            lang: lang
          });
          await wait(300);
        } // 2. same language
        if (api) {
          api.nav({
            sel: null,
            selKind: null
          });
          await wait(150);
        }
        if (c.path && c.path !== location.pathname) { // 3a. another page of the site: load it, then continue there
          try { sessionStorage.setItem('cm-go', c.id); } catch (e) {}
          location.href = c.path + (c.view || '');
          return;
        }
        if (c.view && location.hash !== c.view) {
          location.hash = c.view;
          await wait(600);
        } // 3b. same route
        if (c.nav && api) {
          api.nav({
            page: c.nav.page,
            area: c.nav.area,
            ckTab: c.nav.ckTab,
            sel: c.nav.sel,
            selKind: c.nav.selKind
          });
          await wait(500);
        } else if (heading && headingNow() !== heading) {
          clickByText('button.nav-item', function(t) {
            return t.replace(/\d+$/, '').trim() === heading;
          });
          await wait(500);
        }
        clickTabs(c.tabs); // 4. the tabs it was made under
        if (c.openers && c.openers.length && !findEl(c)) { // 5. reopen the modal(s) it was made in, outermost first
          for (var o = 0; o < c.openers.length; o++) {
            var op = findEl(c.openers[o]);
            if (!op) break;
            op.click();
            await wait(500);
          }
          clickTabs(c.tabs); // tabs inside the modal
          await wait(300);
        }
        (c.sig || '').split('|').filter(Boolean).forEach(function(lb) { // 6. same view toggles (page-area comments)
          var all = document.querySelectorAll('main [role=tab], main .nv-tab, main .nv-jt-tab, main .seg > button, main .chip');
          for (var i = 0; i < all.length; i++) {
            var e = all[i],
              tx = textOf(e);
            if (!host.contains(e) && tx && lb && tx.indexOf(lb) === 0 && e.getAttribute('aria-selected') !== 'true' && !e.classList.contains('is-on')) {
              e.click();
              break;
            }
          }
        });
        await wait(400);
        for (var i = 0; i < 10 && !ctxMatch(ctxNow(), ctxOf(c)) && !findEl(c); i++) await wait(150);
      } finally {
        goingTo = false;
      }
      currentCtx = ctxNow();
      currentSig = sigNow();
      var n = findEl(c),
        sc = findScroller(c);
      forced = c.id;
      if (n) n.scrollIntoView({
        block: 'center',
        inline: 'center'
      });
      else if (ctxMatch(ctxNow(), ctxOf(c)) && sc && sc !== document.documentElement) {
        sc.scrollTop = Math.max(0, c.sy - sc.clientHeight / 2);
        sc.scrollLeft = Math.max(0, c.sx - sc.clientWidth / 2);
      } else if (ctxMatch(ctxNow(), ctxOf(c)) && sc) window.scrollTo(Math.max(0, c.sx - innerWidth / 2), Math.max(0, c.sy - innerHeight / 2));
      await wait(200);
      if (locate(c)) {
        openThread(c.id);
        if (!n) toast('This part of the screen has changed since the comment was made. It is shown where it was left.');
      } else toast('Opened "' + whereName(c) + '". The element this comment was on is not showing right now.');
    })();
  }
  // ---------- Menu ----------
  var menuEl = null;

  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  function showMenu(x, y, target) {
    closeAll();
    menuEl = el('div', 'menu');
    menuEl.setAttribute('role', 'menu');
    var b = el('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
    b.appendChild(document.createTextNode('Comment'));
    b.onclick = function() {
      closeMenu();
      startComment(target, x, y);
    };
    menuEl.appendChild(b);
    root.appendChild(menuEl);
    place(menuEl, x, y, 168, 44);
    b.focus();
  }
  document.addEventListener('contextmenu', function(e) {
    if (e.composedPath().indexOf(host) !== -1) return;
    var t = e.target;
    if (!t || t.nodeType !== 1) return;
    var svg = t.closest && t.closest('svg');
    if (svg) t = svg;
    showMenu(e.clientX, e.clientY, t);
  }, true);
  // ---------- Composer ----------
  function startComment(target, cx, cy) {
    var scroller = scrollerOf(target);
    var useEl = target !== scroller && target !== document.body && target !== document.documentElement;
    var tr = target.getBoundingClientRect();
    currentCtx = ctxNow();
    currentSig = sigNow();
    var d = {
      view: location.hash,
      nav: (window.__protoNav && window.__protoNav.snap) ? window.__protoNav.snap() : null,
      app: CFG.app || '',
      ctx: currentCtx,
      sig: currentSig,
      ctxLabel: ctxLabelNow(),
      scroller: pathOf(scroller),
      path: location.pathname,
      vw: window.innerWidth,
      tabs: tabsFor(target)
    };
    var layer = layerOf(target);
    if (layer) { // made inside a modal: remember the clicks that opened it (and any modal it was opened from)
      d.inLayer = 1;
      d.openers = [];
      for (var h = clicks.length - 1, L = layer; h >= 0 && L && d.openers.length < 4; h--) {
        if (L.contains(clicks[h].el)) continue;
        d.openers.unshift(clicks[h].d);
        L = clicks[h].layer;
      }
    }
    if (scroller === document.documentElement) {
      d.sx = cx + window.scrollX;
      d.sy = cy + window.scrollY;
    } else {
      var sr = scroller.getBoundingClientRect();
      d.sx = cx - sr.left - scroller.clientLeft + scroller.scrollLeft;
      d.sy = cy - sr.top - scroller.clientTop + scroller.scrollTop;
    }
    if (useEl) {
      d.selector = pathOf(target);
      d.tag = target.tagName.toLowerCase();
      d.snippet = snip(target);
      d.dx = cx - tr.left;
      d.dy = cy - tr.top;
      d.label = (textOf(target).slice(0, 60) || ('<' + d.tag + '>'));
    } else {
      d.label = 'page area';
    }
    d.sx = Math.round(d.sx);
    d.sy = Math.round(d.sy);
    var pin = el('div', 'pin draft');
    pin.appendChild(el('span', '', '+'));
    pinLayer.appendChild(pin);
    composing = {
      pin: pin,
      refresh: function() {
        return locate(d);
      }
    };
    var first = locate(d);
    if (first) {
      pin.style.left = first.x + 'px';
      pin.style.top = first.y + 'px';
    }
    popEl = el('div', 'pop');
    var name = el('input');
    name.placeholder = 'Your name';
    name.value = authorName;
    name.setAttribute('aria-label', 'Your name');
    var ta = el('textarea');
    ta.placeholder = 'Add a comment';
    ta.setAttribute('aria-label', 'Comment');
    var row = el('div', 'row');
    var cancel = el('button', 'btn', 'Cancel');
    cancel.type = 'button';
    var send = el('button', 'btn pri', 'Comment');
    send.type = 'button';
    send.disabled = true;

    function check() {
      send.disabled = !ta.value.trim() || !name.value.trim();
    }
    name.oninput = ta.oninput = check;
    cancel.onclick = closeAll;

    function submit() {
      if (send.disabled) return;
      authorName = name.value.trim();
      try {
        localStorage.setItem('cm-author', authorName);
      } catch (e) {}
      send.disabled = true;
      var payload = {};
      Object.keys(d).forEach(function(k) {
        payload[k] = d[k];
      });
      payload.author = authorName;
      payload.body = ta.value.trim();
      api('POST', API, payload).then(function(c) {
        comments.push(c);
        closeAll();
        render();
        renderPanel();
      }).catch(function() {
        send.disabled = false;
        toast('Could not save. Check your connection.');
      });
    }
    send.onclick = submit;
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    });
    popEl.appendChild(name);
    popEl.appendChild(ta);
    row.appendChild(cancel);
    row.appendChild(send);
    popEl.appendChild(row);
    root.appendChild(popEl);
    place(popEl, cx + 18, cy - 20, 280, popEl.offsetHeight);
    (authorName ? ta : name).focus();
    check();
  }
  // ---------- Upkeep ----------
  // Recent clicks, so a comment made in a modal knows which button opened it.
  var clicks = [];
  document.addEventListener('click', function(e) {
    if (e.composedPath().indexOf(host) !== -1 || !e.target || e.target.nodeType !== 1) return;
    var t = e.target.closest('button, a, [role=button], [role=tab], [role=menuitem], summary, label, input, select') || e.target;
    clicks.push({ el: t, layer: layerOf(t), d: { selector: pathOf(t), tag: t.tagName.toLowerCase(), snippet: snip(t), inLayer: layerOf(t) ? 1 : 0, vw: window.innerWidth } });
    if (clicks.length > 30) clicks.shift();
  }, true);
  document.addEventListener('mousedown', function(e) {
    if (e.button === 2 || e.composedPath().indexOf(host) !== -1) return;
    closeAll();
    if (panelOpen) {
      panelOpen = false;
      renderPanel();
    }
  }, true);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAll();
      if (panelOpen) {
        panelOpen = false;
        renderPanel();
      }
    }
  }, true);
  window.addEventListener('scroll', render, true);
  window.addEventListener('resize', render);
  window.addEventListener('hashchange', function() {
    render();
  });
  (function tick() {
    render();
    requestAnimationFrame(function() {
      setTimeout(tick, 120);
    });
  })();
  setInterval(load, 8000);
  renderPanel();
  load().then(function() { // finish a "go to comment" that had to load another page first
    var id = null;
    try { id = sessionStorage.getItem('cm-go'); sessionStorage.removeItem('cm-go'); } catch (e) {}
    var c = id && comments.filter(function(x) { return x.id === id; })[0];
    if (c) setTimeout(function() { goTo(c); }, 300);
  });
})();
