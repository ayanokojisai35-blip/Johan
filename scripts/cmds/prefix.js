const fs = require("fs-extra");
const { utils } = global;
// ===== RANDOM PREFIX MEDIA =====
const mediaFolder = path.join(__dirname, "..", "prefix.gife");

function getRandomPrefixMedia() {
  try {
    const files = fs.readdirSync(mediaFolder);

    const mediaFiles = files.filter(file =>
      [".gif", ".mp4", ".jpg", ".png", ".jpeg"].includes(
        path.extname(file).toLowerCase()
      )
    );

    if (!mediaFiles.length) return null;

    const randomFile = mediaFiles[Math.floor(Math.random() * mediaFiles.length)];
    return fs.createReadStream(path.join(mediaFolder, randomFile));
  } catch (err) {
    console.log("Prefix media error:", err);
    return null;
  }
}
module.exports = {
  config: {
    name: "prefix",
    version: "0.0.8",
    author: "Azadx69x",
    countDown: 5,
    role: 0,
    shortDescription: "Prefix manager",
    longDescription: "Control bot prefix (chat/global)",
    category: "system"
  },

  langs: {
    en: {
      askPrefix: "╭━━[ Perfect Tool ]━━╮\n┃🀄 System: %global%\n┃💬 Your Box: %chat%\n╰━━━━━━━━━━━━━╯",
      resetPrefix: "╭━━[ Perfect Tool ]━━╮\n┃♻️ Status: Reset\n┃🀄 System: %global%\n┃💬 Your Box: %global%\n╰━━━━━━━━━━━━━╯",
      confirmChange: "╭━━[ Perfect Tool ]━━╮\n┃♻️ %type% Change\n┃🔄 %old% ⇢ %new%\n╰━━━━━━━━━━━━━╯\n👆 React with ✅ to confirm",
      updatedGlobal: "╭━━[ Perfect Tool ]━━╮\n┃✅ Global Updated\n┃✨ New Prefix: %prefix%\n╰━━━━━━━━━━━━━╯",
      updatedChat: "╭━━[ Perfect Tool ]━━╮\n┃✅ Chat Updated\n┃✨ New Prefix: %prefix%\n╰━━━━━━━━━━━━━╯",
      ownerOnly: "⛔ Owner Only Access",
      cancelled: "❌ Action Cancelled"
    }
  },

  onStart: async function ({ api, event, args, threadsData, getLang }) {
    const { threadID, messageID, senderID } = event;

    const globalPf = global.GoatBot.config.prefix;
    const threadPf = await threadsData.get(threadID, "data.prefix").catch(() => null);
    const currentPf = threadPf || globalPf;

    // Show current prefix if no arguments provided
    if (!args[0]) {
      return api.sendMessage(
        getLang("askPrefix").replace("%global%", globalPf).replace("%chat%", currentPf),
        threadID,
        messageID
      );
    }

    // Reset prefix to global
    if (args[0].toLowerCase() === "reset") {
      await threadsData.set(threadID, null, "data.prefix");
      return api.sendMessage(
        getLang("resetPrefix").replace(/%global%/g, globalPf),
        threadID,
        messageID
      );
    }

    const nextPf = args[0];
    const isGlobal = args[1] === "-g";

    // Admin check for Global prefix change
    if (isGlobal && !global.GoatBot.config.adminBot.includes(senderID)) {
      return api.sendMessage(getLang("ownerOnly"), threadID, messageID);
    }

    const confirmText = isGlobal
      ? getLang("confirmChange").replace("%type%", "Global").replace("%old%", globalPf).replace("%new%", nextPf)
      : getLang("confirmChange").replace("%type%", "Chat").replace("%old%", currentPf).replace("%new%", nextPf);

    return api.sendMessage(confirmText, threadID, (err, info) => {
      if (err) return;
      
      global.GoatBot.onReaction.set(info.messageID, {
        messageID: info.messageID,
        commandName: "prefix",
        uid: senderID,
        prefix: nextPf,
        isGlobal: isGlobal,
        threadID: threadID
      });
    }, messageID);
  },

  onReaction: async function ({ api, event, Reaction, threadsData, getLang }) {
    const { userID, messageID, reaction, threadID } = event;
    
    if (!Reaction || Reaction.uid !== userID) return;
    
    const normalizedReaction = reaction ? reaction.toString().replace(/\uFE0F/g, '').trim() : '';
    const targetEmoji = "✅";
    
    const isConfirm = normalizedReaction === targetEmoji || 
                      normalizedReaction === "✓" || 
                      normalizedReaction === "☑" ||
                      normalizedReaction === "✔";
    
    if (!isConfirm) {
      global.GoatBot.onReaction.delete(messageID);
      return api.sendMessage(getLang("cancelled"), Reaction.threadID, messageID);
    }

    const { prefix, isGlobal } = Reaction;
    
    global.GoatBot.onReaction.delete(messageID);

    if (isGlobal) {
      global.GoatBot.config.prefix = prefix;
      await fs.writeFile(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
      return api.sendMessage(getLang("updatedGlobal").replace("%prefix%", prefix), threadID);
    }

    await threadsData.set(threadID, prefix, "data.prefix");
    return api.sendMessage(getLang("updatedChat").replace("%prefix%", prefix), threadID);
  }
};
