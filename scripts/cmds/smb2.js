const axios = require("axios");

module.exports = {
  config: {
    name: "smb2",
    version: "4.0",
    author: "azad",
    countDown: 5,
    role: 0,
    shortDescription: "Bulk SMS sender (smart)",
    longDescription: "Handle large SMS requests safely with batching",
    category: "utility"
  },

  onStart: async function ({ args, message }) {
    const num = args[0];
    const count = parseInt(args[1]);

    if (!num || !count) {
      return message.reply("Usage: smb2 <number> <count 1-1000>");
    }

    if (count < 1 || count > 1000) {
      return message.reply("Limit: 1 - 1000");
    }

    let success = 0;
    let failed = 0;

    const batchSize = 20; // per batch
    const delay = 300; // per request

    const msg = await message.reply(`🚀 Processing ${count} requests...\n⏳ Please wait...`);

    for (let i = 0; i < count; i++) {
      try {
        const res = await axios.get(
          `https://azadx69x-all-apis-top.vercel.app/api/bm?num=${num}&count=1`
        );

        if (res.data && (res.data.success || res.status === 200)) {
          success++;
        } else {
          failed++;
        }

      } catch (e) {
        failed++;
      }

      // delay each request
      await new Promise(r => setTimeout(r, delay));

      // batch pause
      if ((i + 1) % batchSize === 0) {
        await message.edit(
          `📡 Progress: ${i + 1}/${count}\n✅ ${success} | ❌ ${failed}`,
          msg.messageID
        );
        await new Promise(r => setTimeout(r, 1500)); // extra pause
      }
    }

    return message.reply(
      `📊 Final Result:\n` +
      `✅ Success: ${success}\n` +
      `❌ Failed: ${failed}\n` +
      `📨 Total: ${count}`
    );
  }
};
