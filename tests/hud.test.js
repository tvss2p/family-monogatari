import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeDisplay } from '../src/hud.js';

test('上のカウンターのモード表示：通常・確変中・時短の残り回数', () => {
  assert.deepEqual(modeDisplay('normal', 0), { label: 'モード', value: '通常', on: false });
  assert.deepEqual(modeDisplay('kakuhen', 0), { label: 'モード', value: '確変中', on: true });
  assert.deepEqual(modeDisplay('jitan', 87), { label: '時短 残り', value: '87回', on: true });
  assert.deepEqual(modeDisplay('jitan', 100), { label: '時短 残り', value: '100回', on: true });
});
