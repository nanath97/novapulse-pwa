const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const postcss = require('postcss');
const source = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');
const css = postcss.parse(fs.readFileSync(path.join(__dirname, '../src/App.css'), 'utf8'));
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const buttons = [];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement' && node.openingElement.name.name === 'button') buttons.push(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(ast);
const attr = (node, name) => node.openingElement.attributes.find(a => a.name?.name === name);
const text = node => source.slice(node.start, node.end);
const back = buttons.filter(b => b.children.some(c => c.type === 'JSXText' && c.value.trim() === '← Retour'));
const rules = [];
css.walkRules(rule => { if (rule.selector.includes('activation-back-button')) rules.push(rule); });

test('all four activation back buttons, and only those buttons, have the dedicated class', () => {
  assert.equal(back.length, 4);
  for (const button of back) assert.equal(attr(button, 'className')?.value.value, 'activation-back-button');
  assert.equal(buttons.filter(b => attr(b, 'className')?.value.value === 'activation-back-button').length, 4);
  for (const button of buttons.filter(b => text(b).includes('Continuer'))) {
    assert.notEqual(attr(button, 'className')?.value.value, 'activation-back-button');
  }
});

test('mobile centering and nowrap are scoped to back buttons and inactive above 768px', () => {
  assert.equal(rules.length, 1);
  const rule = rules[0];
  assert.equal(rule.selector, '.activation-back-button');
  assert.equal(rule.parent.type, 'atrule');
  assert.equal(rule.parent.name, 'media');
  assert.equal(rule.parent.params, '(max-width: 768px)');
  const declarations = Object.fromEntries(rule.nodes.filter(n => n.type === 'decl').map(n => [n.prop, n.value]));
  assert.deepEqual(declarations, {
    display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center',
    'white-space': 'nowrap', 'line-height': '1.2', 'padding-left': '10px', 'padding-right': '10px',
  });
  for (const property of ['padding-left', 'padding-right']) {
    assert.equal(rule.nodes.find(n => n.prop === property).important, true, 'must override Services inline padding');
  }
});

test('existing back navigation and button sizing remain unchanged at every step', () => {
  assert.deepEqual(back.map(b => text(attr(b, 'onClick').value.expression)), [
    'onBack', '() => setActivationScreen("intro")',
    '() => setActivationScreen("company")', '() => setActivationScreen("media")',
  ]);
  for (const [index, button] of back.entries()) {
    const style = attr(button, 'style').value.expression;
    const properties = Object.fromEntries(style.properties.filter(p => p.type === 'ObjectProperty').map(p => [p.key.name, p.value.value]));
    assert.equal(properties.flex, 1);
    if (index === 0) {
      assert.ok(style.properties.some(p => p.type === 'SpreadElement' && p.argument.name === 'buttonStyle'));
      assert.equal(properties.height, undefined);
    } else {
      assert.equal(properties.height, 46);
      assert.equal(properties.border, '1px solid #d1d5db');
      assert.equal(properties.background, 'white');
    }
  }
  assert.match(source, /onBack=\{\(\) => setActivationScreen\("company"\)\}/);
  assert.match(source, /onContinue=\{\(\) => setActivationScreen\("media"\)\}/);
});
