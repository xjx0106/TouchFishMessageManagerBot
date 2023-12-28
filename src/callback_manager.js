const bot = require("../index.js");
const {
  getData,
  saveData,
} = require("../utils/index");
const {
  scheduleTimeLine
} = require("../src/time_manager");
const {
  GOD_ID
} = require("../config.js");


module.exports = bot.on("callback_query", onLoveText = (msg) => {
  const {
    data
  } = msg;
  bot.deleteMessage(GOD_ID, msg.message.message_id);
  if (data.startsWith("TimeLine-")) {
    const param = data.replace("TimeLine-", "");
    scheduleTimeLine(param);
  } else {
    console.log("不是正常的指令");
  }
});