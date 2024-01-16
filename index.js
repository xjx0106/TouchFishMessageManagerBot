const TelegramBot = require('node-telegram-bot-api');

const {
  TELEGRAM_BOT_TOKEN,
  PROXY_URL,
} = require("./config.js");

// 定制的消息
const {
  copyMessages,
  deleteMessages
} = require("./utils/customize-function.js");

const config = {
  polling: true,
};

if (PROXY_URL) {
  Object.assign(config, {
    request: { // 設置代理
      proxy: PROXY_URL,
    }
  })
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, config);
module.exports = Object.assign(bot, {
  copyMessages,
  deleteMessages
});

/// 功能類
require("./src/message_manager");
require("./src/time_manager");
require("./src/callback_manager");

console.log("[Bot Started!] ^_^");