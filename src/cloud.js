// Googleログインで、スマホとタブレットのセーブを共通にする（Firebase）
// ログインしていないとき・電波がないときは、今までどおり端末にだけ保存する

// どちらのセーブを使うか：
// - はじめてこのアカウントでつないだ端末は、クラウドを使う（新しく入れた端末の 250 玉で上書きしない）
// - つないだあとは、保存した時刻（savedAt）が新しいほう
export function decideSync({ uid, linkedUid, local, remote }) {
  if (!remote) return local ? 'upload' : 'none';
  if (linkedUid !== uid || !local) return 'useRemote';
  const l = local.savedAt || 0, r = remote.savedAt || 0;
  if (r > l) return 'useRemote';
  if (l > r) return 'upload';
  return 'same';
}

// クラウドへの保存：遊んでいるあいだは minGapMs ごと、画面を離れるときは flush ですぐ
export function createUploader({ send, minGapMs = 15000, now = () => Date.now() }) {
  let last = -Infinity, pending = null;
  return {
    queue(data) {
      pending = data;
      if (now() - last >= minGapMs) this.flush();
    },
    flush() {
      if (!pending) return;
      last = now();
      const d = pending;
      pending = null;
      send(d);
    },
  };
}

// ログインのしかた：iPhoneのホーム画面アプリは、小窓を開くと結果が戻らず固まるので、ページごとGoogleへ移って戻ってくる
export function loginMethod({ standalone }) {
  return standalone ? 'redirect' : 'popup';
}

// Firebase をつなぐ（読みこめなければ null。ゲームはそのまま遊べる）
export async function connectCloud({ sdk, config, standalone = false }) {
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`${sdk}/firebase-app.js`), import(`${sdk}/firebase-auth.js`), import(`${sdk}/firebase-firestore.js`),
    ]);
    const app = initializeApp(config);
    const auth = A.getAuth(app);
    const db = F.getFirestore(app);
    const ref = uid => F.doc(db, 'saves', uid);
    // Googleから戻ってきたときのログインを仕上げる（失敗してもゲームはそのまま）
    A.getRedirectResult(auth).catch(() => {});
    return {
      onUser(fn) { return A.onAuthStateChanged(auth, fn); },
      async signIn() {
        const provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        if (loginMethod({ standalone }) === 'redirect') return A.signInWithRedirect(auth, provider);
        try { await A.signInWithPopup(auth, provider); }
        catch (e) {
          // ポップアップが使えない端末は、ページごとGoogleへ移ってもどってくる
          if (/popup-blocked|operation-not-supported/.test(e.code || '')) await A.signInWithRedirect(auth, provider);
          else throw e;
        }
      },
      signOut() { return A.signOut(auth); },
      async load(uid) {
        const snap = await F.getDoc(ref(uid));
        if (!snap.exists()) return null;
        const v = snap.data();
        return { ...JSON.parse(v.data), savedAt: v.savedAt };
      },
      save(uid, data) {
        return F.setDoc(ref(uid), { data: JSON.stringify(data), savedAt: data.savedAt || Date.now() });
      },
    };
  } catch (e) {
    return null;
  }
}
