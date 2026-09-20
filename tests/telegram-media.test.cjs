const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/App.jsx'), 'utf8');
const helpers = source.slice(source.indexOf('function mediaSource('), source.indexOf('const BRIDGE_URL ='));
const {mediaSource, documentDownload} = vm.compileFunction(helpers + '\nreturn {mediaSource, documentDownload};', ['BRIDGE_URL'])('https://bridge.test');
test('live and history media URLs resolve to the bridge; Cloudinary downloads keep existing route', () => {
  const url = '/pwa/telegram-media/opaque';
  assert.equal(documentDownload(url, 'original.pdf'), 'https://bridge.test' + url);
  assert.equal(mediaSource(url), 'https://bridge.test' + url);
  const cloud = 'https://res.cloudinary.com/demo/file.pdf';
  assert.equal(mediaSource(cloud), cloud);
  assert.equal(documentDownload(cloud, 'original.pdf'), 'https://bridge.test/pwa/download?url=' + encodeURIComponent(cloud) + '&name=original.pdf');
  assert.ok(source.includes('href={documentDownload(msg.url, msg.fileName || "apercu.pdf")}'));
});
