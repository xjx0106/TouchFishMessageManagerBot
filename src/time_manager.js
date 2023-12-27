const {
  getData,
  saveData,
  checkPermission,
} = require("../utils/index");
const bot = require('../index');
const {
  GOD_ID,
  TARGET_GROUP_ID
} = require("../config");
const dayjs = require("dayjs");

/**
 * 為剩餘的消息排期(callback)
 * @param {string} method 排序方式 "rest" || "cover" || "look"
 */
const scheduleTimeLine = async (method) => {
  console.log("[scheduleTimeLine]->", method);
  const timeline = await getData("timeline");
  if (timeline.length) {
    timeline.forEach((item, index) => {
      if (method === "rest") {
        if (item.time) {
          // 這個已經有排期了，直接下一個
          // do nothing
        } else {
          // 沒安排時間，先看看是否有前序消息
          if (index === 0) {
            // 自己就是隊首了
            const d = new Date();
            const t = d.getTime();
            const time = generateRdmTime(t);
            item.time = time;
          } else {
            // 前面有前序
            const prevItem = timeline[index - 1];
            const prevTime = prevItem.time;
            const time = generateRdmTime(prevTime);
            item.time = time;
          }
        }
      } else if (method === "cover") {
        if (index === 0) {
          // 自己就是隊首了
          const d = new Date();
          const t = d.getTime();
          const time = generateRdmTime(t);
          item.time = time;
        } else {
          // 前面有前序
          const prevItem = timeline[index - 1];
          const prevTime = prevItem.time;
          const time = generateRdmTime(prevTime);
          item.time = time;
        }
      }
    });
    if (method === "rest" || method === "cover") {
      saveData(timeline, "timeline");
    }
  } else {
    console.log("timeline has no length");
  }
  if (method === "look") {
    sendSchedule(timeline);
  } else {
    const res = await bot.sendMessage(GOD_ID, "已計劃！(5s后銷毀)");
    setTimeout(() => {
      bot.deleteMessage(GOD_ID, res.message_id);
    }, 5000);
  }
};

/**
 * 發送計劃和狀態
 * @param {array} timeline 時間綫
 */
const sendSchedule = async (timeline = null) => {
  let _timeline = [];
  // 先看看有沒有輸入timeline，若沒有，還要專門去獲取一下
  if (timeline) {
    _timeline = timeline;
  } else {
    _timeline = await getData("timeline");
  }
  const countScheduled = _timeline.filter(item => item.time).length;
  const countUnScheduled = _timeline.filter(item => !item.time).length;
  const status = "當前隊列共有 " + _timeline.length + " 條\n" + "已計劃：" + countScheduled + " 條，未計劃：" + countUnScheduled + " 條\n\n";
  const timeLineText = _timeline.map(item => {
    let formatTime = "";
    if (item.time) {
      formatTime = dayjs(item.time).format("YYYY-MM-DD HH:mm:ss");
    } else {
      formatTime = "未計劃"
    }
    return formatTime;
  });
  // 發送計劃列表
  const res = await bot.sendMessage(GOD_ID, status + "計劃列表：\n" + timeLineText.join("\n"));
  setTimeout(() => {
    // 撤回計劃列表
    bot.deleteMessage(GOD_ID, res.message_id);
  }, 20000);
};

/**
 * 生成一段隨機的時長
 * @param {number} timestamp 基於的時間
 * @returns 時間戳
 */
const generateRdmTime = (timestamp) => {
  const baseTime = 7 * 60 * 1000; // 5分鐘(ms) 基礎時間
  const growRange = 4 * 60 * 1000; // 5分鐘(ms) 限定隨機範圍

  let result = 0;
  const addedTime = parseInt((Math.random() * growRange), 10); // 隨機的新增出來的時間（0~8分鐘(ms)）
  if (timestamp) {
    result = baseTime + addedTime + timestamp;
  } else {
    result = baseTime + addedTime;
  }
  return result;
};

/**
 * 計時器
 */
let timer = null;
/**
 * 倒計時下一條
 * @param {function} function 回調函數，發送消息
 */
const countDownNext = async (sendFn = null) => {
  console.log("調用[倒計時下一條]");
  stopTimer();

  console.log("計算下一條的時間");
  const deltaTime = await getDeltaTime();
  console.log("[距離下一條毫秒]->", deltaTime);
  if (deltaTime) {
    timer = setTimeout(() => {
      console.log("時間到，準備調用發消息方法")
      sendFn && sendFn();
    }, deltaTime);
  } else {
    stopTimer();
  }
}

