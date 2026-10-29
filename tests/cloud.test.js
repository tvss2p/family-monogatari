import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideSync, createUploader, loginMethod } from '../src/cloud.js';
import { FIREBASE_CONFIG } from '../src/firebase-config.js';

const at = t => ({ savedAt: t, machine: { balls: t } });

test('はじめてログインした端末は、クラウドのセーブを使う（端末の新しいセーブで上書きしない）', () => {
  assert.equal(decideSync({ uid: 'u1', linkedUid: null, local: at(900), remote: at(100) }), 'useRemote');
  assert.equal(decideSync({ uid: 'u1', linkedUid: 'other', local: at(900), remote: at(100) }), 'useRemote');
});

test('クラウドにまだセーブがなければ、端末のセーブを上げる', () => {
  assert.equal(decideSync({ uid: 'u1', linkedUid: null, local: at(900), remote: null }), 'upload');
  assert.equal(decideSync({ uid: 'u1', linkedUid: null, local: null, remote: null }), 'none');
});

test('つないだあとの端末は、新しいほうのセーブを使う', () => {
  assert.equal(decideSync({ uid: 'u1', linkedUid: 'u1', local: at(100), remote: at(900) }), 'useRemote');
  assert.equal(decideSync({ uid: 'u1', linkedUid: 'u1', local: at(900), remote: at(100) }), 'upload');
  assert.equal(decideSync({ uid: 'u1', linkedUid: 'u1', local: at(500), remote: at(500) }), 'same');
  assert.equal(decideSync({ uid: 'u1', linkedUid: 'u1', local: null, remote: at(500) }), 'useRemote');
  assert.equal(decideSync({ uid: 'u1', linkedUid: 'u1', local: { machine: {} }, remote: at(500) }), 'useRemote');
});

test('クラウドへの保存は、遊んでいるあいだは間をあけ、画面を離れるときはすぐ', () => {
  const sent = [];
  let now = 0;
  const up = createUploader({ send: d => sent.push(d), minGapMs: 15000, now: () => now });
  up.queue(at(1));
  assert.equal(sent.length, 1);
  now = 5000; up.queue(at(2));
  now = 9000; up.queue(at(3));
  assert.equal(sent.length, 1);
  now = 15000; up.queue(at(4));
  assert.deepEqual(sent.map(d => d.savedAt), [1, 4]);
  now = 16000; up.queue(at(5));
  up.flush();
  assert.deepEqual(sent.map(d => d.savedAt), [1, 4, 5]);
  up.flush();
  assert.equal(sent.length, 3);
});

test('iPhoneのホーム画面アプリは、小窓ではなくページごとGoogleへ移ってログインする（小窓は戻ってこられず固まる）', () => {
  assert.equal(loginMethod({ standalone: true }), 'redirect');
  assert.equal(loginMethod({ standalone: false }), 'popup');
});

test('ログイン用の置き場所はゲームと同じドメイン（別ドメインだとSafariが保存を読めず、ログインが戻ってこない）', () => {
  assert.equal(FIREBASE_CONFIG.authDomain, 'tvss2p.github.io');
});
