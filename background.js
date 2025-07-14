/**
 * ChatGPT KeySwap - Background Script
 * 拡張機能のバックグラウンド処理を管理
 * インストール時の初期設定や、必要に応じたタブ管理を行う
 */

// デフォルト設定
const DEFAULT_SETTINGS = {
  sendAction: 'Enter',        // メッセージ送信のキー
  newlineAction: 'Shift+Enter' // 改行のキー
};

/**
 * 拡張機能のインストール時の処理
 * 初回インストール時にデフォルト設定を保存する
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  // 初回インストールまたはアップデート時
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      // 既存の設定があるかチェック
      const existingSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      
      // 設定が存在しない場合のみデフォルト設定を保存
      if (!existingSettings.sendAction || !existingSettings.newlineAction) {
        await chrome.storage.sync.set(DEFAULT_SETTINGS);
      }
    } catch (error) {
      // エラーが発生してもサイレントに処理
    }
  }
});

/**
 * コンテンツスクリプトやポップアップからのメッセージを処理
 * 必要に応じて他のタブとの連携処理を行う
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 将来的な機能拡張のために用意
  // 現在は特別な処理は不要
  return false; // 非同期レスポンスは使用しない
});
