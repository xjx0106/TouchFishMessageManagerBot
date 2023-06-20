const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = require("./token.js");

module.exports = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true
});

/// 功能類
require('./src/message_mamaner');


