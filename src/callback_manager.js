const bot = require("../index.js");
const {
  getData,
  saveData,
} = require("../utils/index");
const {
  scheduleTimeLine,
  pageSchedule
} = require("../src/time_manager");
const {
  GOD_ID
} = require("../config.js");


module.exports = bot.on("callback_query", onLoveText = (msg) => {
  const {
    data
  } = msg;
  if (data.startsWith("TimeLine-")) {
    bot.deleteMessage(GOD_ID, msg.message.message_id);
    const param = data.replace("TimeLine-", "");
    scheduleTimeLine(param);
  } else if (data.startsWith("TimeLinePage-")) {
    const param = data.replace("TimeLinePage-", "");
    pageSchedule(null, param, msg.message.message_id);
  } else {
    console.log("不是正常的指令");
  }
});