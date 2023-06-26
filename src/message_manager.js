const bot = require('../index.js');
const {
  getData,
  saveData,
} = require("../utils/index");

module.exports = bot.onText(/\/copy/, onLoveText = async (msg) => {
  const originTest = msg.text + "";
  const params = originTest.replace("/copy ", "").split(" ");
  console.log("[CopyParams]->", params);
  if (params[0] && params[1] && params[2]) {

    const chatId = params[0];
    console.log("[chatId]->", chatId);
    const fromChatId = params[1];
    console.log("[fromChatId]->", fromChatId);
    const messageId = params[2];
    console.log("[messageId]->", messageId);
    bot.copyMessage(chatId, fromChatId, messageId);
  }
})

module.exports = bot.on("message", onLoveText = async (msg) => {
  const message_id = msg.message_id;
  const content = "消息" + message_id + "已经加入队列";
  const res = await bot.sendMessage(msg.chat.id, content, {
    reply_to_message_id: message_id,
    reply_markup: {
      inline_keyboard: [
        [{
          text: "删除",
          callback_data: 'del-' + message_id + "-" + msg.chat.id
        }]
      ]
    }
  });
  const reply_msg_id = res.message_id;
  const obj = {
    chat_id: msg.chat.id,
    message_id: message_id,
    console_message_id: reply_msg_id,
    is_show_origin: false
  };

  let fullList = getData("list");
  fullList.push(obj);
  saveData(fullList, "list");
});