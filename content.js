/**
 * ChatGPT KeySwap - メイン処理
 * ユーザー設定に基づいてキーバインドを動的に変更する
 */

// デフォルト設定（popup.jsと同じ値を使用）
const DEFAULT_SETTINGS = {
  sendAction: 'Enter',        // メッセージ送信のキー
  newlineAction: 'Shift+Enter' // 改行のキー
};

// 現在の設定を保持するグローバル変数
let currentSettings = { ...DEFAULT_SETTINGS };

// 偽装イベントの処理中フラグ
let isProcessingFakeEvent = false;

/**
 * キーイベントが指定されたアクションと一致するかチェックする関数
 * @param {KeyboardEvent} event - チェックするキーボードイベント
 * @param {string} action - チェックするアクション ('Enter', 'Shift+Enter', 'Alt+Enter', 'Ctrl+Enter')
 * @returns {boolean} - 一致する場合はtrue
 */
function isKeyMatch(event, action) {
  if (event.key !== 'Enter') return false;
  
  switch (action) {
    case 'Enter':
      return !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
    case 'Shift+Enter':
      return event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
    case 'Alt+Enter':
      return event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey;
    case 'Ctrl+Enter':
      return event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;
    default:
      return false;
  }
}

/**
 * 指定されたアクションに対応する偽装イベントを作成する関数
 * @param {string} targetAction - 偽装したいアクション
 * @param {HTMLElement} target - イベントの対象要素
 * @returns {KeyboardEvent} - 作成された偽装イベント
 */
function createFakeEvent(targetAction, target) {
  const eventOptions = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    view: window,
    // 偽装イベントであることを示すカスタムプロパティ
    isFakeKeySwapEvent: true
  };
  
  // ターゲットアクションに応じて修飾キーを設定
  switch (targetAction) {
    case 'Shift+Enter':
      eventOptions.shiftKey = true;
      break;
    case 'Alt+Enter':
      eventOptions.altKey = true;
      break;
    case 'Ctrl+Enter':
      eventOptions.ctrlKey = true;
      break;
    // 'Enter'の場合は何も追加しない（デフォルト状態）
  }
  
  return new KeyboardEvent('keydown', eventOptions);
}

/**
 * 既存のイベントハンドラーを削除する関数
 * @param {HTMLElement} proseEditor - ProseMirrorエディタのDOM要素
 */
function removeExistingHandler(proseEditor) {
  if (proseEditor.keySwapHandler) {
    proseEditor.removeEventListener('keydown', proseEditor.keySwapHandler, true);
    delete proseEditor.keySwapHandler;
  }
  
  // フラグもクリア
  proseEditor.dataset.keySwapAttached = 'false';
}

/**
 * ChatGPTの入力エリア（ProseMirrorエディタ）にキーボードイベントハンドラーを取り付ける関数
 * ユーザー設定に基づいて動的にキーバインドを変更する
 * 
 * @param {HTMLElement} proseEditor - ProseMirrorエディタのDOM要素
 */
