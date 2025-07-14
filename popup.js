/**
 * ChatGPT KeySwap のポップアップ設定画面のJavaScript
 * ユーザーがキーバインドを設定・変更できる機能を提供
 */

// デフォルト設定
const DEFAULT_SETTINGS = {
  sendAction: 'Enter',        // メッセージ送信のキー
  newlineAction: 'Shift+Enter' // 改行のキー
};

// DOM要素の取得
const sendSelect = document.getElementById('send-action');
const newlineSelect = document.getElementById('newline-action');

/**
 * Chrome storage APIから設定を読み込む関数
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    
    // セレクトボックスに現在の設定を反映
    sendSelect.value = result.sendAction;
    newlineSelect.value = result.newlineAction;
    
  } catch (error) {
    // エラーが発生してもサイレントに処理
  }
}

/**
 * 設定をChrome storage APIに保存する関数
 * @param {Object} settings - 保存する設定オブジェクト
 */
async function saveSettings(settings) {
  try {
    // 設定をストレージに保存
    await chrome.storage.sync.set(settings);
    
    // content scriptに設定変更を通知
    const tabs = await chrome.tabs.query({
      url: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
    });
    
    // 各ChatGPTタブに設定更新メッセージを送信
    const messagePromises = tabs.map(async tab => {
      try {
        return await chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: settings
        });
      } catch (error) {
        // タブが応答しない場合はスキップ（ページが読み込み中など）
        return null;
      }
    });
    
    // 全てのタブへのメッセージ送信を並行して実行
    await Promise.allSettled(messagePromises);
    
  } catch (error) {
    // エラーが発生してもサイレントに処理
  }
}

/**
 * キーバインドの重複をチェックし、必要に応じて入れ替える関数
 * @param {string} changedSelect - 変更されたセレクトボックスのID
 * @param {string} newValue - 新しく選択された値
 */
function handleDuplicateKeys(changedSelect, newValue) {
  const otherSelect = changedSelect === 'send-action' ? newlineSelect : sendSelect;
  
  // 重複している場合は、もう一方のセレクトを変更前の値に入れ替え
  if (otherSelect.value === newValue) {
    // 利用可能なオプションから、現在選択されていない値を見つける
    const availableOptions = ['Enter', 'Shift+Enter', 'Alt+Enter', 'Ctrl+Enter'];
    const currentValues = [sendSelect.value, newlineSelect.value];
    const unusedOption = availableOptions.find(option => !currentValues.includes(option));
    
    if (unusedOption) {
      otherSelect.value = unusedOption;
    }
  }
}

/**
 * 設定変更時のイベントハンドラー
 * @param {Event} event - 変更イベント
 */
async function handleSettingChange(event) {
  const changedSelect = event.target.id;
  const newValue = event.target.value;
  
  // 重複チェックと入れ替え処理
  handleDuplicateKeys(changedSelect, newValue);
  
  // 新しい設定を作成
  const newSettings = {
    sendAction: sendSelect.value,
    newlineAction: newlineSelect.value
  };
  
  // 設定を保存
  await saveSettings(newSettings);
}

// イベントリスナーの設定
sendSelect.addEventListener('change', handleSettingChange);
newlineSelect.addEventListener('change', handleSettingChange);

// ポップアップが開かれた時の初期化処理
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});
