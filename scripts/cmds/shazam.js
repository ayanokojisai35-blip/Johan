Cmd install shazam.js const { recognizeSong } = require("st-shazam");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

module.exports = {
  config: {
    name: "shazam",
    version: "3.0",
    author: "ST",
    countDown: 5,
    role: 0,
    shortDescription: "Identify songs from audio/video",
    longDescription: "Reply to audio/video to identify song",
    category: "music",
    guide: "{pn} / reply audio/video\n{pn} info / detailed info"
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      const name = await usersData.getName(event.senderID);

      if (!event.messageReply) {
        return message.reply("⚠️ Reply to an audio or video.");
      }

      const attachment = event.messageReply.attachments?.find(
        (a) => a.type === "audio" || a.type === "video"
      );

      if (!attachment) {
        return message.reply("⚠️ No audio/video found.");
      }

      const isInfo = args[0] === "info";

      const msg = await message.reply(`🎧 ${name}, detecting song...`);

      const cache = path.join(__dirname, "cache");
      fs.ensureDirSync(cache);

      const time = Date.now();
      let audioPath;

      // download file
      const res = await axios.get(attachment.url, {
        responseType: "arraybuffer"
      });

      // ---------------- VIDEO ----------------
      if (attachment.type === "video") {
        const videoPath = path.join(cache, `vid_${time}.mp4`);
        audioPath = path.join(cache, `aud_${time}.mp3`);

        fs.writeFileSync(videoPath, res.data);

        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .noVideo()
            .audioCodec("libmp3lame")
            .save(audioPath)
            .on("end", resolve)
            .on("error", reject);
        });

        fs.removeSync(videoPath);
      }

      // ---------------- AUDIO ----------------
      else {
        audioPath = path.join(cache, `aud_${time}.mp3`);
        fs.writeFileSync(audioPath, res.data);
      }

      // ---------------- SHAZAM ----------------
      const data = await recognizeSong(audioPath);
      fs.removeSync(audioPath);

      await message.unsend(msg.messageID);

      const match = data?.results?.matches?.[0];
      if (!match) {
        return message.reply("❌ Song not found.");
      }

      const song = data.resources["shazam-songs"][match.id];
      const attr = song.attributes;

      const preview =
        data.resources?.["shazam-songs"]?.[match.id]?.attributes?.streaming
          ?.preview;

      // ---------------- BASIC ----------------
      if (!isInfo) {
        let text = `✅ Song Found!\n\n🎵 ${attr.title}\n👤 ${attr.artist}`;

        if (!preview) return message.reply(text);

        const file = path.join(cache, `pre_${time}.mp3`);

        try {
          const p = await axios.get(preview, {
            responseType: "arraybuffer"
          });

          fs.writeFileSync(file, p.data);

          await message.reply({
            body: text,
            attachment: fs.createReadStream(file)
          });

          setTimeout(() => fs.removeSync(file), 5000);
        } catch {
          message.reply(text + "\n⚠️ No preview");
        }

        return;
      }

      // ---------------- INFO MODE ----------------
      const album = data.resources.albums
        ? Object.values(data.resources.albums)[0]
        : null;

      const genre = data.resources.genres
        ? Object.values(data.resources.genres)[0]
        : null;

      const duration = song.meta?.duration || 0;
      const min = Math.floor(duration / 60);
      const sec = Math.floor(duration % 60);

      let text = `🎧 Song Info\n\n`;
      text += `🎵 ${attr.title}\n`;
      text += `👤 ${attr.artist}\n`;

      if (album) {
        text += `💿 ${album.attributes.name}\n`;
        text += `📅 ${album.attributes.releaseDate}\n`;
      }

      text += `🏷️ ${attr.label}\n`;

      if (genre) text += `🎸 ${genre.attributes.name}`;

      text += `\n⏱️ ${min}:${sec.toString().padStart(2, "0")}`;

      const files = [];

      // cover
      if (attr.images?.coverArtHq) {
        try {
          const img = await axios.get(attr.images.coverArtHq, {
            responseType: "arraybuffer"
          });
          const imgPath = path.join(cache, `img_${time}.jpg`);
          fs.writeFileSync(imgPath, img.data);
          files.push(fs.createReadStream(imgPath));
        } catch {}
      }

      // preview
      if (preview) {
        try {
          const p = await axios.get(preview, {
            responseType: "arraybuffer"
          });
          const pPath = path.join(cache, `pre_${time}.m4a`);
          fs.writeFileSync(pPath, p.data);
          files.push(fs.createReadStream(pPath));
        } catch {}
      }

      await message.reply({
        body: text,
        attachment: files.length ? files : undefined
      });

      setTimeout(() => {
        fs.readdirSync(cache).forEach((f) => {
          if (f.startsWith("img_") || f.startsWith("pre_")) {
            fs.removeSync(path.join(cache, f));
          }
        });
      }, 5000);
    } catch (e) {
      console.error(e);
      return message.reply("⚠️ Error: " + e.message);
    }
  }
};
