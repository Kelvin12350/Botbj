// --------------------- MEGA Bot.js (Fixed) ---------------------
require('dotenv').config(); // Ensure you have dotenv installed if using .env
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const math = require('mathjs'); // REQUIRED: npm install mathjs

// --------------------- Configuration ---------------------
const token = process.env.BOT_TOKEN; // Ensure this is set in your .env or replace with string
if (!token) {
    console.error("❌ Error: BOT_TOKEN is missing in environment variables.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const memeAPI = "https://meme-api.com/gimme"; 
const adminId = ["8135871264"]; // stored as strings for safety
let premiumUsers = ["8481103398"]; 

// --------------------- State / Database ---------------------
const games = {};
const hunterGames = {};
const rpsGames = {};
const leaderboard = {};

// User States
const stickerUsers = {};
const pendingDownload = {};
const dirlyUsers = {}; 
const pendingDirly = {}; 
const calculatorUsers = {};
const aiUsers = {};
const translatorUsers = {};
const pendingAdminAction = {};

// Constants
const minHunterPlayers = 2; // Reduced for testing
const maxHunterPlayers = 20;
const minPlayers = 2;
const maxPlayers = 6;
const MAX_DAILY = 10; // Daily AI limit

// --------------------- Dictionaries ---------------------
const languages = [
    { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' }, { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' }, { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' }, { code: 'tr', name: 'Turkish' }
];

const quiz = [
    { q: "Red + Blue = ?", a: "Purple" },
    { q: "What is 10 - 3?", a: "7" },
    { q: "Largest planet?", a: "Jupiter" },
    { q: "Who wrote Hamlet?", a: "Shakespeare" }
];

// --------------------- AI Configuration ---------------------
const GEMINI_KEYS = [
    { key: "AIzaSyCBNou1M61CxDz7jg23Np-IwEmuZ2b9410", used: 0 },
    // Add more keys here
];
let currentKeyIndex = 0;
const MAX_KEY_USAGE = 250;

// --------------------- Menu Objects ---------------------
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🎮 Game Menu", callback_data: "menu_game" }],
            [{ text: "🎉 Fun Menu", callback_data: "menu_fun" }],
            [{ text: "🧠 Intelligent Menu", callback_data: "menu_intelligent" }],
            [{ text: "📥 Download Menu", callback_data: "menu_download" }],
            [{ text: "⚙️ Admin Dashboard", callback_data: "menu_admin" }]
        ]
    }
};

const gameMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🎲 Fight Game", callback_data: "fight_game" }],
            [{ text: "🪨 Rock Paper Scissors", callback_data: "rps_game" }],
            [{ text: "🔪 Hunter Game", callback_data: "hunter_game" }],
            [{ text: "📊 Leaderboard", callback_data: "leaderboard" }],
            [{ text: "⬅️ Back", callback_data: "back_main" }]
        ]
    }
};

const funMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🤣 Random Meme", callback_data: "random_meme" }],
            [{ text: "💎 Premium Memes", callback_data: "premium_meme" }],
            [{ text: "⬅️ Back", callback_data: "back_main" }]
        ]
    }
};

const intelligentMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "❓ Quiz", callback_data: "quiz" }],
            [{ text: "🧮 Calculator", callback_data: "calculator" }],
            [{ text: "🤖 Premium AI", callback_data: "premium_ai" }],
            [{ text: "🌐 Translator", callback_data: "translator" }],
            [{ text: "📝 Memory Menu", callback_data: "menu_memory" }],
            [{ text: "⬅️ Back", callback_data: "back_main" }]
        ]
    }
};

const downloadMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📹 Video Download", callback_data: "download_video" }],
            [{ text: "🎵 Music Download", callback_data: "download_music" }],
            [{ text: "🖼️ Picture Download", callback_data: "download_picture" }],
            [{ text: "🖌️ Sticker Maker", callback_data: "sticker_maker" }],
            [{ text: "⬅️ Back", callback_data: "back_main" }]
        ]
    }
};

