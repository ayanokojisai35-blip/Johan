const { recognizeSong } = require("st-shazam");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

let ffmpeg;
try {
  ffmpeg = require("fluent-ffmpeg");
} catch {
  ffmpeg = null;
}

module.exports = {
  config: {
    name: "shazam",
    aliases: [],
    version: "3.2",
    author: "ST | Fixed Safe",
    countDown: 5,
    role: 0,
    shortDescription: "Identify song from audio/video",
    longDescription: "Reply to audio/video to detect song",
    category: "music",
    guide: "{pn} (reply audio/video)\n{pn} info (detailed info)"
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      const userName = await usersData.getName(event.senderID).catch(() => "User");

      if (!event.messageReply)
        return message.reply("⚠️ Reply to an audio or video message.");

      const attachment = event.messageReply.attachments?.find(
        a => a.type === "audio" || a.type === "video"
      );

      if (!attachment)
        return message.reply("⚠️ No audio or video found in the replied message.");

      // Video requires ffmpeg
      if (attachment.type === "video" && !ffmpeg)
        return message.reply("⚠️ ffmpeg is not installed. Video is not supported.");

      const isInfo = args[0]?.toLowerCase() === "info";

      const processingMsg = await message.reply(`🎵 ${userName}, identifying song...`);

      const cacheDir = path.join(__dirname, "cache");
      fs.ensureDirSync(cacheDir);

      const timestamp = Date.now();
      let audioPath;

      // Download file
      const res = await axios.get(attachment.url, { responseType: "arraybuffer" });

      if (attachment.type === "video") {
        const videoPath = path.join(cacheDir, `video_${timestamp}.mp4`);
        audioPath = path.join(cacheDir, `audio_${timestamp}.mp3`);

        fs.writeFileSync(videoPath, res.data);

        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .noVideo()
            .audioCodec("libmp3lame")
            .format("mp3")
            .save(audioPath)
            .on("end", resolve)
            .on("error", reject);
        });

        fs.removeSync(videoPath);
      } else {
        audioPath = path.join(cacheDir, `audio_${timestamp}.mp3`);
        fs.writeFileSync(audioPath, res.data);
      }

      // Recognize song
      const result = await recognizeSong(audioPath).catch(() => null);
      fs.removeSync(audioPath);

      await message.unsend(processingMsg.messageID);

      if (!result?.results?.matches?.length)
        return message.reply("❌ No matches found. Song might not be in Shazam database.");

      const matchId = result.results.matches[0].id;
      const songData = result.resources["shazam-songs"][matchId];
      const attributes = songData.attributes;
      const previewUrl = attributes?.streaming?.preview;

      // Info mode
      if (isInfo) {
        const albumData = result.resources.albums ? Object.values(result.resources.albums)[0] : null;
        const genreData = result.resources.genres ? Object.values(result.resources.genres)[0] : null;

        const duration = songData.meta?.duration || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);

        let infoMessage = `✅ Song Information\n\n`;
        infoMessage += `🎵 ${attributes.title}\n`;
        infoMessage += `👤 ${attributes.artist}\n`;
        if (albumData) infoMessage += `💿 ${albumData.attributes.name}\n📅 ${albumData.attributes.releaseDate}\n`;
        infoMessage += `🏷️ ${attributes.label}\n`;
        if (genreData) infoMessage += `🎸 ${genreData.attributes.name}\n`;
        infoMessage += `⏱️ ${minutes}:${seconds.toString().padStart(2, "0")}`;

        const attachments = [];

        // Cover art
        if (attributes.images?.coverArtHq) {
          try {
            const artRes = await axios.get(attributes.images.coverArtHq, { responseType: "arraybuffer" });
            const artPath = path.join(cacheDir, `cover_${timestamp}.jpg`);
            fs.writeFileSync(artPath, artRes.data);
            attachments.push(fs.createReadStream(artPath));
          } catch {}
        }

        // Audio preview
        if (previewUrl) {
          try {
            const audioRes = await axios.get(previewUrl, { responseType: "arraybuffer" });
            const audioPath = path.join(cacheDir, `preview_${timestamp}.m4a`);
            fs.writeFileSync(audioPath, audioRes.data);
            attachments.push(fs.createReadStream(audioPath));
          } catch {}
        }

        return message.reply({ body: infoMessage, attachment: attachments.length ? attachments : undefined });
      }

      // Basic mode
      let basicMessage = `✅ Song Found!\n\n🎵 ${attributes.title}\n👤 ${attributes.artist}`;
      if (!previewUrl) return message.reply(basicMessage);

      try {
        const audioRes = await axios.get(previewUrl, { responseType: "arraybuffer" });
        const audioPath = path.join(cacheDir, `preview_${timestamp}.mp3`);
        fs.writeFileSync(audioPath, audioRes.data);

        await message.reply({ body: basicMessage, attachment: fs.createReadStream(audioPath) });
        setTimeout(() => fs.removeSync(audioPath), 5000);
      } catch {
        return message.reply(basicMessage + "\n⚠️ Audio preview unavailable");
      }
    } catch (err) {
      console.error(err);
      return message.reply("⚠️ Error: " + err.message);
    }
  }
};
