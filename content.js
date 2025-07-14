/**
 * ChatGPTの入力エリア（ProseMirrorエディタ）にキーボードイベントハンドラーを取り付ける関数
 * 通常のEnterキーを改行として動作させるために、Shift+Enterに変換する処理を行う
 * 
 * @param {HTMLElement} prose - ProseMirrorエディタのDOM要素
 */
function attachEnterKeyHandler(prose) {
  // 重複してイベントハンドラーが取り付けられることを防ぐためのフラグをチェック
  if (prose.dataset.enterFixAttached === 'true') return;
  
  // フラグを設定して、このエディタには既にハンドラーが取り付けられていることを記録
  prose.dataset.enterFixAttached = 'true';

  // keydownイベントリスナーを追加
  prose.addEventListener(
    'keydown',
    (e) => {
      // Enterキーが押され、かつShiftキーやAltキーが同時に押されていない場合に処理を実行
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        // デフォルトの動作（メッセージ送信）を阻止
        e.preventDefault();
        
        // イベントの伝播を即座に停止（他のイベントハンドラーが実行されないようにする）
        e.stopImmediatePropagation();

        // 新しいKeyboardEventを作成（Shift+Enterとして偽装）
        // これにより、ChatGPTは改行として認識する
        const fakeShiftEnterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',           // Enterキー
          code: 'Enter',          // キーコード
          shiftKey: true,         // Shiftキーが押されている状態を偽装
          bubbles: true,          // イベントバブリングを有効化
          cancelable: true,       // イベントのキャンセルを可能にする
        });

        // 作成した偽装イベントを同じ要素に送信
        // これにより、ChatGPTは「Shift+Enterが押された」と認識し、改行処理を行う
        e.target.dispatchEvent(fakeShiftEnterEvent);
      }
    },
    true // キャプチャフェーズでイベントを処理（他のハンドラーより先に実行される）
  );
}

/**
 * ChatGPTページでProseMirrorエディタを検索してイベントハンドラーを取り付ける関数
 * ページの読み込み完了後やDOM変更時に呼び出される
 */
function tryAttachHandler() {
  // ChatGPTの入力エリア（ProseMirrorクラスを持つ要素）を検索
  const proseEditor = document.querySelector('.ProseMirror');
  
  // エディタが見つかった場合のみ、Enterキーハンドラーを取り付け
  if (proseEditor) {
    attachEnterKeyHandler(proseEditor);
  }
}

/**
 * MutationObserverを使用してDOM変更を監視
 * ChatGPTはSPA（Single Page Application）のため、ページ遷移時に
 * 新しいエディタ要素が動的に追加される可能性がある
 */
new MutationObserver(tryAttachHandler).observe(document.body, {
  childList: true,  // 子要素の追加・削除を監視
  subtree: true,    // 全ての子孫要素の変更も監視
});
