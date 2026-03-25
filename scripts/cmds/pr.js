const { loadImage, createCanvas } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
 config: {
 name: "pr",
 author: "ayanokoji",
 role: 0,
 shortDescription: "Pair two users with a cute image",
 longDescription: "",
 category: "love",
 guide: "{pn}"
 },

 onStart: async function ({ api, event }) {
 const cacheDir = __dirname + "/cache";
 const pathImg = cacheDir + "/background.png";
 const pathAvt1 = cacheDir + "/Avtmot.png";
 const pathAvt2 = cacheDir + "/Avthai.png";

 // 🧹 Ensure cache directory exists
 fs.ensureDirSync(cacheDir);

 const id1 = event.senderID;
 const botID = api.getCurrentUserID();
 let name1 = ""; // Optional: fetch from usersData if needed
 let gender1;

 // Get all users from the group
 const threadInfo = await api.getThreadInfo(event.threadID);
 const all = threadInfo.userInfo;

 for (const user of all) {
 if (user.id === id1) gender1 = user.gender;
 }

 // Gender-based filtering for pairing
 let candidates = [];
 for (const user of all) {
 if (user.id !== id1 && user.id !== botID) {
 if (gender1 === "FEMALE" && user.gender === "MALE") candidates.push(user.id);
 else if (gender1 === "MALE" && user.gender === "FEMALE") candidates.push(user.id);
 else if (!gender1) candidates.push(user.id);
 }
 }

 // Pick random partner
 const id2 = candidates[Math.floor(Math.random() * candidates.length)];
 const name2 = "Uff ksto ramro jodi 💋"; // Optional: fetch actual name from usersData

 // Compatibility % randomizer
 const rd1 = Math.floor(Math.random() * 100) + 1;
 const chaosVals = ["0", "-1", "99,99", "-99", "-100", "101", "0,01"];
 const rd2 = chaosVals[Math.floor(Math.random() * chaosVals.length)];
 const options = [rd1, rd1, rd1, rd1, rd1, rd2, rd1, rd1, rd1, rd1];
 const compatibility = options[Math.floor(Math.random() * options.length)];

 // Random background
 const backgrounds = [
 "https://i.postimg.cc/0rgC9kxY/background1.png",
 "https://i.postimg.cc/bw94VMHC/background2.png",
 "https://i.postimg.cc/rm3HtLMm/background3.png",
 "https://i.postimg.cc/QtQ6VK46/background4.png",
 ];
 const selectedBG = backgrounds[Math.floor(Math.random() * backgrounds.length)];

 // 🖼️ Download avatars
 const avt1 = (
 await axios.get(`https://graph.facebook.com/${id1}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, {
 responseType: "arraybuffer"
 })
 ).data;
 fs.writeFileSync(pathAvt1, Buffer.from(avt1, "utf-8"));

 const avt2 = (
 await axios.get(`https://graph.facebook.com/${id2}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, {
 responseType: "arraybuffer"
 })
 ).data;
 fs.writeFileSync(pathAvt2, Buffer.from(avt2, "utf-8"));

 // Download background
 const bgData = (
 await axios.get(selectedBG, {
 responseType: "arraybuffer"
 })
 ).data;
 fs.writeFileSync(pathImg, Buffer.from(bgData, "utf-8"));

 // ✨ Generate final canvas image
 const baseImage = await loadImage(pathImg);
 const avatar1 = await loadImage(pathAvt1);
 const avatar2 = await loadImage(pathAvt2);

 const canvas = createCanvas(baseImage.width, baseImage.height);
 const ctx = canvas.getContext("2d");

 ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
 ctx.drawImage(avatar1, 100, 150, 300, 300);
 ctx.drawImage(avatar2, 900, 150, 300, 300);

 const finalImage = canvas.toBuffer();
 fs.writeFileSync(pathImg, finalImage);

 // 🔚 Cleanup avatar files
 fs.removeSync(pathAvt1);
 fs.removeSync(pathAvt2);

 return api.sendMessage(
 {
 body: `🥰 Successful pairing!\n💌 Wish you two hundred years of happiness 💕\n—The odds are ${compatibility}%`,
 mentions: [
 {
 tag: name2,
 id: id2
 }
 ],
 attachment: fs.createReadStream(pathImg),
 },
 event.threadID,
 () => fs.unlinkSync(pathImg),
 event.messageID
 );
 },
};