const {
  getData,
  saveData,
} = require("../utils/index");

/**
 * 為剩餘的消息排期
 */
const scheduleTimeLine = async () => {
  const timeline = await getData("timeline");
  if (timeline.length) {
    timeline.forEach((item, index) => {
      if(item.time) {
        // 這個已經有排期了，直接下一個
        // do nothing
      } else {
        // 沒安排時間，先看看是否有前序消息
        if(index === 0) {
          // 自己就是隊首了
          const d = new Date();
          const t = d.getTime();
          console.log("[getTime]->", t );
          const time = generateRdmTime(t);
          item.time = time;
        } else {
          // 前面有前序
          const prevItem = timeline[index - 1];
          const prevTime = prevItem.time;
          console.log("[prevTime]->", prevTime);
          const time = generateRdmTime(prevTime);
          item.time = time;
        }
      }
    });
  } else {
    console.log("timeline has no length");
  }
  saveData(timeline, "timeline");
};

/**
 * 生成一段隨機的時長
 * @param {number} timestamp 基於的時間
 * @returns 時間戳
 */
const generateRdmTime = (timestamp) => {
  console.log("[generateRdmTime]->", timestamp);
  const baseTime = 7 * 60 * 1000; // 5分鐘(ms) 基礎時間
  const growRange = 4 * 60 * 1000; // 5分鐘(ms) 限定隨機範圍

  let result = 0;
  const addedTime = parseInt((Math.random() * growRange), 10); // 隨機的新增出來的時間（0~8分鐘(ms)）
  console.log("[addedTime]->", addedTime);
  if (timestamp) {
    result = baseTime + addedTime + timestamp;
  } else {
    result = baseTime + addedTime;
  }
  console.log("[result]->", result);
  return result;
};

module.exports = {
  scheduleTimeLine
};