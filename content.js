/**
 * ChatGPT KeySwap - メイン処理
 * ユーザー設定に基づいてキーバインドを動的に変更する
 */

// デフォルト設定（popup.jsと同じ値を使用）
const DEFAULT_SETTINGS = {
  sendAction: 'Alt+Enter',    // メッセージ送信のキー
  newlineAction: 'Enter'      // 改行のキー
};

// 現在の設定を保持するグローバル変数
let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * キーイベントが指定されたアクションと一致するかチェックする関数
 * @param {KeyboardEvent} event - チェックするキーボードイベント
 * @param {string} action - チェックするアクション ('Enter', 'Shift+Enter', 'Alt+Enter')
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
    view: window
  };
  
  // ターゲットアクションに応じて修飾キーを設定
  switch (targetAction) {
    case 'Shift+Enter':
      eventOptions.shiftKey = true;
      break;
    case 'Alt+Enter':
      eventOptions.altKey = true;
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
    
    let shouldPreventDefault = false;
    let targetAction = null;
    
    // 現在押されたキーが「改行」の設定と一致するかチェック
    if (isKeyMatch(event, currentSettings.newlineAction)) {
      // 改行として処理したい場合
      if (currentSettings.newlineAction === 'Enter') {
        // Enterが改行に設定されている場合、Shift+Enterに変換
        targetAction = 'Shift+Enter';
        shouldPreventDefault = true;
      }
      // 既にShift+EnterやAlt+Enterの場合は、そのまま通す（変換不要）
    }
    
    // 現在押されたキーが「送信」の設定と一致するかチェック
    else if (isKeyMatch(event, currentSettings.sendAction)) {
      // 送信として処理したい場合
      if (currentSettings.sendAction !== 'Enter') {
        // Enter以外が送信に設定されている場合、通常のEnterに変換
        targetAction = 'Enter';
        shouldPreventDefault = true;
      }
      // Enterが送信に設定されている場合は、そのまま通す（デフォルト動作）
    }
    
    // 変換が必要な場合のみ処理を実行
    if (shouldPreventDefault && targetAction) {
      // デフォルトの動作を阻止
      event.preventDefault();
      event.stopImmediatePropagation();
      
      // 送信ボタンを探して直接クリックする（より確実な方法）
      if (targetAction === 'Enter') {
        // 送信の場合：送信ボタンを探してクリック
        const sendButton = document.querySelector('[data-testid="send-button"]') || 
                          document.querySelector('button[aria-label="Send message"]') ||
                          document.querySelector('.absolute.md\\:bottom-3 button');
        
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
          return;
        }
      }
      
      // 送信ボタンが見つからない場合や改行の場合は偽装イベントを使用
      setTimeout(() => {
        const fakeEvent = createFakeEvent(targetAction, event.target);
        event.target.dispatchEvent(fakeEvent);
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
  const proseEditor = document.querySelector('.ProseMirror');
  
  // エディタが見つかった場合のみ、キーハンドラーを取り付け
  if (proseEditor && !proseEditor.dataset.keySwapAttached) {
    attachKeyHandler(proseEditor);
  }
}

/**
 * popup.jsからの設定更新メッセージを受信するリスナー
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // 設定を更新
    currentSettings = { ...message.settings };
    
    // 既存のハンドラーを削除して新しい設定で再設定
    const proseEditor = document.querySelector('.ProseMirror');
    if (proseEditor) {
      // フラグをクリアしてハンドラーを再設定
      proseEditor.dataset.keySwapAttached = 'false';
      attachKeyHandler(proseEditor);
    }
    
    sendResponse({ success: true });
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
