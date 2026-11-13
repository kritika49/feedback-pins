// Headless Chrome test of the comment layer (18 checks: modals, nested modals, tabs, routes, pages, go-to-comment).
// Usage: node server.mjs 8766 ../comments.mjs ../frontend-example.js   then   node run-tests.mjs 8766
// Set CHROME to the Chrome/Chromium binary if it isn't the macOS default.
import { spawn } from 'node:child_process';
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}`;
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${process.env.TMPDIR || '/tmp'}/cmchrome-${Date.now()}`, '--window-size=1200,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0; const waiters = {};
for (let i = 0; i < 50; i++) { try { const l = await (await fetch('http://127.0.0.1:9333/json')).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waiters[d.id]) { waiters[d.id](d); delete waiters[d.id]; } };
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; waiters[id] = r; ws.send(JSON.stringify({ id, method, params })); });
async function ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; }
async function go(url) { await send('Page.navigate', { url }); await sleep(900); await ev(HELP); }
const HELP = `window.H = {
  root: () => document.querySelector('[data-cm-host]').shadowRoot,
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  byText: (t) => [...document.querySelectorAll('body *')].filter(e => !e.closest('[data-cm-host]') && e.children.length === 0 && e.textContent.trim() === t)[0],
  click: async (t) => { H.byText(t).click(); await H.sleep(350); },
  comment: async (t, body) => {
    const e = H.byText(t), r = e.getBoundingClientRect(), x = r.left + 5, y = r.top + 5;
    e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y }));
    H.root().querySelector('.menu button').click();
    const p = H.root().querySelector('.pop'), [n, ta] = [p.querySelector('input'), p.querySelector('textarea')];
    n.value = 'Tester'; ta.value = body; ta.dispatchEvent(new Event('input'));
    p.querySelector('.btn.pri').click(); await H.sleep(600);
  },
  pins: async () => { await H.sleep(400); return [...H.root().querySelectorAll('.pin:not(.draft)')].map(p => {
      const x = parseFloat(p.style.left) + 1, y = parseFloat(p.style.top) + 1;
      const under = document.elementsFromPoint(x, y).filter(e => !e.closest('[data-cm-host]'))[0];
      return p.textContent + '@' + (under ? (under.textContent.trim().slice(0, 26) || under.tagName) : '?');
    }).join(' ; ') || '(none)'; },
  goTo: async (n) => { const r = H.root(); r.querySelector('.fab').click(); await H.sleep(100);
    r.querySelectorAll('.panel li button')[n - 1].click(); await H.sleep(3500);
    const pop = r.querySelector('.pop'); const t = r.querySelector('.toast');
    return (pop ? 'OPEN: ' + pop.querySelector('p').textContent : 'not open') + (t ? ' | toast: ' + t.textContent : '') + ' | modal=' + !!document.querySelector('[role=dialog]') + ' | hash=' + location.hash + ' path=' + location.pathname; }
};`;
const out = []; const log = (name, got, want) => { const ok = want ? (want instanceof RegExp ? want.test(got) : got === want) : null; console.log(`${ok === null ? '  ' : ok ? 'OK' : 'XX'} ${name}: ${got}`); };
await fetch(BASE + '/api/comments').catch(() => {});
await go(BASE + '/app.html#/a');
// 1 Modal comment
await ev(`H.click('Open settings modal')`); await ev(`H.comment('Modal body text here','c1 on modal')`);
log('1a modal open: pin on modal', await ev('H.pins()'), /^1@Modal body/);
await ev(`H.click('Close')`); log('1b modal closed: pin hidden', await ev('H.pins()'), '(none)');
// 2 Page comment covered by modal
await ev(`H.comment('Under the modal card','c2 under')`); log('2a page pin visible', await ev('H.pins()'), /2@Under the modal/);
await ev(`H.click('Open settings modal')`); log('2b modal open: only modal pin (page pin hidden under modal)', await ev('H.pins()'), /^1@Modal body text here$/);
log('2c modal closed again: page pin back', await ev(`H.click('Close').then(H.pins)`), /^2@Under the modal card$/);
// 3 Hidden-but-mounted tab panel
await ev(`H.comment('Panel one unique text','c3 tab one')`);
await ev(`H.click('Hidden-tab Two')`); log('3a other tab: tab-one pin hidden', await ev('H.pins()'), /^2@Under the modal card$/);
await ev(`H.click('Hidden-tab One')`); log('3b back on tab one: pin returns', await ev('H.pins()'), /3@Panel one unique text/);
// 4 Same-content tabs
await ev(`H.comment('Status','c4 status in Same One')`);
await ev(`H.click('Same Two')`); log('4a same-content other tab: Status pin hidden, unrelated pins stay', await ev('H.pins()'), /^(?!.*Status)(?=.*2@Under the modal card).*$/);
await ev(`H.click('Same One')`); log('4b back on Same One: Status pin returns', await ev('H.pins()'), /4@Status/);
// 5 Routes with same heading
await ev(`location.hash='#/b'; H.sleep(400)`); log('5a route B: route-A pins hidden', await ev('H.pins()'), '(none)');
log('5b list marks route-A comments as other screen', await ev(`(H.root().querySelector('.fab').click(), H.sleep(100)).then(()=>{const m=[...H.root().querySelectorAll('.panel .meta')].map(e=>/not the screen/.test(e.textContent));H.root().querySelector('.fab').click();return m.every(Boolean)+''})`), 'true');
// 6 Nested modal
await ev(`location.hash='#/a'; H.sleep(300)`); await ev(`H.click('Open settings modal')`); await ev(`H.click('Open nested')`);
await ev(`H.comment('Nested modal text','c5 nested')`); log('6a nested open: nested pin', await ev('H.pins()'), /5@Nested modal text/);
await ev(`H.click('Close nested')`); await ev(`H.click('Close')`);
// 7 Navigate from list
log('7a list -> modal comment opens modal', await ev('H.goTo(1)'), /^OPEN: c1 on modal \| modal=true/);
await ev(`document.getElementById('modalRoot').innerHTML=''; H.sleep(200)`);
await ev(`H.click('Hidden-tab Two')`); log('7b list -> hidden tab comment', await ev('H.goTo(3)'), /^OPEN: c3/);
await ev(`location.hash='#/b'; H.sleep(300)`); log('7c list -> other route', await ev('H.goTo(2)'), /^OPEN: c2.*hash=#\/a/);
log('7d list -> nested modal comment', await ev('H.goTo(5)'), /^OPEN: c5 nested \| modal=true/);
await ev(`document.getElementById('modalRoot').innerHTML=''; H.sleep(200)`);
// 8 Real second page
await go(BASE + '/p2#/a'); log('8a page 2: page-1 pins hidden', await ev('H.pins()'), '(none)');
await ev(`H.comment('Under the modal card','c6 on page 2')`);
await go(BASE + '/app.html#/a');
await ev(`(H.root().querySelector('.fab').click(), setTimeout(()=>H.root().querySelectorAll('.panel li button')[5].click(),100), 1)`);
await sleep(5000); await ev(HELP);
log('8b list -> other page comment', await ev(`(()=>{const p=H.root().querySelector('.pop');return (p?'OPEN: '+p.querySelector('p').textContent:'not open')+' | path='+location.pathname})()`), /^OPEN: c6 on page 2 \| path=\/p2/);
console.log(out.join('\n'));
chrome.kill(); process.exit(0);
