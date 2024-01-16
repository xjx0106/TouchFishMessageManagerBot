const request = require('request');
const {
  TELEGRAM_BOT_TOKEN,
  PROXY_URL
} = require('../config');

const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * 發送消息組
 * @param {Number} chatId 目標群組的id
 * @param {Number} fromChatId 消息源頭群組的id
 * @param {Array} messageIds 消息組/媒體組的id
 * @returns Promise
 * see https://core.telegram.org/bots/api#copymessages
 */
const copyMessages = (chatId, fromChatId, messageIds) => {
  const _path = "copyMessages";
  const uri = `${baseUrl}/${_path}?chat_id=${chatId}&from_chat_id=${fromChatId}&message_ids=${JSON.stringify(messageIds)}&method=POST&simple=false&resolveWithFullResponse=true&forever=true`;
  let options = {
    url: uri,
    method: "POST",
  };
  if (PROXY_URL) {
    Object.assign(options, {
      proxy: PROXY_URL
    });
  }
  return new Promise((res, rej) => {
    request(options, async (error, response, body) => {
      body = JSON.parse(body);
      if (error) {
        rej({ error, response, body });
      } else {
        if (body.ok) {
          res(body.result);
        } else {
          rej({ error, response, body });
        }
      }
    });
  })
};

/**
 * 批量刪除消息
 * @param {Number} chatId 目標群組的id
 * @param {Array} messageIds 要刪除的 消息組/媒體組的id
 * @returns Promise
 * see https://core.telegram.org/bots/api#deleteMessages
 */
const deleteMessages = (chatId, messageIds) => {
  const _path = "deleteMessages";
  const uri = `${baseUrl}/${_path}?chat_id=${chatId}&message_ids=${JSON.stringify(messageIds)}&method=POST&simple=false&resolveWithFullResponse=true&forever=true`;
  let options = {
    url: uri,
    method: "POST",
  };
  if (PROXY_URL) {
    Object.assign(options, {
      proxy: PROXY_URL
    });
  }
  return new Promise((res, rej) => {
    request(options, async (error, response, body) => {
      body = JSON.parse(body);
      if (error) {
        rej({ error, response, body });
      } else {
        if (body.ok) {
          res(body.result);
        } else {
          rej({ error, response, body });
        }
      }
    });
  })
};

module.exports = {
  copyMessages,
  deleteMessages
};