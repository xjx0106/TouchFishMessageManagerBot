const bot = require('../index.js');
const {
  getData,
  saveData,
  checkPermission,
} = require("../utils/index");
const {
  GOD_ID,
  TARGET_GROUP_ID
} = require('../config');
const {
  throttle,
  debounce,
  defer
} = require("lodash");
const {
  generateRdmTime
} = require("./time_manager");


let bufferList = [];
let msgList = [];

/**
 * 處理單條telegram消息
 * @param {object} msg telegram單條消息 
 * @param {array} timeline 現已獲取的依存的時間綫 
 */
const disposeSingleBufferMsg = async (msg, timeline) => {
  console.log("[---處理單條消息（in buffer）]");
  const message_id = msg.message_id;

  if (msg.media_group_id) {
    // 媒體組（一次發送中，包括多張圖片或視頻混合）
    const lastMsg = msgList[msgList.length - 1]; // buffer最後一條隊列中的消息
    /**
     * 上一條消息是媒體組id（如果是媒體組，否則為""）
     */
    const lastMediaGroupId = lastMsg && lastMsg.isGroupMedia ? lastMsg.mediaGroupId : "";
    console.log("[------最後一條是媒體組嗎]->", lastMediaGroupId);
    if (lastMediaGroupId === msg.media_group_id) {
      console.log('[---------[現有] 媒體組]');
      // 該文件還是最後一條媒體組裏的，所以推送入現有媒體組
      const newMediaItem = {
        msg_id: message_id,
      };
      lastMsg.message_ids.push(newMediaItem);
      msgList.splice(lastMsg.length - 1, 1, lastMsg);
    } else {
      console.log('[---------[新] 媒體組]');
      // 該文件是新的媒體組了，創建一個新的媒體組隊列消息
      const newMediaGroup = {
        isGroupMedia: true,
        mediaGroupId: msg.media_group_id,
        message_ids: [{
            msg_id: message_id
          } // 單條媒體，直接放進去
        ],
        time: null,
      };

      msgList.push(newMediaGroup);
    }
  } else {
    // 單消息（單條文字消息，單張圖片，單個視頻）
    console.log('3');
    const newMsg = {
      isGroupMedia: false,
      message_id,
      time: null
    };
    msgList.push(newMsg);
  }
  const groupWords = ` | Group id is <code>` + msg.media_group_id + `</code>`;
  const res = await bot.sendMessage(msg.from.id, `Msg id is <code>` + message_id + `</code>` + groupWords, {
    parse_mode: 'HTML'
  });
  setTimeout(() => {
    bot.deleteMessage(GOD_ID, res.message_id);
  }, 10000);
}
/**
 * 處理整個緩衝隊列，並保存到timeline.json裏
 * @description 儅一組消息接受完了，它是先存在bufferList裏，現在要慢慢整理到msgList裏，并且再存到timeline.json裏
 */
const disposeBuffer = async () => {
  console.log("======= 緩衝列表 開始處理 =======");
  const timeline = await getData('timeline');
  if (bufferList.length) {
    bufferList.forEach(msgItem => {
      disposeSingleBufferMsg(msgItem, timeline);
    });
    // forEach結束后，經過一次或多次調用disposeSingleBufferMsg，已經完成了msgList（如果要覆蓋現有數據的尾條）
  } else {
    // no need to do anything
  }
  console.log("======= 緩衝列表 處理完成 ok ====");
  console.log("");
  bufferList = [];

  console.log("開始自動計算時間");
  if (timeline.length) {
    const lastItem = timeline[timeline.length - 1];
    const lastTime = lastItem.time;

    if (lastTime) {
      // 正式時間綫有最後的時間，才有辦法繼續拼接
      msgList.forEach((msgListItem, index) => {
        if (index === 0) {
          const time = generateRdmTime(lastTime);
          msgListItem.time = time;
        } else {
          // 理論上不會到這裏，因爲目前msgList長度只會是1（單次轉發）
          const prevItem = msgList[index - 1];
          const prevTime = prevItem.time;
          const time = generateRdmTime(prevTime);
          msgListItem.time = time;
        }
      })
    }

  } else {
    msgList.forEach((msgListItem, index) => {
      if (index === 0) {
        const d = new Date();
        const t = d.getTime(); // 此時
        const time = generateRdmTime(t);
        msgListItem.time = time;
      } else {
        // 理論上不會到這裏，因爲目前msgList長度只會是1（單次轉發）
        const prevItem = msgList[index - 1];
        const prevTime = prevItem.time;
        const time = generateRdmTime(prevTime);
        item.time = time;
      }
    })
  }
  console.log("[結束自動計算時間]->", msgList);

  await saveData([...timeline, ...msgList], "timeline");
  setTimeout(async () => {
    msgList = [];
  }, 1000)
}
/**
 * 防抖地處理Buffer
 */
const disposeBufferDebounce = debounce(disposeBuffer, 1500);