// --------------------- Helper Functions ---------------------

async function translateText(text, target = 'en') {
    try {
        const res = await axios.post('https://de.libretranslate.com/translate', {
            q: text, source: 'auto', target: target, format: 'text', alternatives: 3, api_key: ""
        }, { headers: { 'Content-Type': 'application/json' } });
        return res.data.translatedText || "❌ Translation failed.";
    } catch (err) {
        console.error("Translator Error:", err.message);
        return "❌ Translation Service Unavailable (API Key required or Rate Limited).";
    }
}

async function callAI(question) {
    let triedKeys = 0;
    while (triedKeys < GEMINI_KEYS.length) {
        const keyObj = GEMINI_KEYS[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;

        if (keyObj.used >= MAX_KEY_USAGE) {
            triedKeys++; continue;
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${keyObj.key}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: question }] }]
            });

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                keyObj.used++;
                return response.data.candidates[0].content.parts[0].text;
            }
        } catch (err) {
            // console.error("Key failed:", keyObj.key);
        }
        triedKeys++;
    }
    return "❌ AI is currently overloaded. Please try again later.";
}

function resetDailyUsage(userId) {
    const today = new Date().toISOString().slice(0, 10);
    if (!aiUsers[userId] || aiUsers[userId].lastReset !== today) {
        aiUsers[userId] = { active: false, count: 0, lastReset: today };
    }
}

// --------------------- MAIN HANDLERS ---------------------

// 1. /Start Command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `Welcome ${msg.from.first_name} to MEGA Bot! Choose an option:`, mainMenu);
});

