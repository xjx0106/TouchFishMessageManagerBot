const TelegramBot = require('node-telegram-bot-api');

const {
  TELEGRAM_BOT_TOKEN,
  PROXY_URL,
  ENV
} = require("./config.js");

const config = {
  polling: true,
};

if (ENV === "local") {
  Object.assign(config, {
    request: { // 設置代理
      proxy: PROXY_URL,
    }
  })
} else if (ENV == "online") {
  // just current config
}
module.exports = new TelegramBot(TELEGRAM_BOT_TOKEN, config);

/// 功能類
require("./src/message_manager");
// require("./src/callback_manager");