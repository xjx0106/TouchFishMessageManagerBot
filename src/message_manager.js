const bot = require('../index.js');

module.exports = bot.on("message", onLoveText = async (msg) => {
  console.log("[msg]->", msg);
  bot.sendMessage(msg.chat.id, "yeye");
});