// 2. Central Callback Query Handler
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id.toString();
    const msgId = query.message.message_id;

    // --- NAVIGATION ---
    if (data === "menu_game") return bot.editMessageText("🎮 Game Menu:", { chat_id: chatId, message_id: msgId, reply_markup: gameMenu.reply_markup });
    if (data === "menu_fun") return bot.editMessageText("🎉 Fun Menu:", { chat_id: chatId, message_id: msgId, reply_markup: funMenu.reply_markup });
    if (data === "menu_intelligent") return bot.editMessageText("🧠 Intelligent Menu:", { chat_id: chatId, message_id: msgId, reply_markup: intelligentMenu.reply_markup });
    if (data === "menu_download") return bot.editMessageText("📥 Download Menu:", { chat_id: chatId, message_id: msgId, reply_markup: downloadMenu.reply_markup });
    if (data === "back_main") return bot.editMessageText("🏠 Welcome to MEGA Bot! Choose an option:", { chat_id: chatId, message_id: msgId, reply_markup: mainMenu.reply_markup });

    // --- ADMIN ---
    if (data === "menu_admin") {
        if (!adminId.includes(userId)) return bot.answerCallbackQuery(query.id, { text: "❌ You are not an admin." });
        const adminMenu = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ Add Premium User", callback_data: "add_premium" }],
                    [{ text: "➖ Remove Premium User", callback_data: "remove_premium" }],
                    [{ text: "👑 View Premium Users", callback_data: "view_premium" }],
                    [{ text: "⬅️ Back", callback_data: "back_main" }]
                ]
            }
        };
        return bot.editMessageText("🛠️ Admin Panel:", { chat_id: chatId, message_id: msgId, reply_markup: adminMenu.reply_markup });
    }
    if (data === "add_premium") { pendingAdminAction[userId] = "add"; return bot.sendMessage(chatId, "✏️ Send ID to Add:"); }
    if (data === "remove_premium") { pendingAdminAction[userId] = "remove"; return bot.sendMessage(chatId, "✏️ Send ID to Remove:"); }
    if (data === "view_premium") return bot.sendMessage(chatId, `👑 Premium Users:\n${premiumUsers.join("\n")}`);

    // --- FUN / MEMES ---
    if (data === "random_meme") {
        const res = await axios.get(memeAPI).catch(() => null);
        if (res && res.data) bot.sendPhoto(chatId, res.data.url, { caption: res.data.title });
        else bot.sendMessage(chatId, "❌ Failed to fetch meme.");
        return;
    }
    if (data === "premium_meme") {
        if (!premiumUsers.includes(userId)) return bot.sendMessage(chatId, "💎 Premium Only!");
        const res = await axios.get(memeAPI + "/3").catch(() => null);
        if (res && res.data && res.data.memes) {
            res.data.memes.forEach(m => bot.sendPhoto(chatId, m.url, { caption: `💎 ${m.title}` }));
        }
        return;
    }

    // --- DOWNLOADS ---
    if (data === "sticker_maker") {
        if (!premiumUsers.includes(userId)) return bot.sendMessage(chatId, "💎 Premium Only!");
        stickerUsers[userId] = true;
        return bot.sendMessage(chatId, "br️ Send me a picture to convert to a sticker URL.");
    }
    if (["download_video", "download_music", "download_picture"].includes(data)) {
        pendingDownload[userId] = data.split("_")[1];
        return bot.sendMessage(chatId, `📥 Send me the Link for the ${pendingDownload[userId]} to download.`);
    }

    // --- INTELLIGENT ---
    if (data === "calculator") {
        calculatorUsers[userId] = true;
        return bot.sendMessage(chatId, "🧮 Send equation (e.g., 2 + 2 * 5):");
    }
    if (data === "translator") {
        const btns = languages.map(l => [{ text: l.name, callback_data: `trans_${l.code}` }]);
        btns.push([{ text: "⬅️ Back", callback_data: "menu_intelligent" }]);
        return bot.editMessageText("Select Language:", { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: btns } });
    }
    if (data.startsWith("trans_")) {
        translatorUsers[userId] = data.split("_")[1];
        return bot.sendMessage(chatId, "✏️ Send text to translate:");
    }
    if (data === "menu_memory") {
        return bot.editMessageText("📝 Memory:", { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: [[{ text: "Save", callback_data: "save_dirly" }, { text: "View", callback_data: "view_dirly" }, { text: "Back", callback_data: "menu_intelligent" }]] } });
    }
    if (data === "save_dirly") { pendingDirly[userId] = "saving"; return bot.sendMessage(chatId, "✏️ Send message to save:"); }
    if (data === "view_dirly") {
        const msgs = dirlyUsers[userId] || [];
        return bot.sendMessage(chatId, msgs.length ? msgs.map((m, i) => `${i + 1}. ${m}`).join("\n") : "📭 Empty.");
    }
    if (data === "quiz") {
        const q = quiz[Math.floor(Math.random() * quiz.length)];
        return bot.sendMessage(chatId, `❓ ${q.q}`, {
            reply_markup: { inline_keyboard: [[{ text: q.a, callback_data: "quiz_c" }], [{ text: "Wrong", callback_data: "quiz_w" }]] }
        });
    }
    if (data === "quiz_c") return bot.answerCallbackQuery(query.id, { text: "✅ Correct!" });
    if (data === "quiz_w") return bot.answerCallbackQuery(query.id, { text: "❌ Wrong!" });

    // --- PREMIUM AI ---
    if (data === "premium_ai") {
        if (!premiumUsers.includes(userId)) return bot.sendMessage(chatId, "💎 Premium Only!");
        resetDailyUsage(userId);
        return bot.sendMessage(chatId, "🤖 AI Control:", {
            reply_markup: { inline_keyboard: [[{ text: "▶️ Start", callback_data: "start_ai" }], [{ text: "⏹ Stop", callback_data: "stop_ai" }]] }
        });
    }
    if (data === "start_ai") { resetDailyUsage(userId); aiUsers[userId].active = true; return bot.sendMessage(chatId, "✅ AI Active."); }
    if (data === "stop_ai") { if(aiUsers[userId]) aiUsers[userId].active = false; return bot.sendMessage(chatId, "⏹ AI Stopped."); }

    // --- GAMES (HUNTER) ---
    if (data === "hunter_game") {
        const gid = Math.floor(Math.random() * 10000).toString();
        hunterGames[gid] = { players: [], status: 'waiting', id: gid };
        return bot.sendMessage(chatId, `🔪 Hunter Game Created! ID: ${gid}`, {
            reply_markup: { inline_keyboard: [[{ text: "Join", callback_data: `join_h_${gid}` }], [{ text: "Start", callback_data: `start_h_${gid}` }]] }
        });
    }
    if (data.startsWith("join_h_")) {
        const gid = data.split("_")[2];
        const g = hunterGames[gid];
        if (!g) return bot.answerCallbackQuery(query.id, "❌ Invalid Game");
        if (g.players.find(p => p.id === userId)) return bot.answerCallbackQuery(query.id, "❌ Already joined");
        g.players.push({ id: userId, name: query.from.first_name, alive: true });
        return bot.answerCallbackQuery(query.id, { text: `✅ Joined (${g.players.length})` });
    }
    if (data.startsWith("start_h_")) {
        const gid = data.split("_")[2];
        const g = hunterGames[gid];
        if (!g || g.players.length < minHunterPlayers) return bot.answerCallbackQuery(query.id, "❌ Not enough players");
        g.status = 'active';
        g.hunterId = g.players[Math.floor(Math.random() * g.players.length)].id;
        g.players.forEach(p => {
            if (p.id === g.hunterId) bot.sendMessage(p.id, "⚔️ YOU ARE THE HUNTER! /kill <name>");
            else bot.sendMessage(p.id, "👀 Game Started! Run from the Hunter!");
        });
        return bot.answerCallbackQuery(query.id, "✅ Started");
    }

    // --- GAMES (RPS & FIGHT) ---
    if (data === "fight_game") return bot.sendMessage(chatId, "⚔️ To create a fight, use command: /fight");
    if (data === "rps_game") return bot.sendMessage(chatId, "🪨 To create RPS, use command: /rps");
    if (data.startsWith("attack_") || data.startsWith("heal_") || data.startsWith("special_")) return handleFightAction(query);
    if (data.startsWith("rpsmove_")) return handleRPSMove(query);
});

