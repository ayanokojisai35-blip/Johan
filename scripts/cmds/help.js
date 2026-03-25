const fs = require("fs");
const path = require("path");

const CATEGORY_PER_PAGE = 10;
const frames = ["👑","🩸","⚔️","🕊️","🔥","🎭","♟️"];

// Lelouch Quotes
const quotes = [
  "The only ones who should kill are those prepared to be killed.",
  "I will create a world where Nunnally can live happily.",
  "Obey me, world!",
  "If the king doesn’t move, then his subjects won’t follow.",
  "I destroy worlds… and create them anew.",
  "Power is not given. It is taken."
];

// MEDIA FOLDER
const mediaFolder = path.join(__dirname, "help.gife");

// RANDOM MEDIA
function getRandomHelpMedia() {
  try {
    const files = fs.readdirSync(mediaFolder);
    const media = files.filter(f =>
      [".gif",".mp4",".jpg",".png",".jpeg"]
      .includes(path.extname(f).toLowerCase())
    );
    if (!media.length) return null;
    const file = media[Math.floor(Math.random() * media.length)];
    return fs.createReadStream(path.join(mediaFolder, file));
  } catch {
    return null;
  }
}

// RANDOM QUOTE
function getQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// ARRAY CHUNK
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size)
    result.push(arr.slice(i, i + size));
  return result;
}

module.exports = {
  config: {
    name: "help",
    aliases: ["menu"],
    version: "2.0",
    author: "Lelouch vi Britannia 👑",
    countDown: 5,
    role: 0,
    shortDescription: "Command system",
    longDescription: "Lelouch styled command panel",
    category: "system",
    guide: {
      en: "{pn} / {pn} <page> / {pn} <command> / {pn} all"
    }
  },

  onStart: async function ({ message, args, event, role, api }) {

    const prefix = global.GoatBot.config.prefix;
    const commands = global.GoatBot.commands;
    const aliases = global.GoatBot.aliases;

    const categoryMap = {};

    // COLLECT COMMANDS
    for (const [name, cmd] of commands) {
      const cfg = cmd.config;
      if (!cfg) continue;
      if ((cfg.role || 0) > role) continue;

      const category = (cfg.category || "general").toLowerCase();

      if (!categoryMap[category])
        categoryMap[category] = [];

      categoryMap[category].push({
        name,
        premium: cfg.premium || false
      });
    }

    const categories = Object.keys(categoryMap).sort();

    // ===== ALL COMMANDS =====
    if (args[0] === "all") {
      let msg = `👑LELOUCH VI BRITANNIA COMMAND SYSTEM👑\n\n`;

      for (const cat of categories) {
        msg += `⚔️ ${cat.toUpperCase()}\n`;

        for (const cmd of categoryMap[cat]) {
          msg += `${cmd.premium ? "💎" : "♟️"} ${cmd.name} `;
        }

        msg += "\n\n";
      }

      msg += `🔥 Total Commands: ${commands.size}\n\n`;
      msg += `🎭 "${getQuote()}"`;

      return message.reply({
        body: msg,
        attachment: getRandomHelpMedia()
      });
    }

    // ===== COMMAND DETAILS =====
    if (args[0] && isNaN(args[0])) {
      const query = args[0].toLowerCase();

      let cmd = commands.get(query);
      if (!cmd && aliases.has(query))
        cmd = commands.get(aliases.get(query));

      if (!cmd)
        return message.reply("❌ Command not found.");

      const cfg = cmd.config;

      let guide = cfg.guide || "No guide available.";

      if (typeof guide === "object")
        guide = guide.en || Object.values(guide)[0] || "";

      guide = String(guide).replace(/{pn}/g, prefix + cfg.name);

      const msg =
`👑LELOUCH COMMAND PANEL👑

⚔️ Name: ${prefix}${cfg.name}
🩸 Author: ${cfg.author || "Unknown"}
🎭 Version: ${cfg.version || "1.0"}
♟️ Role: ${cfg.role || 0}
🔥 Cooldown: ${cfg.countDown || 5}s
🕊️ Category: ${cfg.category || "general"}
💎 Premium: ${cfg.premium ? "Yes" : "No"}

📜 Usage:
${guide}

🎭 "${getQuote()}"`;

      return message.reply({
        body: msg,
        attachment: getRandomHelpMedia()
      });
    }

    // ===== PAGE SYSTEM =====
    const pages = chunkArray(categories, CATEGORY_PER_PAGE);
    const totalPages = pages.length;

    let page = parseInt(args[0]) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = 1;

    const currentCategories = pages[page - 1];

    function build(frame) {
      let msg =
`${frame} LELOUCH VI BRITANNIA ${frame}
━━━━━━━━━━━━━━━━━━
👑 COMMAND MENU
Page ${page}/${totalPages}
━━━━━━━━━━━━━━━━━━
`;

      for (const cat of currentCategories) {
        msg += `\n⚔️ ${cat.toUpperCase()}\n`;

        for (const cmd of categoryMap[cat]) {
          msg += `${cmd.premium ? "💎" : "♟️"} ${cmd.name} `;
        }

        msg += "\n";
      }

      msg += `
━━━━━━━━━━━━━━━━━━
🔥 Total Commands: ${commands.size}
📜 Use: ${prefix}help <command>
🌍 View All: ${prefix}help all
━━━━━━━━━━━━━━━━━━
🎭 "${getQuote()}"
${frame} LELOUCH VI BRITANNIA ${frame}
`;

      return msg;
    }

    const sent = await message.reply({
      body: build("👑"),
      attachment: getRandomHelpMedia()
    });

    // ANIMATION
    let i = 0;
    setInterval(() => {
      try {
        const emoji = frames[i % frames.length];
        api.editMessage(build(emoji), sent.messageID);
        i++;
      } catch {}
    }, 2000);
  }
};
