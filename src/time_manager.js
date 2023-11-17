const {
  getData,
  saveData,
} = require("../utils/index");

const getTimeLine = () => {
  const timeline = getData("timeline");
  return timeline;
}

const saveTimeLine = (data) => {
  const timeline = saveData(data, "timeline");
}

/**
 * 為剩餘的消息排期
 */
const calculateTime = () => {
  
}