// --------------------- MESSAGE HANDLER (Router) ---------------------
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return; // Ignore non-text unless sticker handling
    const userId = msg.from.id.toString();

    // 1. Admin Actions
    if (pendingAdminAction[userId]) {
        const targetId = text.trim();
        if (pendingAdminAction[userId] === "add") {
            if (!premiumUsers.includes(targetId)) premiumUsers.push(targetId);
            bot.sendMessage(chatId, `✅ User ${targetId} added to Premium.`);
        } else {
            premiumUsers = premiumUsers.filter(id => id !== targetId);
            bot.sendMessage(chatId, `✅ User ${targetId} removed from Premium.`);
        }
        delete pendingAdminAction[userId];
        return;
    }

    // 2. Calculator
    if (calculatorUsers[userId]) {
        try {
            const result = math.evaluate(text);
            bot.sendMessage(chatId, `🧮 Result: ${result}`);
        } catch (e) {
            bot.sendMessage(chatId, "❌ Invalid Calculation.");
        }
        delete calculatorUsers[userId];
        return;
    }

    // 3. Translator
    if (translatorUsers[userId]) {
        const lang = translatorUsers[userId];
        const translated = await translateText(text, lang);
        bot.sendMessage(chatId, `🌐 [${lang}]: ${translated}`);
        delete translatorUsers[userId];
        return;
    }

    // 4. Dirly (Memory)
    if (pendingDirly[userId]) {
        if (!dirlyUsers[userId]) dirlyUsers[userId] = [];
        dirlyUsers[userId].push(text);
        bot.sendMessage(chatId, "✅ Saved to memory.");
        delete pendingDirly[userId];
        return;
    }

    // 5. Downloads (Simulation)
    if (pendingDownload[userId]) {
        bot.sendMessage(chatId, `🔍 Searching for ${pendingDownload[userId]} from link: ${text}...`);
        setTimeout(() => {
            bot.sendMessage(chatId, "❌ Download failed: Server restriction on file handling. (This is a demo)");
        }, 1500);
        delete pendingDownload[userId];
        return;
    }

    // 6. AI Chat
    if (aiUsers[userId]?.active) {
        resetDailyUsage(userId);
        if (aiUsers[userId].count >= MAX_DAILY) {
            aiUsers[userId].active = false;
            return bot.sendMessage(chatId, "🚫 Daily AI Limit Reached.");
        }
        bot.sendChatAction(chatId, "typing");
        const reply = await callAI(text);
        aiUsers[userId].count++;
        return bot.sendMessage(chatId, `🤖 ${reply}`, { parse_mode: 'Markdown' });
    }
});