module.exports = bot.on("message", onLoveText = async (msg) => {
  if (msg.text && msg.text.startsWith("/")) {
    // 機器人指令，不做處理
    return;
  }
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bufferList.push(msg);
  disposeBufferDebounce();
});

// /**
//  * 發送媒體組的示例
//  */
// module.exports = bot.onText(/\/mediagroup/, onLoveText = async (msg) => {
//   if (!checkPermission(msg)) {
//     // 無權限，不做處理
//     return;
//   }
//   const mediaArr = [{
//       type: 'photo',
//       media: 'BccCaggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggwDAAMsA',
//       caption: "描述描述描述描述描述描述描述描述描述描述描述描述",
//       caption_entities: [{
//         "offset": 1,
//         "length": 2,
//         "type": "text_link",
//         "url": "https://www.google.com"
//       }]
//     },
//     {
//       type: 'photo',
//       media: 'AgACgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggAAMzBA',
//     },
//     {
//       type: 'video',
//       media: 'BAACAggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggwDAwzBA',
//     },
//   ];
//   const options = {};
//   bot.sendMediaGroup(TARGET_GROUP_ID, mediaArr, options);
// });

module.exports = bot.onText(/\/del/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bot.deleteMessage(GOD_ID, msg.message_id);

  if (msg.reply_to_message) {
    // 
    const {
      reply_to_message
    } = msg;
    const {
      message_id: message_id_to_be_delete // 要刪消息的id
    } = reply_to_message;
    console.log("[reply_to_message]->", reply_to_message);

    const timeline = await getData("timeline");

    let timelineIndex = null;
    // 找出要刪除那條在timeline裏的index
    timeline.forEach((item, index) => {
      if (!item.isGroupMedia) {
        // 單消息
        if (item.message_id === message_id_to_be_delete) {
          timelineIndex = index;
        }
      } else {
        // 複合消息
        if (item.message_ids.find(idsItm => idsItm.msg_id === message_id_to_be_delete)) {
          timelineIndex = index;
        }
      }
    });

    console.log("[刪除 index of timeline]->", timelineIndex);

    const item_to_be_del = timeline[timelineIndex];
    if (!item_to_be_del.isGroupMedia) {
      // 單消息
      try {
        const messageId = item_to_be_del.message_id;
        const delRes = await bot.deleteMessage(GOD_ID, messageId);
        console.log("[delRes]->", delRes);
        timeline.splice(timelineIndex, 1);
        saveData(timeline, "timeline");

        // 如果刪不掉
        let informText = "";
        let opt = {};
        if (delRes) {
          // 刪掉了
          informText = "數據已保存，隊列裏刪除也成功"
        } else {
          // 沒刪掉
          informText = "數據已保存，隊列裏刪除沒成功，請手動刪除";
          opt = {
            reply_to_message_id: messageId
          }
        }
        const res = await bot.sendMessage(GOD_ID, informText, opt);
        setTimeout(() => {
          if (delRes) {
            bot.deleteMessage(GOD_ID, res.message_id);
          }
        }, 3000);

      } catch (e) {
        console.log("error in deleting msg", e)
      }
    } else {
      // 複合消息
      try {
        const messageIds = item_to_be_del.message_ids.map(mediaItem => mediaItem.msg_id);
        const delRes = await bot.deleteMessages(GOD_ID, messageIds);
        console.log("[delRes]->", delRes);
        timeline.splice(timelineIndex, 1);
        saveData(timeline, "timeline");

        // 如果刪不掉
        let informText = "";
        let opt = {};
        if (delRes) {
          // 刪掉了
          informText = "數據已保存，隊列裏刪除也成功"
        } else {
          // 沒刪掉
          informText = "數據已保存，隊列裏刪除沒成功，請手動刪除";
          opt = {
            reply_to_message_id: messageIds[0]
          }
        }
        const res = await bot.sendMessage(GOD_ID, informText, opt);
        setTimeout(() => {
          if (delRes) {
            bot.deleteMessage(GOD_ID, res.message_id);
          }
        }, 3000);
      } catch (e) {
        console.log("error in deleting msgs", e)
      }
    }
  } else {
    const res = await bot.sendMessage(GOD_ID, "沒選中要刪除的消息來回復");
    setTimeout(() => {
      bot.deleteMessage(GOD_ID, res.message_id);
    }, 3000);
  }
});

/**
 * 測試運行目標
 */
module.exports = bot.onText(/\/test/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bot.deleteMessage(GOD_ID, msg.message_id);

  const res = await bot.sendMessage(GOD_ID, "機器人");
  setTimeout(() => {
    bot.deleteMessage(GOD_ID, res.message_id);
  }, 3000);
  const res2 = await bot.sendMessage(TARGET_GROUP_ID, "目標群組");
  setTimeout(() => {
    bot.deleteMessage(TARGET_GROUP_ID, res2.message_id);
  }, 3000);
});
