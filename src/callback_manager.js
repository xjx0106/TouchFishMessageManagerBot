const bot = require("../index.js");
const {
  getData,
  saveData,
} = require("../utils/index");


module.exports = bot.on("callback_query", onLoveText = (msg) => {
  const {
    data
  } = msg;
  if (data.split("-")[0] === "del") {
    deleteMsg(msg);
  }
});

/**
 * 從聊天和計劃表裏删除消息
 * @param {Object} msg 
 */
const deleteMsg = async (msg) => {
  const message_id_str = msg.data.split("-")[1];
  const message_id = parseInt(message_id_str);

  const fullList = getData("list");
  const one = fullList.find(item => item.message_id === message_id);
  if (one) {
    await bot.deleteMessage(one.chat_id, one.message_id);
    bot.deleteMessage(one.chat_id, one.console_message_id);

    const newList = fullList.filter(item => item.message_id !== message_id);
    saveData(newList, "list");
  }
}