// --------------------- STICKER HANDLING ---------------------
bot.on('photo', async (msg) => {
    const userId = msg.from.id.toString();
    if (stickerUsers[userId]) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        try {
            const file = await bot.getFile(fileId);
            const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
            bot.sendMessage(msg.chat.id, `🖌️ Sticker Source URL:\n${url}`);
        } catch (e) {
            bot.sendMessage(msg.chat.id, "❌ Error generating link.");
        }
        delete stickerUsers[userId];
    }
});

// --------------------- GAME COMMANDS ---------------------

// Fight Game Commands
bot.onText(/\/fight/, (msg) => {
    const gid = Math.floor(Math.random() * 1000).toString();
    games[gid] = { players: [{ id: msg.from.id, name: msg.from.first_name, hp: 100, cooldown: 0 }], turn: 0, status: 'waiting' };
    bot.sendMessage(msg.chat.id, `⚔️ Fight Created! ID: ${gid}\n/join ${gid}`);
});

bot.onText(/\/join (.+)/, (msg, match) => {
    const gid = match[1];
    const g = games[gid];
    if (!g || g.status !== 'waiting') return bot.sendMessage(msg.chat.id, "❌ Invalid game.");
    if (g.players.find(p => p.id === msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ Already joined.");
    g.players.push({ id: msg.from.id, name: msg.from.first_name, hp: 100, cooldown: 0 });
    bot.sendMessage(msg.chat.id, `✅ Joined! (${g.players.length} players)`);
    
    if (g.players.length >= minPlayers) {
        g.status = 'active';
        sendFightTurn(msg.chat.id, gid);
    }
});

function sendFightTurn(chatId, gid) {
    const g = games[gid];
    if (!g) return;
    // Skip dead players
    while(g.players[g.turn].hp <= 0) g.turn = (g.turn + 1) % g.players.length;
    
    const p = g.players[g.turn];
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "⚔️ Attack", callback_data: `attack_${gid}` }, { text: "💥 Special", callback_data: `special_${gid}` }],
                [{ text: "❤️ Heal", callback_data: `heal_${gid}` }]
            ]
        }
    };
    bot.sendMessage(chatId, `🎮 Turn: ${p.name}\n${g.players.map(x => `${x.name}: ${x.hp}HP`).join('\n')}`, opts);
}

function handleFightAction(query) {
    const [action, gid] = query.data.split('_');
    const g = games[gid];
    if (!g || g.status !== 'active') return;
    
    const p = g.players[g.turn];
    if (query.from.id !== p.id) return bot.answerCallbackQuery(query.id, "❌ Not your turn!");

    let txt = "";
    if (action === 'attack') {
        const targets = g.players.filter(x => x.id !== p.id && x.hp > 0);
        if(!targets.length) return; 
        const t = targets[Math.floor(Math.random() * targets.length)];
        const dmg = Math.floor(Math.random() * 15) + 5;
        t.hp -= dmg;
        txt = `⚔️ ${p.name} hit ${t.name} for ${dmg}!`;
    } else if (action === 'heal') {
        const h = 15;
        p.hp = Math.min(p.hp + h, 100);
        txt = `❤️ ${p.name} healed ${h} HP!`;
    }

    // Check Win
    const alive = g.players.filter(x => x.hp > 0);
    if (alive.length === 1) {
        g.status = 'ended';
        bot.sendMessage(query.message.chat.id, `${txt}\n\n🏆 WINNER: ${alive[0].name}!`);
    } else {
        g.turn = (g.turn + 1) % g.players.length;
        bot.editMessageText(txt, { chat_id: query.message.chat.id, message_id: query.message.message_id });
        sendFightTurn(query.message.chat.id, gid);
    }
}

