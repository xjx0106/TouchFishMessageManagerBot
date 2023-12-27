const TelegramBot = require('node-telegram-bot-api');

const {
  TELEGRAM_BOT_TOKEN,
  PROXY_URL,
} = require("./config.js");

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
module.exports = new TelegramBot(TELEGRAM_BOT_TOKEN, config);

/// 功能類
require("./src/message_manager");
require("./src/time_manager");
require("./src/callback_manager");

console.log("[Bot Started!] ^_^");