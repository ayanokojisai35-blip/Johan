const fs = require("fs");
const path = require("path");

const frames = ["👑","⚔️","🔥","♟️","🛠","🤖","🎮"];

// MEDIA
const mediaFolder = path.join(__dirname, "help.gife");

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

// FORMAT 2 COLUMN
function formatCommands(cmds) {
  let text = "";
  let line = "┋➥ ";

  cmds.forEach((cmd, i) => {
    line += cmd.padEnd(15, " ");
    if ((i + 1) % 2 === 0) {
      text += line + "\n";
      line = "┋➥ ";
    }
  });

  if (line !== "┋➥ ") text += line + "\n";
  return text;
}

module.exports = {
  config: {
    name: "help",
    aliases: ["menu"],
    version: "4.1",
    author: "Clean UI System",
    role: 0,
    shortDescription: "Clean Help Menu",
    category: "system",
    guide: {
      en: "{pn} / {pn} <command> / {pn} all"
    }
  },

  onStart: async function ({ message, args, role, api }) {

    const prefix = global.GoatBot.config.prefix;
    const commands = global.GoatBot.commands;
    const aliases = global.GoatBot.aliases;

    const categoryMap = {};

    // COLLECT COMMANDS
    for (const [name, cmd] of commands) {
      const cfg = cmd.config;
      if (!cfg) continue;
      if ((cfg.role || 0) > role) continue;

      const cat = (cfg.category || "other").toUpperCase();

      if (!categoryMap[cat]) categoryMap[cat] = [];

      categoryMap[cat].push({
        name,
        aliases: cfg.aliases || [],
        author: cfg.author || "Unknown",
        version: cfg.version || "1.0",
        role: cfg.role || 0,
        cooldown: cfg.countDown || 5,
        desc: cfg.shortDescription || "No description",
        guide: cfg.guide || "No guide"
      });
    }

    const categories = Object.keys(categoryMap).sort();

    // ===== ALL =====
    if (args[0] === "all") {
      let msg = `┍━━━[  𝐀𝐋𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 ]━━━◊\n`;

      for (const cat of categories) {
        msg += `┍━━━[ 📁 ${cat} ]━━━◊\n`;
        msg += formatCommands(categoryMap[cat].map(c => c.name));
        msg += `┕━━━━━━━━━━━━━━━━━◊\n`;
      }

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

      if (!cmd) return message.reply("❌ Command not found");

      const cfg = cmd.config;

      let guide = cfg.guide || "No guide";
      if (typeof guide === "object")
        guide = guide.en || Object.values(guide)[0];

      guide = String(guide).replace(/{pn}/g, prefix + cfg.name);

      const msg =
`┍━━━[  𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐃𝐄𝐓𝐀𝐈𝐋𝐒 ]━━━◊

👑 Name: ${prefix}${cfg.name}
📝 Aliases: ${(cfg.aliases || []).join(", ") || "None"}
👤 Author: ${cfg.author || "Unknown"}
🎭 Version: ${cfg.version || "1.0"}
🔐 Role: ${cfg.role || 0}
⏱ Cooldown: ${cfg.countDown || 5}s
📁 Category: ${cfg.category || "other"}

📜 Description:
${cfg.shortDescription || "No description"}

📌 Usage:
${guide}

┕━━━━━━━━━━━━━━━━━◊`;

      return message.reply({
        body: msg,
        attachment: getRandomHelpMedia()
      });
    }

    // ===== MENU =====
    function build(frame) {
      let msg = `┍━━━[  𝐌𝐄𝐍𝐔 ]━━━◊\n`;

      for (const cat of categories) {
        msg += `┍━━━[ 📁 ${cat} ]━━━◊\n`;
        msg += formatCommands(categoryMap[cat].map(c => c.name));
        msg += `┕━━━━━━━━━━━━━━━━━◊\n`;
      }

      msg += `
┍━━━[  𝐈𝐍𝐅𝐎 ]━━━◊
┋➥ Total: ${commands.size}
┋➥ ${prefix}help <cmd>
┋➥ ${prefix}help all
┕━━━━━━━━━━━━━━━━━◊

${frame} SYSTEM ${frame}
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
