const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Test the actual handler without introducing a React/browser test framework.
const source = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}
const helpers = section('const CLIENT_MEDIA_ERRORS =', 'function SellerServicesScreen(');
const handler = section('const handleClientMedia =', '// 🔑 Récupère le slug');
const classify = vm.compileFunction(helpers + '\nreturn classifyClientMedia;')();
const MiB = 1024 * 1024;

test('classification by extension and MIME, unknown files are documents', () => {
  for (const [extensions, type] of [
    [['mp4', 'mov', 'webm', 'm4v'], 'video'],
    [['png', 'jpg', 'jpeg'], 'photo'],
    [['pdf', 'svg', 'ai', 'eps', 'psd', 'zip', 'bin', 'gif'], 'document'],
  ]) for (const ext of extensions) {
    assert.equal(classify({ name: `design.${ext.toUpperCase()}`, type: '' }), type);
    assert.equal(classify({ name: `design.${ext}`, type: 'application/octet-stream' }), type);
  }
  for (const mime of ['image/svg+xml', 'image/vnd.adobe.photoshop', 'image/x-eps', 'application/pdf', 'application/postscript', 'application/zip']) {
    assert.equal(classify({ name: 'unknown', type: mime }), 'document');
  }
  for (const ext of ['svg', 'ai', 'eps', 'psd', 'zip']) {
    assert.equal(classify({ name: `design.${ext}`, type: 'image/png' }), 'document');
  }
  assert.equal(classify({ name: 'unknown', type: ' VIDEO/MP4; codecs=avc1 ' }), 'video');
  assert.equal(classify({ name: 'unknown', type: 'image/jpeg' }), 'photo');
  assert.equal(classify({ name: 'unknown', type: 'image/png' }), 'photo');
  assert.equal(classify({ name: 'png', type: '' }), 'document');
  assert.equal(classify({ name: 'misnamed.jpg', type: 'application/pdf' }), 'document');
});

function response(status, data) {
  return { status, ok: status >= 200 && status < 300, async json() { if (data === undefined) throw new SyntaxError(); return data; } };
}
async function run(file, replies = [response(200, { success: true, mediaUrl: 'https://example.com/media' }), response(200, { success: true })]) {
  const calls = [], alerts = [], revoked = [], previews = [];
  let messages = [{ text: 'existing' }];
  const context = {
    clientEmail: 'client@example.com', sellerSlug: 'ceo', BRIDGE_URL: 'https://backend.example',
    console: { log() {}, error() {} }, alert: message => alerts.push(message),
    URL: { createObjectURL() { previews.push(file); return 'blob:preview'; }, revokeObjectURL(url) { revoked.push(url); } },
    FormData: class { append(key, value) { assert.equal(key, 'file'); assert.equal(value, file); } },
    setMessages(update) { messages = update(messages); },
    async fetch(url, options) { calls.push({ url, options }); const next = replies.shift(); if (next instanceof Error) throw next; assert.ok(next); return next; },
  };
  const fn = vm.compileFunction(helpers + handler + '\nreturn handleClientMedia;', Object.keys(context))(...Object.values(context));
  const target = { files: [file], value: file.name };
  await fn({ target });
  assert.equal(target.value, '');
  return { calls, alerts, revoked, previews, messages };
}

test('oversize files are refused before previews or network requests', async () => {
  for (const [name, type, size, limit] of [
    ['clip.mp4', '', 20 * MiB + 1, '20 Mio'],
    ['unknown', 'video/webm', 20 * MiB + 1, '20 Mio'],
    ['design.pdf', 'application/pdf', 50 * MiB + 1, '50 Mio'],
    ['design.png', 'image/png', 50 * MiB + 1, '50 Mio'],
  ]) {
    const result = await run({ name, type, size });
    assert.equal(result.calls.length, 0);
    assert.equal(result.previews.length, 0);
    assert.ok(result.alerts[0].includes(limit));
    assert.deepEqual(result.messages, [{ text: 'existing' }]);
  }
});

test('accepted formats use the same type for preview and final delivery, inclusive limits', async () => {
  for (const [ext, mediaType, size] of [
    ['png', 'photo', 50 * MiB], ['jpg', 'photo', 1], ['jpeg', 'photo', 1],
    ['mp4', 'video', 20 * MiB], ['mov', 'video', 1], ['webm', 'video', 1], ['m4v', 'video', 1],
    ...['pdf', 'svg', 'ai', 'eps', 'psd', 'zip', 'unknown'].map(ext => [ext, 'document', 50 * MiB]),
  ]) {
    const result = await run({ name: `design.${ext}`, type: 'application/octet-stream', size });
    assert.equal(result.calls.length, 2);
    assert.ok(result.calls[0].url.endsWith('/upload-media'));
    assert.ok(result.calls[1].url.endsWith('/pwa/client-send-media'));
    const payload = JSON.parse(result.calls[1].options.body);
    assert.equal(payload.mediaType, mediaType);
    assert.equal(payload.fileName, `design.${ext}`);
    assert.equal(result.messages[1].mediaType, mediaType);
    assert.equal(result.messages[1].url, payload.mediaUrl);
    assert.deepEqual(result.alerts, []);
    assert.deepEqual(result.revoked, ['blob:preview']);
  }
});

test('413 and malformed/failed uploads show an error and never trigger delivery', async () => {
  for (const [reply, expected] of [
    [response(413, { error: 'VIDEO_TOO_LARGE' }), '20 Mio'],
    [response(413, { error: 'FILE_TOO_LARGE' }), '50 Mio'],
    [response(413), 'trop volumineux'],
    [response(500, { error: 'failed' }), 'Impossible'],
    [response(200, { success: true }), 'Impossible'],
    [response(200, null), 'Impossible'],
    [response(200), 'Impossible'],
    [new TypeError('Failed to fetch'), 'connexion'],
  ]) {
    const result = await run({ name: 'design.png', type: 'image/png', size: 1 }, [reply]);
    assert.equal(result.calls.length, 1);
    assert.ok(result.alerts[0].includes(expected));
    assert.deepEqual(result.messages, [{ text: 'existing' }]);
    assert.deepEqual(result.revoked, ['blob:preview']);
  }
});

test('delivery failure is visible and removes only the failed preview', async () => {
  const result = await run({ name: 'design.psd', size: 1 }, [
    response(200, { success: true, mediaUrl: 'https://example.com/media' }), response(500, { success: false }),
  ]);
  assert.equal(result.calls.length, 2);
  assert.ok(result.alerts[0].includes('son envoi a échoué'));
  assert.deepEqual(result.messages, [{ text: 'existing' }]);
  assert.deepEqual(result.revoked, ['blob:preview']);
});