// RPS Commands
bot.onText(/\/rps/, (msg) => {
    const gid = Math.floor(Math.random() * 1000).toString();
    rpsGames[gid] = { players: [{ id: msg.from.id, name: msg.from.first_name }], moves: {}, status: 'waiting' };
    bot.sendMessage(msg.chat.id, `🪨 RPS Created! ID: ${gid}\n/joinrps ${gid}`);
});

bot.onText(/\/joinrps (.+)/, (msg, match) => {
    const gid = match[1];
    const g = rpsGames[gid];
    if (!g || g.players.length >= 2) return bot.sendMessage(msg.chat.id, "❌ Full or Invalid.");
    g.players.push({ id: msg.from.id, name: msg.from.first_name });
    g.status = 'active';
    g.players.forEach(p => {
        bot.sendMessage(p.id, "Choose move:", {
            reply_markup: { inline_keyboard: [[{text:"🪨", callback_data:`rpsmove_${gid}_rock`}, {text:"📄", callback_data:`rpsmove_${gid}_paper`}, {text:"✂️", callback_data:`rpsmove_${gid}_scissors`}]] }
        });
    });
    bot.sendMessage(msg.chat.id, "🎮 RPS Started! Check DMs.");
});

function handleRPSMove(query) {
    const [_, gid, move] = query.data.split('_');
    const g = rpsGames[gid];
    if (!g || g.status !== 'active') return;
    
    g.moves[query.from.id] = move;
    bot.answerCallbackQuery(query.id, "✅ Selected!");
    
    if (Object.keys(g.moves).length === 2) {
        const [p1, p2] = g.players;
        const m1 = g.moves[p1.id];
        const m2 = g.moves[p2.id];
        let res = "Draw";
        if ((m1=="rock"&&m2=="scissors") || (m1=="paper"&&m2=="rock") || (m1=="scissors"&&m2=="paper")) res = p1.name;
        else if (m1 !== m2) res = p2.name;
        
        // Notify both (assuming they share a group or DM)
        [p1.id, p2.id].forEach(id => bot.sendMessage(id, `Result:\n${p1.name}: ${m1}\n${p2.name}: ${m2}\n\n🏆 Winner: ${res}`));
        g.status = 'ended';
    }
}

// Hunter Commands
bot.onText(/\/kill (.+)/, (msg, match) => {
    const name = match[1].toLowerCase();
    const game = Object.values(hunterGames).find(g => g.status === 'active' && g.hunterId === msg.from.id);
    if (!game) return bot.sendMessage(msg.chat.id, "❌ You are not the Hunter or no active game.");

    const target = game.players.find(p => p.name.toLowerCase().includes(name) && p.alive);
    if (!target) return bot.sendMessage(msg.chat.id, "❌ Player not found/already dead.");
    
    target.alive = false;
    bot.sendMessage(msg.chat.id, `💀 Killed ${target.name}!`);
    bot.sendMessage(target.id, "💀 You are DEAD.");
    
    // Rotate Hunter
    const alive = game.players.filter(p => p.alive && p.id !== game.hunterId);
    if(alive.length > 0) {
        game.hunterId = alive[Math.floor(Math.random()*alive.length)].id;
        bot.sendMessage(game.hunterId, "⚔️ You are the new HUNTER!");
    } else {
        bot.sendMessage(msg.chat.id, "🏆 Game Over! Hunter wins.");
        game.status = 'ended';
    }
});

console.log("MEGA Bot is running! ✅");
