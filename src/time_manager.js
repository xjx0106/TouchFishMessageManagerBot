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
 * 當前頁碼，起始於1
 */
let page = 1;
/**
 * 時間表的計時器
 */
let timer_status = null;

/**
 * 基礎delta time時間
 */
let baseDelta = 1; // 這裏給的默認值其實是沒用的，項目啓動后，會由setDeltaTime()方法來初始化
/**
 * 最大再跳時間
 */
let maxGrow = 0; // 這裏給的默認值其實是沒用的，項目啓動后，會由setDeltaTime()方法來初始化
/**
 * 新消息的時間是否自動拼接上去
 */
let autoSpilling = false;

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
            const t = d.getTime(); // 此時
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
          const t = d.getTime(); // 此時
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
 * @param {number} messageId 要修改的消息
 */
const sendSchedule = async (timeline = null, messageId = null) => {
  clearTimeout(timer_status);
  timer_status = null;

  const PAGE_STAY_TIME = 25000;
  const PAGE_SIZE = 20;

  let _timeline = [];
  // 先看看有沒有輸入timeline，若沒有，還要專門去獲取一下
  if (timeline) {
    _timeline = timeline;
  } else {
    _timeline = await getData("timeline");
  }
  const countScheduled = _timeline.filter(item => item.time).length;
  const countScheduled_not = _timeline.filter(item => !item.time).length;

  const runningStatus = timer ? "隊列狀態：運行 🟢\n----------------------------------------\n" : "隊列狀態：暫停 🔴\n----------------------------------------\n";
  const scheduleStatus =
    "當前隊列裏共有 " +
    _timeline.length +
    " 條消息。\n" +
    "已計劃：" +
    countScheduled +
    " 條，未計劃：" +
    countScheduled_not +
    " 條\n\n";
  const timeLineText = _timeline.map(item => {
    let formatTime = "";
    if (item.time) {
      formatTime = dayjs(item.time).format("YYYY-MM-DD HH:mm:ss");

      const date = dayjs(item.time).format("YYYY-MM-DD");
      const nowDate = dayjs().format("YYYY-MM-DD");
      if (date === nowDate) {
        formatTime += " 🔸";
      }
    } else {
      formatTime = "未計劃"
    }
    return formatTime;
  });

  if (!messageId) {
    page = 1;
  }

  const pageStartIndex = (page - 1) * PAGE_SIZE;
  const pageEndIndex = (page) * PAGE_SIZE;
  const timelineTextPaged = timeLineText.slice(pageStartIndex, pageEndIndex).map((item, idx) => '【' + ((pageStartIndex + idx + 1) < 10 ? '0' : '') + (pageStartIndex + idx + 1) + "】 " + item);
  const pageInfo = "\n----------------------------------------\n當前第【" + page + "】頁，共【" + Math.ceil(timeLineText.length / PAGE_SIZE) + "】頁";

  const totalText = runningStatus + scheduleStatus + "計劃列表：\n" + timelineTextPaged.join("\n") + pageInfo;
  if (!messageId) {
    // 發送計劃列表
    console.log("[發送計劃列表 first]->");
    const res = await bot.sendMessage(GOD_ID, totalText, {
      reply_markup: {
        inline_keyboard: [
          [{
              text: "首页",
              callback_data: "TimeLinePage-1"
            },
            {
              text: "上一页",
              callback_data: "TimeLinePage-prev"
            },
            {
              text: "下一页",
              callback_data: "TimeLinePage-next"
            }
          ]
        ],
      }
    });
    timer_status = setTimeout(() => {
      // 撤回計劃列表
      try {
        bot.deleteMessage(GOD_ID, res.message_id);
      } catch (error) {
        console.log('cannot delete schedule')
      }
    }, PAGE_STAY_TIME);
  } else {
    console.log("[edit計劃列表 first]->");
    await bot.editMessageText(totalText, {
      chat_id: GOD_ID,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{
              text: "首页",
              callback_data: "TimeLinePage-1"
            },
            {
              text: "上一页",
              callback_data: "TimeLinePage-prev"
            },
            {
              text: "下一页",
              callback_data: "TimeLinePage-next"
            }
          ]
        ],
      }
    });
    timer_status = setTimeout(() => {
      // 撤回計劃列表
      try {
        bot.deleteMessage(GOD_ID, messageId);
      } catch (error) {
        console.log('cannot delete schedule')
      }
    }, PAGE_STAY_TIME);
  }
};

