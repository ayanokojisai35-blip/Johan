Cmd install mj2.js const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const { Readable } = require("stream");

const BASE_URL = "http://45.141.118.140:5000";

// 🔁 Retry for 429
async function fetchWithRetry(url, params, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { params, timeout: 300000 });
    } catch (err) {
      if (err.response?.status === 429) {
        await new Promise(r => setTimeout(r, delay));
      } else throw err;
    }
  }
  throw new Error("Rate limited");
}

// 📡 Status check
async function pollStatus(maxWait = 5 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await axios.get(`${BASE_URL}/api/status`);
      if (!res.data.running && res.data.step === "complete")
        return true;
    } catch {}
    await new Promise(r => setTimeout(r, 6000));
  }
  return false;
}

// 🖼️ Grid
async function buildGrid(urls) {
  const buffers = await Promise.all(
    urls.map(url =>
      axios.get(url, { responseType: "arraybuffer" })
        .then(r => Buffer.from(r.data))
    )
  );

  const imgs = await Promise.all(buffers.map(b => loadImage(b)));

  const w = imgs[0].width;
  const h = imgs[0].height;
  const gap = 6;

  const canvas = createCanvas(w * 2 + gap, h * 2 + gap);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pos = [
    [0, 0],
    [w + gap, 0],
    [0, h + gap],
    [w + gap, h + gap]
  ];

  imgs.forEach((img, i) => {
    ctx.drawImage(img, pos[i][0], pos[i][1], w, h);
  });

  const stream = new Readable({ read() {} });
  stream.push(canvas.toBuffer("image/png"));
  stream.push(null);
  stream.path = "mj.png";

  return stream;
}

// 🖼️ Single
async function getImage(url) {
  const buf = await axios.get(url, { responseType: "arraybuffer" })
    .then(r => Buffer.from(r.data));

  const stream = new Readable({ read() {} });
  stream.push(buf);
  stream.push(null);
  stream.path = "img.png";

  return stream;
}

module.exports = {
  config: {
    name: "daul",
    version: "1.0",
    author: "Nil",
    countDown: 20,
    role: 0,
    shortDescription: {
      en: "Generate AI images"
    },
    longDescription: {
      en: "MidJourney style 4 image generator"
    },
    category: "image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  aliases: ["midjourney2"],

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ").trim();
    const { threadID, senderID } = event;

    if (!prompt)
      return api.sendMessage("❌ | give prompt", threadID);

    // 🔹 Only ONE line message
    const wait = await api.sendMessage("Daul 🫠 | generating...plz wait sister 🤡", threadID);

    try {
      await new Promise(r => setTimeout(r, 2000));

      const res = await fetchWithRetry(
        `${BASE_URL}/api/mid`,
        { prompt }
      );

      const urls = res.data?.urls;
      if (!urls || urls.length < 4)
        return api.sendMessage("❌ | api error", threadID);

      const done = await pollStatus();
      if (!done)
        return api.sendMessage("⏰ | timeout", threadID);

      const grid = await buildGrid(urls);

      api.unsendMessage(wait.messageID);

      const sent = await api.sendMessage(
        {
          body: `🖼️ | ${prompt}\n(u1–u4)`,
          attachment: grid
        },
        threadID
      );

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "mj2",
        author: senderID,
        urls,
        prompt
      });

    } catch (err) {
      api.sendMessage("❌ | failed", threadID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, senderID, body } = event;

    if (senderID !== Reply.author) return;

    const match = body.toLowerCase().trim().match(/^u([1-4])$/);
    if (!match) return;

    const index = parseInt(match[1]) - 1;
    const url = Reply.urls[index];
    if (!url) return;

    try {
      const img = await getImage(url);

      api.sendMessage(
        {
          body: `🖼️ ${match[1]}`,
          attachment: img
        },
        threadID
      );
    } catch {}
  }
};
