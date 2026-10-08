/**
 * Bot API calls. Replies cannot ride in the webhook response (§12.4) → UrlFetchApp.
 * https://core.telegram.org/bots/api
 */
const Telegram = (function () {
  /** @return {Object} parsed Bot API response ({ok, result} | {ok:false, description}) */
  function call(method, payload) {
    const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + requireProp_(PROP.BOT_TOKEN) + '/' + method, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true,
    });
    const body = JSON.parse(res.getContentText() || '{}');
    if (!body.ok) console.warn('Telegram ' + method + ' failed: ' + res.getResponseCode() + ' ' + body.description);
    return body;
  }

  function sendMessage(chatId, text, extra) {
    return call('sendMessage', Object.assign({ chat_id: chatId, text: text }, extra || {}));
  }

  function editMessageText(chatId, messageId, text, extra) {
    return call('editMessageText', Object.assign({ chat_id: chatId, message_id: messageId, text: text }, extra || {}));
  }

  function answerCallbackQuery(id, text) {
    return call('answerCallbackQuery', text ? { callback_query_id: id, text: text } : { callback_query_id: id });
  }

  return { call: call, sendMessage: sendMessage, editMessageText: editMessageText, answerCallbackQuery: answerCallbackQuery };
})();
