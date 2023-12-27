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
 * 隨機的幾張摸魚的圖片
 */
const touchfishImg = [
	"https://5b0988e595225.cdn.sohucs.com/q_70,c_zoom,w_640/images/20190501/436ea315b6cd499b841b5f3a0ca022c8.jpeg",
	"https://pub.creaders.net/upload_files/image/201801/20180120_15165198536083.jpg",
	"https://imagedelivery.net/UYQOTZcPn8gGeaNtnHVGeg/2da8b034-d53e-4819-66bc-4720bab65500/w=768,quality=90,metadata=keep",
	"https://p3-sign.toutiaoimg.com/pgc-image/05f2115827364cc0a1c77ee962fe3c4e~tplv-tt-large-asy2:5aS05p2hQOS4gOS4qumXsuS6ujIzNA==.image?x-expires=2013247336&x-signature=hBUXL305W66av3cRlV%2BqTfBWbDw%3D",
	"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxtpnNSYnIgUpoznpA_zJx4n_j9yFA_K0XXf8mSZYCSj6wVmf-6reQssSxolEVvMgI6Ik&usqp=CAU",
	"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbuHG0uGN1PBHuva1QpE01xlbYuZqb8eG7DBFdDG8fuWUHDjmVc8ZvWBoPR9ug3Utrj84&usqp=CAU",
	"https://inews.gtimg.com/news_bt/OmKRHEyDVAs8t9MyQiy2DdU-YH77jImd0u_171D0J3lHcAA/641",
	"https://imagepphcloud.thepaper.cn/pph/image/223/112/502.jpg",
	"https://imagepphcloud.thepaper.cn/pph/image/223/112/504.jpg",
	"https://imagepphcloud.thepaper.cn/pph/image/223/112/506.jpg",
	"http://5b0988e595225.cdn.sohucs.com/images/20190630/588bd3ecaf624870aff60b2c7e9d0d78.jpeg",
	"http://img.mp.itc.cn/upload/20160828/9947a3a9ed414077bf3f85f2e9586d87_th.JPG"
];
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
		if (msg.from.id === msg.chat.id) {
			// 是其他人和機器人私聊
			const url = touchfishImg[Math.floor(Math.random() * touchfishImg.length)];
			bot.sendPhoto(
				msg.chat.id,
				url,
				{ caption: "对不起，我正在摸魚中，不能陪你玩，请你找 @touchfish_bot 玩吧！" }
			);
		}
	}
	return haveAuth;
}

module.exports = {
	saveData,
	getData,
	checkPermission,
};