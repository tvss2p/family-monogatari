// Firebase（Googleログインとクラウドのセーブ）の設定。ブラウザに配る前提の値で、秘密の鍵ではない
// 守りは Firestore のルール（firestore.rules：本人のセーブだけ読み書きできる）
export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/13.1.0';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBtniHsVUT7kLNFft0f2QL7CMc1MbXB1nM',
  authDomain: 'family-monogatari.firebaseapp.com',
  projectId: 'family-monogatari',
  storageBucket: 'family-monogatari.firebasestorage.app',
  messagingSenderId: '1087378337572',
  appId: '1:1087378337572:web:e0b355f2284036a6ea4db1',
};
