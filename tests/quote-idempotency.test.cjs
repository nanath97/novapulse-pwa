const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/App.jsx'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
}
const helper = section('function mergeQuoteHistory(', 'const BRIDGE_URL');
const effect = section('// SOCKET INIT', 'const loadPurchasedGallery');
const history = section('const loadHistory =', '// LOAD PURCHASES');
const quote = (id, status = 'pending') => ({isQuote: true, quoteId: id, quoteStatus: status, type: 'document', url: id + '.pdf'});

function harness(visible = false) {
  let messages = [], missed = 0, sounds = 0, connections = 0, disconnects = 0;
  let dependencies, cleanup, resolveFetch;
  let markFetchStarted;
  const fetchStarted = new Promise(resolve => { markFetchStarted = resolve; });
  const handlers = {};
  const context = vm.createContext({
    clientEmail: 'client@example.com', sellerSlug: 'ceo', topicId: '1', isIdentified: true,
    BRIDGE_URL: 'https://bridge.test', socketRef: {current: null},
    console: {log() {}, error() {}},
    document: {visibilityState: visible ? 'visible' : 'hidden', addEventListener() {}, removeEventListener() {}},
    setInterval() { return 1; }, clearInterval() {},
    setMessages(update) { messages = typeof update === 'function' ? update(messages) : update; },
    setMissedCount(update) { missed = typeof update === 'function' ? update(missed) : update; },
    playNotificationSound() { sounds++; }, async loadMissedCount() { return 0; },
    fetch() { return new Promise(resolve => { resolveFetch = resolve; markFetchStarted(); }); },
    io() { connections++; return {on(event, fn) { handlers[event] = fn; }, emit() {}, disconnect() { disconnects++; }}; },
    useEffect(fn, deps) {
      if (!dependencies || deps.some((dep, i) => dep !== dependencies[i])) {
        cleanup?.(); cleanup = fn(); dependencies = deps;
      }
    },
  });
  vm.runInContext(helper + history + '\nfunction render() {\n' + effect + '\n}\nrender();', context);
  return {
    fetchStarted,
    get messages() { return messages; }, get missed() { return missed; }, get sounds() { return sounds; },
    get connections() { return connections; }, get disconnects() { return disconnects; },
    media(data) { handlers.admin_media(data); },
    load() { return vm.runInContext('loadHistory()', context); },
    connect() { return handlers.connect(); },
    render() { vm.runInContext('render()', context); },
    reply(items) { resolveFetch({async json() { return {success: true, history: items}; }}); },
  };
}

test('duplicate live quote is idempotent and preserves accepted status and notification behavior', () => {
  const h = harness();
  h.media(quote('q1', 'accepted')); h.media(quote('q1'));
  assert.equal(h.messages.length, 1);
  assert.equal(h.messages[0].quoteId, 'q1'); assert.equal(h.messages[0].isQuote, true);
  assert.equal(h.messages[0].quoteStatus, 'accepted');
  assert.equal(h.sounds, 2); assert.equal(h.missed, 2);
});

test('distinct quotes and repeated ordinary media all remain', () => {
  const h = harness(true);
  h.media(quote('q1')); h.media(quote('q2'));
  const media = {type: 'photo', url: 'same.jpg'};
  h.media(media); h.media(media);
  assert.equal(h.messages.length, 4); assert.equal(h.sounds, 4); assert.equal(h.missed, 0);
});

test('history wins over a live duplicate and retains another live quote missing from the snapshot', async () => {
  const h = harness(), pending = h.load();
  h.media(quote('q1')); h.media(quote('q2'));
  const normal = {type: 'media', url: 'same.jpg'};
  h.reply([quote('q1', 'accepted'), quote('q1'), normal, normal]);
  await pending;
  h.media(quote('q1')); h.media(quote('q2'));
  assert.equal(h.messages.length, 4);
  assert.equal(h.messages.filter(m => m.quoteId === 'q1').length, 1);
  assert.equal(h.messages.filter(m => m.quoteId === 'q2').length, 1);
  assert.equal(h.messages[0].quoteStatus, 'accepted');
  assert.equal(h.messages[0].isQuote, true);
});

test('history first then repeated live quote yields one message', async () => {
  const h = harness(), pending = h.load();
  h.reply([quote('q1', 'accepted')]); await pending;
  h.media(quote('q1')); h.media(quote('q1'));
  assert.equal(h.messages.length, 1); assert.equal(h.messages[0].quoteStatus, 'accepted');
});

test('connection loads history and history completion does not recreate the socket', async () => {
  const h = harness(), pending = h.connect();
  await h.fetchStarted;
  h.reply([quote('q1')]); await pending;
  h.render();
  assert.equal(h.messages.length, 1); assert.equal(h.connections, 1); assert.equal(h.disconnects, 0);
  assert.ok(!source.includes('historyLoaded')); assert.ok(!source.includes('setHistoryLoaded'));
});
