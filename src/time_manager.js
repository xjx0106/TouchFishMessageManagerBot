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
 * @param {string} method 排序方式 "rest" || "cover" || "clear" || "cancel"
 */
const scheduleTimeLine = async (method) => {
  console.log("[scheduleTimeLine]->", method);
  if (method === "cancel") {
    return;
  }
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
      } else if (method === "clear") {
        item.time = null;
      }
    });
    saveData(timeline, "timeline");
  } else {
    console.log("timeline has no length");
  }
  const res = await bot.sendMessage(GOD_ID, "計劃完成！");
  setTimeout(() => {
    bot.deleteMessage(GOD_ID, res.message_id);
  }, 10000);
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

  const runningStatus = timer ? "隊列狀態：運行 🟢\n\n" : "隊列狀態：暫停 🔴\n\n";
  const scheduleStatus = "當前隊列裏共有 " + _timeline.length + " 條消息。\n" + "已計劃：" + countScheduled + " 條，未計劃：" + countUnScheduled + " 條\n\n";
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
  const res = await bot.sendMessage(GOD_ID, runningStatus + scheduleStatus + "計劃列表：\n" + timeLineText.join("\n"));
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
  const baseTime = 5 * 60 * 1000; // 5分鐘(ms) 基礎時間
  const growRange = 7 * 60 * 1000; // 5分鐘(ms) 限定隨機範圍

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

  console.log("[計算下一條的時間]");
  const nextTime = await getNextTime();
  console.log("[下一條的時間]->", dayjs(nextTime).format("YYYY-MM-DD HH:mm:ss"));
  if (nextTime) {
    console.log("[開始計時!]");
    const d = new Date();
    const nowTime = d.getTime(); // now

    const deltaTime = nextTime - nowTime;
    timer = setTimeout(() => {
      console.log("[時間到!] 準備調用發消息方法");
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
  console.log("開始發消息... sendMsg()");
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
            caption = "",
              caption_entities = []
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
        // TODO: here have some problems in deleting msgs
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
 * 獲取下一條消息的發送時間
 * @returns 返回獲取下一條消息的發送時間，如果為0代表沒有下一條消息了
 */
const getNextTime = async () => {
  let time = 0;

  const timeline = await getData("timeline");
  if (timeline.length) {
    const firstOne = timeline[0];
    const featureTime = firstOne.time;

    if (firstOne && featureTime) {
      time = featureTime;
    }
  }
  return time;
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
  bot.deleteMessage(GOD_ID, msg.message_id);
  const res = await bot.sendMessage(GOD_ID, "隊列開始運行！🟢");
  setTimeout(() => {
    bot.deleteMessage(GOD_ID, res.message_id);
  }, 6000);
  await countDownNext(sendMsg);
  sendSchedule();
});
/**
 * 停止運行隊列
 */
module.exports = bot.onText(/\/stop/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bot.deleteMessage(GOD_ID, msg.message_id);
  const res = await bot.sendMessage(GOD_ID, "隊列停止運行！🔴");
  setTimeout(() => {
    bot.deleteMessage(GOD_ID, res.message_id);
  }, 6000);
  stopTimer();
  sendSchedule();
});

/**
 * 執行自動排期
 */
module.exports = bot.onText(/\/manage/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  // 刪除指令
  bot.deleteMessage(GOD_ID, msg.message_id);
  sendScheduleCommands();
});

/**
 * 發送計劃表
 */
module.exports = bot.onText(/\/status/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bot.deleteMessage(GOD_ID, msg.message_id);

  sendSchedule(null);
});

/**
 * 發送排期的指令
 */
const sendScheduleCommands = () => {

  bot.sendMessage(GOD_ID, "选择要排序的模式", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{
            text: "餘量排期",
            callback_data: "TimeLine-rest"
          },
          {
            text: "全量重排",
            callback_data: "TimeLine-cover"
          },
          {
            text: "清除排期",
            callback_data: "TimeLine-clear"
          },
        ],
        [{
          text: "取消",
          callback_data: "TimeLine-cancel"
        }]
      ],
    },
  });
};

module.exports = {
  scheduleTimeLine // 導出給callback調用
};