/**
 * 分頁發送時間表
 * @param {array} timeline 時間表，可以不傳
 * @param {string} opreation 操作符，有 prev | next | 1
 * @param {number} messageId 要修改的消息的id
 * 
 */
const pageSchedule = async (timeline = null, opreation, messageId) => {
  if (opreation === "prev") {
    page = page - 1;
    if (page < 1) {
      page = 1;
      return;
    } else {
      sendSchedule(null, messageId);
    }
  } else if (opreation === "next") {
    page = page + 1;
    sendSchedule(null, messageId);
  } else if (opreation === "1") {
    if (page === 1) {
      return;
    } else {
      page = 1;
      sendSchedule(null, messageId);
    }
  }
}

/**
 * 生成一段隨機的時長
 * @param {number} timestamp 基於的時間
 * @returns 時間戳
 */
const generateRdmTime = (timestamp) => {
  const _baseDelta = baseDelta * 60 * 1000; // 基礎delta time時間
  const _maxGrow = maxGrow * 60 * 1000; // 最大再跳時間

  const amStart = "09:35:00";
  const amEnd = "12:00:00";
  const pmStart = "14:00:00";
  const pmEnd = "18:00:00";

  let result = 0;

  /**
   * 根據一個時間戳生成下一個時間
   * @param {number} timestampInput 根據的時間
   * @returns 下一個時間戳
   */
  const goOnce = (timestampInput) => {
    let res = 0;
    const addedTime = parseInt((Math.random() * _maxGrow), 10); // 隨機的新增出來的時間（總delta time）
    res = timestampInput + _baseDelta + addedTime;
    return res;
  }

  /**
   * 校驗所生成的時間是否合法，返回檢查結果
   * @param {number} timestampInput 要檢測的時間戳
   * @returns 狀態
   * 
   * map:
   * 1: 上午，上班前（太早）
   * 2: 上午，工作時
   * 3: 中午，午休時（午休）
   * 4: 下午，工作時
   * 5: 下午，下班後（下班了）
   */
  const checkTimeValid = timestampInput => {
    const time = dayjs(timestampInput).format("HH:mm:ss");

    const BEFORE_MORNING = 1;
    const MORNING = 2;
    const MIDDAY = 3;
    const AFTERNOON = 4;
    const AFTER_WORK = 5;

    let status = null;
    if (time < amStart) {
      status = BEFORE_MORNING;
    } else if (time >= amStart && time <= amEnd) {
      status = MORNING;
    } else if (time > amEnd && time < pmStart) {
      status = MIDDAY;
    } else if (time >= pmStart && time <= pmEnd) {
      status = AFTERNOON;
    } else if (time > pmEnd) {
      status = AFTER_WORK;
    } else {
      status = 9999;
    }
    return status;
  };

  /**
   * 生成時間并判斷，遞歸
   */
  const genTime = (genTimeInput = null) => {
    let res = 0;
    // 單次生成的結果
    res = goOnce(genTimeInput);

    const check = checkTimeValid(res);
    if (check === 2 || check === 4) {
      return res;
    } else {
      return genTime(res);
    }
  }

  result = genTime(timestamp);
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

      const messageIds = one.message_ids.map(mediaItem => mediaItem.msg_id);
      sendRes = await bot.copyMessages(TARGET_GROUP_ID, GOD_ID, messageIds);
      console.log("媒體組 發送完成，準備清理隊列首條");
      // 刪除對話隊列裏的這條消息
      try {
        const delRes = await bot.deleteMessages(GOD_ID, messageIds);
        console.log("[delRes]->", delRes);
      } catch (e) {
        console.log("error in deleting msg", e)
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
      try {
        const delRes = await bot.deleteMessage(GOD_ID, messageId);
        console.log("[delRes]->", delRes);
      } catch (e) {
        console.log("error in deleting msg", e)
      }
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
 * 設定全局配置
 * @param {object} config 全局配置。如果沒有，就從data裏取出來設定到全局；如果有，就合并、保存、並以此設定到全局
 */
const setConfig = async (config = null) => {
  let _data = await getData("config");
  if (config) {
    // 有config，就設定進去data
    Object.assign(_data, config)
    saveData(_data, "config");
  }

  const {
    baseDelta: _b,
    maxGrow: _m,
    autoSpilling: _a
  } = _data;

  baseDelta = _b;
  maxGrow = _m;
  autoSpilling = _a;

  if (config) {
    const text = `修改成功！\n\n基礎時間：${baseDelta}\n最大起跳：${maxGrow}\n時間自動拼接：${autoSpilling}`;
    const res = await bot.sendMessage(GOD_ID, text);
    setTimeout(() => {
      bot.deleteMessage(GOD_ID, res.message_id);
    }, 5000);
  }
};

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

  sendSchedule(null, null);
});

