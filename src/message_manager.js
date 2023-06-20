const bot = require('../index.js');
const {
  getData,
  saveData,
} = require("../utils/index");


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
    new_caption: "",
    is_show_origin: false
  };

  let fullList = getData("list");
  fullList.push(obj);
  saveData(fullList, "list");  
});