function attachKeyHandler(proseEditor) {
  // 既存のハンドラーを削除
  removeExistingHandler(proseEditor);
  
  // 新しいイベントハンドラー関数を作成
  const keyHandler = (event) => {
    // Enterキー以外は処理しない
    if (event.key !== 'Enter') return;
    
    // 偽装イベントの処理中の場合はスキップ
    if (isProcessingFakeEvent) {
      return;
    }
    
    let shouldPreventDefault = false;
    let targetAction = null;
    
    // 現在押されたキーが「改行」の設定と一致するかチェック
    if (isKeyMatch(event, currentSettings.newlineAction)) {
      // 改行として処理したい場合
      if (currentSettings.newlineAction === 'Shift+Enter') {
        // Shift+Enterが改行に設定されている場合、ChatGPTのデフォルト動作なのでそのまま通す
        return;
      } else {
        // それ以外が改行に設定されている場合は、Shift+Enterに変換
        targetAction = 'Shift+Enter';
        shouldPreventDefault = true;
      }
    }
    
    // 現在押されたキーが「送信」の設定と一致するかチェック
    else if (isKeyMatch(event, currentSettings.sendAction)) {
      // 送信として処理したい場合
      if (currentSettings.sendAction === 'Enter') {
        // Enterが送信に設定されている場合、ChatGPTのデフォルト動作なのでそのまま通す
        return;
      } else {
        // それ以外が送信に設定されている場合は、送信ボタンをクリック
        shouldPreventDefault = true;
        
        // デフォルトの動作を阻止
        event.preventDefault();
        event.stopImmediatePropagation();
        
        // 送信ボタンを探して直接クリック
        const sendButton = document.querySelector('[data-testid="send-button"]') || 
                          document.querySelector('button[aria-label="Send message"]') ||
                          document.querySelector('.absolute.md\\:bottom-3 button');
        
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        }
        return; // 送信処理はここで完了
      }
    }
    
    // 改行の変換が必要な場合のみ処理を実行
    if (shouldPreventDefault && targetAction) {
      // デフォルトの動作を阻止
      event.preventDefault();
      event.stopImmediatePropagation();
      
      // 偽装イベント処理中フラグを設定
      isProcessingFakeEvent = true;
      
      // 偽装イベントを使用して改行を実現
      setTimeout(() => {
        const fakeEvent = createFakeEvent(targetAction, event.target);
        event.target.dispatchEvent(fakeEvent);
        
        // フラグをリセット
        setTimeout(() => {
          isProcessingFakeEvent = false;
        }, 50);
      }, 10);
    }
  };
  
  // ハンドラーをエレメントに保存（後で削除できるように）
  proseEditor.keySwapHandler = keyHandler;
  
  // keydownイベントリスナーを追加
  proseEditor.addEventListener('keydown', keyHandler, true);
  
  // フラグを設定
  proseEditor.dataset.keySwapAttached = 'true';
}

/**
 * Chrome storage APIから設定を読み込む関数
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = { ...result };
  } catch (error) {
    // エラーの場合はデフォルト設定を使用
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

/**
 * ChatGPTページでProseMirrorエディタを検索してイベントハンドラーを取り付ける関数
 * ページの読み込み完了後やDOM変更時に呼び出される
 */
function tryAttachHandler() {
  // ChatGPTの入力エリア（ProseMirrorクラスを持つ要素）を検索
  const proseEditors = document.querySelectorAll('.ProseMirror');
  
  proseEditors.forEach(proseEditor => {
    // まだハンドラーが取り付けられていない場合のみ処理
    if (!proseEditor.dataset.keySwapAttached || proseEditor.dataset.keySwapAttached === 'false') {
      attachKeyHandler(proseEditor);
    }
  });
}

/**
 * popup.jsからの設定更新メッセージを受信するリスナー
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // 設定を更新
    currentSettings = { ...message.settings };
    
    // 偽装イベント処理中フラグもリセット
    isProcessingFakeEvent = false;
    
    // 全てのProseMirrorエディタを検索してハンドラーを再設定
    const proseEditors = document.querySelectorAll('.ProseMirror');
    proseEditors.forEach(proseEditor => {
      // 古いハンドラーを削除
      removeExistingHandler(proseEditor);
      
      // 新しい設定でハンドラーを再設定
      attachKeyHandler(proseEditor);
    });
    
    // レスポンスを即座に送信
    sendResponse({ success: true });
    return true; // 非同期レスポンスを使用することを明示
  }
});

/**
 * MutationObserverを使用してDOM変更を監視
 * ChatGPTはSPA（Single Page Application）のため、ページ遷移時に
 * 新しいエディタ要素が動的に追加される可能性がある
 */
new MutationObserver(tryAttachHandler).observe(document.body, {
  childList: true,  // 子要素の追加・削除を監視
  subtree: true,    // 全ての子孫要素の変更も監視
});

// 初期化：設定を読み込んでからハンドラーを設定
loadSettings().then(() => {
  tryAttachHandler();
});
