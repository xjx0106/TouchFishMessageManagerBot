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


let bufferList = [];
let msgList = [];

/**
 * 處理單條telegram消息
 * @param {object} msg telegram單條消息 
 * @param {array} timeline 現已獲取的依存的時間綫 
 */
const disposeMsg = async (msg, timeline) => {
  console.log("[disposeMsg]");
  const message_id = msg.message_id;

  if (msg.media_group_id) {
    // 媒體組（一次發送中，包括多張圖片或視頻混合）
    let type = "";
    let media = "";
    if (msg.photo) {
      type = "photo";
      media = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.video) {
      type = "video";
      media = msg.video.file_id;
    }

    const lastMsg = msgList[msgList.length - 1]; // buffer最後一條隊列中的消息
    /**
     * 上一條消息是媒體組id（如果是媒體組，否則為""）
     */
    const lastMediaGroupId = lastMsg && lastMsg.isGroupMedia ? lastMsg.mediaGroupId : "";
    console.log("[lastMediaGroupId]->", lastMediaGroupId);
    if (lastMediaGroupId === msg.media_group_id) {
      console.log('1');
      // 該文件還是最後一條媒體組裏的，所以推送入現有媒體組
      const newMediaItem = {
        msg_id: message_id,
        type,
        media
      };
      lastMsg.message_ids.push(newMediaItem);
      console.log("[msg.caption]->", msg.caption);
      console.log("[msg.caption_entities]->", msg.caption_entities);
      if (msg.caption && msg.caption.length) {
        lastMsg.caption = msg.caption
      }
      if (msg.caption_entities && msg.caption_entities.length) {
        lastMsg.caption_entities = msg.caption_entities;
      }
      msgList.splice(lastMsg.length - 1, 1, lastMsg);
    } else {
      console.log('2');
      // 該文件是新的媒體組了，創建一個新的媒體組隊列消息
      const newMediaGroup = {
        isGroupMedia: true,
        mediaGroupId: msg.media_group_id,
        message_ids: [{
            msg_id: message_id,
            type,
            media
          } // 單條媒體，直接放進去
        ],
        time: null,
        caption: "",
        caption_entities: []
      };
      if (msg.caption && msg.caption.length) {
        newMediaGroup.caption = msg.caption;
      }
      if (msg.caption_entities && msg.caption_entities.length) {
        newMediaGroup.caption_entities = msg.caption_entities;
      }

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
  console.log("[disposeBuffer]->");
  const timeline = await getData('timeline');
  console.log("[timeline]->", timeline.length);
  if (bufferList.length) {
    console.log("buffer begin foreach");
    bufferList.forEach(msgItem => {
      disposeMsg(msgItem, timeline);
    });
    // forEach結束后，經過一次或多次調用disposeMsg，已經完成了msgList（如果要覆蓋現有數據的尾條）
    console.log("------- after ------------");
    // console.log("[msgList]->", msgList);
  } else {
    // no need to do anything
  }
  bufferList = [];
  await saveData([...timeline, ...msgList], "timeline");
  setTimeout(async () => {
    msgList = [];
  }, 800)
}
/**
 * 防抖地處理Buffer
 */
const disposeBufferDebounce = debounce(disposeBuffer, 1100);

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

module.exports = bot.on("edited_message", onLoveText = async (msg) => {
  if (msg.text && msg.text.startsWith("/")) {
    // 機器人指令，不做處理
    return;
  }
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  const {
    // 基礎信息
    message_id,
    media_group_id,
    // 媒體類型的消息，修改則有以下兩項
    caption = '',
    caption_entities = [],
    // // 純文字類型的消息，修改則有以下兩項
    // text = null,
    // entities = null,
  } = msg;

  if (media_group_id && media_group_id.length) {
    // 所修改的是媒體組類型的消息
    console.log("edit is group")
    const timeline = await getData('timeline') || [];
    const one = timeline.find(item => item.mediaGroupId === media_group_id);
    if (one) {
      console.log("you one");
      const index = timeline.indexOf(one);
      console.log("[index]->", index);
      one.caption = caption;
      one.caption_entities = caption_entities;
      console.log("[timeline]->", timeline);
      timeline.splice(index, 1, one);
      console.log("[timeline after]->", timeline);
      saveData(timeline, "timeline");
    } else {
      console.log('no one');
    }
  } else {
    // 所修改的是純文字、單媒體消息，不做處理（因爲是用copyMessage來實現的）
    console.log("edit not group");
  }
});