/**
 * 設定時間間隔
 */
module.exports = bot.onText(/\/time/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bot.deleteMessage(GOD_ID, msg.message_id);

  const params = (msg.text + "").replace("/time", "").split(" ");
  console.log("[params]->", params);
  try {
    if (params.length === 3) {
      const p1 = Number(params[1]);
      console.log("[p1]->", p1);
      const p2 = Number(params[2]);
      console.log("[p2]->", p2);

      if (isNaN(p1) || isNaN(p2)) {
        // 如果p1或p2不是數字
        const res = await bot.sendMessage(GOD_ID, "time 參數不是數字!");
        setTimeout(() => {
          bot.deleteMessage(GOD_ID, res.message_id);
        }, 5000);
      } else {
        setConfig({
          baseDelta: p1,
          maxGrow: p2
        });
      }
    } else if (params.length === 1) {
      const text = `此時的參數是：\n\n基礎時間：${baseDelta}\n最大起跳：${maxGrow}`;
      const res = await bot.sendMessage(GOD_ID, text);
      setTimeout(() => {
        bot.deleteMessage(GOD_ID, res.message_id);
      }, 5000);
    } else {
      const res = await bot.sendMessage(GOD_ID, "time 參數數量不匹配!");
      setTimeout(() => {
        bot.deleteMessage(GOD_ID, res.message_id);
      }, 5000);
    }
  } catch (error) {
    console.log("[error in try, get params in time]->", error);
  }
});

/**
 * 設定時間是否自動拼接
 */
module.exports = bot.onText(/\/auto/, onLoveText = async (msg) => {
  if (!checkPermission(msg)) {
    // 無權限，不做處理
    return;
  }
  bot.deleteMessage(GOD_ID, msg.message_id);

  const params = (msg.text + "").replace("/auto", "").split(" ");
  console.log("[params]->", params, params.length);
  try {
    if (params.length === 2) {
      const p1 = JSON.parse(params[1]);
      console.log("[p1]->", p1);

      if (p1 !== true && p1 !== false) {
        // 如果p1不是數字
        const res = await bot.sendMessage(GOD_ID, "auto 參數不是true或false!");
        setTimeout(() => {
          bot.deleteMessage(GOD_ID, res.message_id);
        }, 5000);
      } else {
        setConfig({
          autoSpilling: p1
        });
      }
    } else if (params.length === 1) {
      const text = `此時的參數是：\n\n 是否自動拼接：${autoSpilling}`;
      const res = await bot.sendMessage(GOD_ID, text);
      setTimeout(() => {
        bot.deleteMessage(GOD_ID, res.message_id);
      }, 5000);
    } else {
      const res = await bot.sendMessage(GOD_ID, "time 參數數量不匹配!");
      setTimeout(() => {
        bot.deleteMessage(GOD_ID, res.message_id);
      }, 5000);
    }
  } catch (error) {
    console.log("[error in try, get params in auto]->", error);
  }
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

setConfig();

module.exports = {
  scheduleTimeLine, // 導出給callback調用
  pageSchedule, // // 導出給callback調用
  generateRdmTime, // 導出給message_manager調用
  autoSpilling // 導出給message_manager使用
};