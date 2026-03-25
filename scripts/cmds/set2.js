module.exports = {
 config: {
 name: "set2",
 version: "2.6",
 author: "xnil6x",
 shortDescription: "Admin data management",
 longDescription: "Set user money, exp, or custom variables (admin only), including all users in MongoDB safely",
 category: "Admin",
 guide: {
 en: "{p}set money [amount] [@user]\n{p}set exp [amount] [@user]\n{p}set custom [variable] [value] [@user]\n{p}set all money|exp|custom [value]"
 },
 role: 2
 },

 onStart: async function ({ api, event, args, usersData }) {
 try {
 const ADMIN_UIDS = ["61558762813083", ""];
 if (!ADMIN_UIDS.includes(event.senderID.toString())) {
 return api.sendMessage("⛔ Access Denied: Admin privileges required", event.threadID);
 }

 const action = args[0]?.toLowerCase();

 // ---------- Helper: set all users ----------
 async function setAllUsers(field, value) {
 // Direct MongoDB access if available
 if (usersData.collection) {
 if (field === "money" || field === "exp") {
 await usersData.collection.updateMany({}, { $set: { [field]: parseFloat(value) || 0 } });
 } else {
 await usersData.collection.updateMany({}, { $set: { [field]: value } });
 }
 } else if (typeof usersData.getAll === "function") {
 // Fallback using getAll()
 const allUsers = await usersData.getAll(); // must return array of {id, data}
 if (!allUsers?.length) throw new Error("No users found in database");

 for (const user of allUsers) {
 const userID = Number(user.id); // ⚠️ Ensure numeric ID
 if (isNaN(userID)) continue;

 if (field === "money" || field === "exp") {
 await usersData.set(userID, { [field]: parseFloat(value) || 0 });
 } else {
 await usersData.set(userID, { [field]: value });
 }
 }
 } else {
 throw new Error("Cannot access all users. Add .collection or .getAll() to usersData wrapper.");
 }
 }

 // ---------- SET ALL ----------
 if (action === "all") {
 const field = args[1]?.toLowerCase();
 const value = args[2];
 if (!field || value === undefined) {
 return api.sendMessage("❌ Usage: {p}set all money|exp|custom [value]", event.threadID);
 }

 await setAllUsers(field, value);
 return api.sendMessage(`✅ Set ${field} to ${value} for all users`, event.threadID);
 }

 // ---------- SET INDIVIDUAL ----------
 const amount = parseFloat(args[1]);
 const targetID = Object.keys(event.mentions)[0] || event.senderID;
 const userData = await usersData.get(targetID);

 if (!userData) {
 return api.sendMessage("❌ User not found in database", event.threadID);
 }

 switch (action) {
 case "money":
 if (isNaN(amount)) return api.sendMessage("❌ Invalid amount", event.threadID);
 await usersData.set(targetID, { money: amount });
 return api.sendMessage(`💰 Set money to ${amount} for ${userData.name}`, event.threadID);

 case "exp":
 if (isNaN(amount)) return api.sendMessage("❌ Invalid amount", event.threadID);
 await usersData.set(targetID, { exp: amount });
 return api.sendMessage(`🌟 Set exp to ${amount} for ${userData.name}`, event.threadID);

 case "custom":
 const variable = args[1];
 const valueCustom = args[2];
 if (!variable || valueCustom === undefined) {
 return api.sendMessage("❌ Usage: {p}set custom [variable] [value] [@user]", event.threadID);
 }
 await usersData.set(targetID, { [variable]: valueCustom });
 return api.sendMessage(`🔧 Set ${variable} to ${valueCustom} for ${userData.name}`, event.threadID);

 default:
 return api.sendMessage("❌ Invalid action. Available options: money, exp, custom, all", event.threadID);
 }
 } catch (error) {
 console.error("Admin Set Error:", error);
 return api.sendMessage("⚠️ Command failed: " + error.message, event.threadID);
 }
 }
};