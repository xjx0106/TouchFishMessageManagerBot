const fs = require('fs');
const bot = require('../index');
const {
	GOD_ID
} = require('../config');

/**
 * 保存文件
 * @param { Object } data 要保存的json數據 
 * @param { String } name 保存的文件名 
 */
const saveData = (data = {}, name = "1") => {
	const content = JSON.stringify(data);
	fs.writeFileSync('./data/' + name + '.json', content);
};

/**
 * 讀取文件
 * @param { String } name 讀取的文件名
 * @returns 返回所讀取到的json文件的json數據
 */
const getData = (name = "1") => {
	let rawdata = fs.readFileSync('./data/' + name + '.json');
	let data = JSON.parse(rawdata);
	return data;
};

/**
 * 检查权限
 * @param {object} msg 接受到的消息數據
 * @returns {boolean} 是否有權限
 */
const checkPermission = (msg) => {
	let haveAuth = false;
	if (msg.from.id === GOD_ID && msg.chat.id === GOD_ID) {
		haveAuth = true;
	} else {
		haveAuth = false;
	}
	return haveAuth;
}

module.exports = {
	saveData,
	getData,
	checkPermission,
};