import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('styles/cabinet.css', 'utf8');
const rule = sel => (css.match(new RegExp(`(^|\\n)${sel.replace('.', '\\.')}\\{([^}]*)\\}`)) || [])[2] || '';

test('the whole cabinet has no filter (it would repaint every frame)', () => {
  assert.ok(rule('.cab').length > 0);
  assert.doesNotMatch(rule('.cab'), /filter/);
});
