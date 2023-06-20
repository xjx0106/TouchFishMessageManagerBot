const bot = require('../index.js');

module.exports = bot.onText("message", onLoveText = async (msg) => {
  console.log("[msg]->", msg);
});