/**
 * 發送隊首消息
 */
const sendMsg = async () => {
  console.log("開始發消息");
  const timeline = await getData("timeline");

  let sendRes = null;
  if (timeline.length) {
    // 可以獲取首條消息
    console.log("[可以獲取首條消息]");
    const one = timeline[0];
    if (one.isGroupMedia) {
      // 是媒體組
      console.log("[是媒體組]");

      // 整理一下媒體數據
      const mediaArr = [];
      const options = {};
      one.message_ids.forEach((mediaItem, mediaIndex) => {
        const {
          type,
          media
        } = mediaItem;
        if (mediaIndex === 0) {
          const {
            caption,
            caption_entities
          } = one;
          mediaArr.push({
            type,
            media,
            caption,
            caption_entities
          });
        } else {
          mediaArr.push({
            type,
            media
          });
        }
      });
      sendRes = await bot.sendMediaGroup(TARGET_GROUP_ID, mediaArr, options);
      console.log("媒體組 發送完成，準備清理隊列首條");
      // 刪除對話隊列裏的這條消息
      for (let i = 0; i < one.message_ids.length; i++) {
        const messageId = one.message_ids[i].msg_id;
        await bot.deleteMessage(GOD_ID, messageId);
      }
      // 刪除timeline裏的該消息數據
      const timelineRest = timeline.filter((item, itemIdx) => itemIdx !== 0)
      saveData(timelineRest, "timeline");
    } else {
      // 是純文本或獨立媒體
      console.log("[是純文本或獨立媒體]->");

      const messageId = one.message_id;
      sendRes = await bot.copyMessage(TARGET_GROUP_ID, GOD_ID, messageId);
      console.log("獨立媒體 發送完成，準備清理隊列首條");
      // 刪除對話隊列裏的這條消息
      await bot.deleteMessage(GOD_ID, messageId);
      // 刪除timeline裏的該消息數據
      const timelineRest = timeline.filter((item, itemIdx) => itemIdx !== 0)
      saveData(timelineRest, "timeline");
    }
    if (sendRes) {
      // 發完了就繼續倒計時下一條消息
      countDownNext(sendMsg);
    }
  } else {
    console.log("[無法獲取首條消息]->");
  }
}

/**
 * 計算此時距離下一條消息還有多少毫秒
 * @returns 返回需要倒計時多少毫，如果為0代表沒有下一條消息了
 */
const getDeltaTime = async () => {
  let delta = 0;
  const d = new Date();
  const t = d.getTime(); // 此時

  const timeline = await getData("timeline");
  if (timeline.length) {
    const firstOne = timeline[0];
    const featureTime = firstOne.time;

    const _delta = featureTime - t;
    if (_delta > 0) {
      delta = _delta;
    }
  }
  return delta;
}

/**
 * 停止計時器
 */
const stopTimer = () => {
  console.log("開始停止計時器");
  clearTimeout(timer);
  timer = null;
  console.log("已經停止計時器");
}

/**
 * 開始運行隊列
 */
module.exports = bot.onText(/\/go/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  countDownNext(sendMsg);
});
/**
 * 停止運行隊列
 */
module.exports = bot.onText(/\/stop/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  stopTimer();
});

/**
 * 執行自動排期
 */
module.exports = bot.onText(/\/timeline/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  sendScheduleCommands(msg);
});

/**
 * 執行自動排期
 */
module.exports = bot.onText(/\/t/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  sendScheduleCommands(msg);
});

/**
 * 發送排期的指令
 * @param {object} msg 用戶發送斜杠指令的那條消息
 */
const sendScheduleCommands = (msg) => {
  // 刪除指令
  bot.deleteMessage(GOD_ID, msg.message_id);
  bot.sendMessage(msg.chat.id, "选择要排序的模式", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{
            text: "Rest",
            callback_data: "TimeLine-rest"
          },
          {
            text: "Cover",
            callback_data: "TimeLine-cover"
          },
        ],
        [{
          text: "查看隊列",
          callback_data: "TimeLine-look"
        }, ],
      ],
    },
  });
};

module.exports = {
  scheduleTimeLine
};