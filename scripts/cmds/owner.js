const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { getPrefix } = global.utils;

// MEDIA FOLDER
const mediaFolder = path.join(__dirname, "..", "owner.gife");

// RANDOM MEDIA
function getRandomOwnerMedia() {
  try {
    const files = fs.readdirSync(mediaFolder);
    const media = files.filter(f =>
      [".gif", ".mp4", ".jpg", ".png", ".jpeg"]
        .includes(path.extname(f).toLowerCase())
    );
    if (!media.length) return null;
    const file = media[Math.floor(Math.random() * media.length)];
    return fs.createReadStream(path.join(mediaFolder, file));
  } catch {
    return null;
  }
}

module.exports = {
  config: {
    name: "owner",
    version: "4.2.0",
    author: "Saidul",
    role: 0,
    category: "OWNER",
    shortDescription: "Owner Information",
    longDescription: "Show owner info with random media",
    guide: "{pn}",
    usePrefix: false
  },

   onStart: async function ({ api, event }) {

    const prefix = getPrefix(event.threadID);

    const owner = {
      name: "LELOUCH VI BRITANNIA",
      nick: "Lelouch",
      gender: "MALE",
      age: "18",
      height: "5'8",
      facebook: "https://www.facebook.com/profile.php?id=61558762813083"
    };

    const uptimeSec = process.uptime();
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = Math.floor(uptimeSec % 60);
    const uptime = `${h}h ${m}m ${s}s`;

    const msg =
`╔══════════════════╗
      OWNER INFO
╚══════════════════╝

👤 Name : ${owner.name}
🫐 Nick : ${owner.nick}
🫐 Gender : ${owner.gender}
🫐 Age : ${owner.age}
🫐 Height : ${owner.height}

📂 Category : OWNER

🌐 Facebook :
${owner.facebook}

━━━━━━━━━━━━━━━━━━
⏱ Uptime : ${uptime}
🤖 Prefix : ${prefix}
━━━━━━━━━━━━━━━━━━`;

    try {
      const media = getRandomOwnerMedia();

      if (media) {
        return api.sendMessage(
          {
            body: msg,
            attachment: media
          },
          event.threadID
        );
      }

      // fallback media
      const imgur = "https://i.imgur.com/cUVzhx7.mp4";
      const ext = path.extname(imgur);
      const temp = path.join(__dirname, `owner_temp${ext}`);

      const res = await axios.get(imgur, { responseType: "stream" });
      const writer = fs.createWriteStream(temp);
      res.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage(
          {
            body: msg,
            attachment: fs.createReadStream(temp)
          },
          event.threadID,
          () => fs.unlinkSync(temp)
        );
      });

    } catch (err) {
      api.sendMessage(msg, event.threadID);
    }
  }
};
