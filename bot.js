// --------------------- MEGA Bot.js ---------------------
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Render environment variable
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --------------------- Meme Setup ---------------------
const memeAPI = "https://meme-api.com/gimme"; // Public random meme API

// --------------------- Data ---------------------
const games = {};
const stickerUsers = {};
const pendingDownload = {};
const hunterGames = {};
const minHunterPlayers = 4;
const maxHunterPlayers = 20;
const dirlyUsers = {}; 
const pendingDirly = {}; 
const calculatorUsers = {};
const aiUsers = {};
const MAX_DAILY = 1;
const pendingAdminAction = {};
const translatorUsers = {}; 
const rpsGames = {};
const minPlayers = 2;
const maxPlayers = 6;
const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'he', name: 'Hebrew' }
];
const quiz = [
    { q: "Red + Blue = ?", a: "Purple" },
    { q: "What is 10 - 3?", a: "7" },
    { q: "Largest planet?", a: "Jupiter" },
    { q: "Who wrote Hamlet?", a: "Shakespeare" }
];
// ---------------- Config ----------------
const memesUrl = "https://api.imgflip.com/get_memes";
const adminId = [8135871264]; // Replace with your Telegram ID
let premiumUsers = ["8481103398"]; // <-- String instead of number // Use let (not const) so we can update it
const leaderboard = {};

// --------------------- Menus ---------------------
function resetDailyUsage(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (!aiUsers[userId] || aiUsers[userId].lastReset !== today) {
    const wasActive = aiUsers[userId]?.active || false;
    aiUsers[userId] = { active: wasActive, count: 0, lastReset: today };
  }
}
async function translateText(text, target = 'en') {
    try {
        const res = await axios.post('https://de.libretranslate.com/translate', {
            q: text,
            source: 'auto',
            target: target,
            format: 'text',
            alternatives: 3,
            api_key: ""
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        return res.data.translatedText || "❌ Translation failed.";
    } catch (err) {
        console.error("Translator Error:", err.message);
        return "❌ Translation failed.";
    }
}
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🎮 Game Menu", callback_data: "menu_game" }],
      [{ text: "🎉 Fun Menu", callback_data: "menu_fun" }],
      [{ text: "🧠 Intelligent Menu", callback_data: "menu_intelligent" }],
      [{ text: "📥 Download Menu", callback_data: "menu_download" }], // <-- NEW
      [{ text: "⚙️ Admin Dashboard", callback_data: "menu_admin" }]
    ]
  }
};

const gameMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🎲 Fight Game", callback_data: "fight_game" }],
      [{ text: "🪨 Rock Paper Scissors", callback_data: "rps_game" }],
      [{ text: "🔪 Hunter Game", callback_data: "hunter_game" }], // <-- NEW
      [{ text: "📊 Leaderboard", callback_data: "leaderboard" }],
      [{ text: "⬅️ Back", callback_data: "back_main" }]
    ]
  }
};

// --------------------- Fun Menu ---------------------
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
      [{ text: "📝 Memory Menu", callback_data: "menu_memory" }], // <-- new Memory menu
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
      [{ text: "🖌️ Sticker Maker", callback_data: "sticker_maker" }], // Premium Sticker Maker
      [{ text: "⬅️ Back", callback_data: "back_main" }]
    ]
  }
};
// -------------------- Gemini AI Keys --------------------
const GEMINI_KEYS = [
  { key: "AIzaSyCBNou1M61CxDz7jg23Np-IwEmuZ2b9410", used: 0 },
  { key: "YOUR_KEY_2", used: 0 },
  { key: "YOUR_KEY_3", used: 0 },
  // ... up to 20 keys
];

let currentKeyIndex = 0;
const MAX_KEY_USAGE = 250;
let lastResetMonth = new Date().getMonth(); // track monthly reset

// -------------------- Reset keys monthly --------------------
function resetKeysIfNewMonth() {
  const currentMonth = new Date().getMonth();
  if (currentMonth !== lastResetMonth) {
    GEMINI_KEYS.forEach(k => k.used = 0);
    lastResetMonth = currentMonth;
  }
}

// -------------------- Optimized AI Call --------------------
async function callAI(question) {
  resetKeysIfNewMonth();

  let triedKeys = 0;

  while (triedKeys < GEMINI_KEYS.length) {
    const keyObj = GEMINI_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;

    // Skip exhausted keys immediately
    if (keyObj.used >= MAX_KEY_USAGE) {
      triedKeys++;
      continue;
    }

    const GEMINI_API_KEY = keyObj.key;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: question }] }]
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        keyObj.used++; // increment usage
        return data.candidates[0].content.parts[0].text;
      }

      // If API returns error, skip key immediately
      triedKeys++;
      keyObj.used = MAX_KEY_USAGE; // mark as exhausted
      continue;

    } catch (err) {
      // On network/API error, skip key
      triedKeys++;
      keyObj.used = MAX_KEY_USAGE; // mark as exhausted
      continue;
    }
  }

  return "❌ All keys exhausted or failed. Please try again later.";
}
// --------------------- Start ---------------------
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Welcome ${msg.from.first_name} to MEGA Bot! Choose an option:`, mainMenu);
});

// --------------------- Callback Queries ---------------------
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // ---------------- Menu Navigation ----------------
  if (data === "menu_game") return bot.editMessageText("🎮 Game Menu:", { chat_id: chatId, message_id: query.message.message_id, reply_markup: gameMenu.reply_markup });
if (data === "menu_fun") return bot.editMessageText("🎉 Fun Menu:", { chat_id: chatId, message_id: query.message.message_id, reply_markup: funMenu.reply_markup });
if (data === "menu_intelligent") return bot.editMessageText("🧠 Intelligent Menu:", { chat_id: chatId, message_id: query.message.message_id, reply_markup: intelligentMenu.reply_markup });
if (data === "menu_download") return bot.editMessageText("📥 Download Menu:", { chat_id: chatId, message_id: query.message.message_id, reply_markup: downloadMenu.reply_markup });
if (data === "back_main") return bot.editMessageText("🏠 Welcome to MEGA Bot! Choose an option:", { chat_id: chatId, message_id: query.message.message_id, reply_markup: mainMenu.reply_markup });
  // ---------------- Admin Dashboard ----------------
if (data === "menu_admin") {
    if (!adminId.includes(query.from.id))
        return bot.answerCallbackQuery(query.id, { text: "❌ You are not an admin." });

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

    return bot.editMessageText("🛠️ Admin / Premium Panel:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: adminMenu.reply_markup
    });
}

// Admin actions
if (data === "add_premium") {
    pendingAdminAction[query.from.id] = "add";
    return bot.sendMessage(chatId, "✏️ Send the Telegram user ID to add to Premium:");
}

if (data === "remove_premium") {
    pendingAdminAction[query.from.id] = "remove";
    return bot.sendMessage(chatId, "✏️ Send the Telegram user ID to remove from Premium:");
}

if (data === "view_premium") {
    return bot.sendMessage(chatId, `👑 Premium Users:\n${premiumUsers.join("\n") || "No premium users yet."}`);
}
// ---------------- Translator Menu ----------------
if (data === "translator") {
    const langButtons = languages.map(lang => [{ text: lang.name, callback_data: `translator_${lang.code}` }]);
    langButtons.push([{ text: "⬅️ Back", callback_data: "menu_intelligent" }]);
    return bot.editMessageText("🌐 Choose the language to translate into:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: langButtons }
    });
}

// ---------------- Handle Language Selection ----------------
if (data.startsWith("translator_")) {
    const langCode = data.split("_")[1];
    const userId = query.from.id.toString();
    translatorUsers[userId] = langCode; // store target language
    return bot.sendMessage(chatId, "✏️ Send me the message you want to translate:");
}
 // ---------------- Memory Menu ----------------
if (data === "menu_memory") {
    const memoryMenu = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📝 Save Dirly", callback_data: "save_dirly" }],
                [{ text: "📜 View All Dirly", callback_data: "view_dirly" }],
                [{ text: "⬅️ Back", callback_data: "menu_intelligent" }]
            ]
        }
    };
    return bot.editMessageText("🧠 Memory Menu:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: memoryMenu.reply_markup
    });
}

// ---------------- Save Dirly ----------------
if (data === "save_dirly") {
    const userId = query.from.id.toString();
    pendingDirly[userId] = "saving";
    return bot.sendMessage(chatId, "✏️ Send me the message you want to save in Dirly:");
}

// ---------------- View All Dirly ----------------
if (data === "view_dirly") {
    const userId = query.from.id.toString(); // ✅ convert to string
    const messages = dirlyUsers[userId] || [];
    if (messages.length === 0) return bot.sendMessage(chatId, "📭 You have no saved Dirly messages.");
    let text = "📜 Your Dirly Messages:\n\n";
    messages.forEach((msg, i) => { text += `${i + 1}. ${msg}\n`; });
    return bot.sendMessage(chatId, text);
}

// ---------------- Hunter Game Callbacks ----------------
bot.on('callback_query', (query) => {
    const data = query.data;
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();

    // Create Hunter Game
    if (data === "hunter_game") {
        const gameId = Math.floor(Math.random() * 1000000).toString();
        hunterGames[gameId] = { players: [], hunterId: null, status: 'waiting' };

        const hunterMenu = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ Join Hunter Game", callback_data: `join_hunter_${gameId}` }],
                    [{ text: "▶️ Start Hunter Game", callback_data: `start_hunter_${gameId}` }],
                    [{ text: "⬅️ Back", callback_data: "menu_game" }]
                ]
            }
        };

        return bot.sendMessage(chatId, `🔪 Hunter Game Created!\nGame ID: ${gameId}\nMinimum ${minHunterPlayers} players required.`, hunterMenu);
    }

    // Join Hunter Game
    if (data.startsWith("join_hunter_")) {
        const gameId = data.split("_")[2];
        const game = hunterGames[gameId];

        if (!game) return bot.answerCallbackQuery(query.id, { text: "❌ Game not found!" });
        if (game.players.find(p => p.id === userId)) return bot.answerCallbackQuery(query.id, { text: "❌ You already joined!" });
        if (game.players.length >= maxHunterPlayers) return bot.answerCallbackQuery(query.id, { text: "❌ Game is full!" });

        game.players.push({ id: userId, name: query.from.first_name, alive: true });
        bot.answerCallbackQuery(query.id, { text: `✅ You joined the game! (${game.players.length}/${maxHunterPlayers})` });
    }

    // Start Hunter Game
    if (data.startsWith("start_hunter_")) {
        const gameId = data.split("_")[2];
        const game = hunterGames[gameId];

        if (!game) return bot.answerCallbackQuery(query.id, { text: "❌ Game not found!" });
        if (game.players.length < minHunterPlayers) return bot.answerCallbackQuery(query.id, { text: `❌ Minimum ${minHunterPlayers} players required.` });

        game.status = 'active';
        game.hunterId = game.players[Math.floor(Math.random() * game.players.length)].id;

        game.players.forEach(p => {
            if (p.id === game.hunterId) {
                bot.sendMessage(p.id, `⚔️ You are the HUNTER! Use /kill <playername> or /revive <playername>`);
            } else {
                bot.sendMessage(p.id, `The game has started! The hunter is: ${game.players.find(x => x.id === game.hunterId).name}`);
            }
        });

        bot.answerCallbackQuery(query.id, { text: `🎮 Hunter game started with ${game.players.length} players!` });
    }
}); 
// ---------------- Download Handler ----------------
// ---------- Open Download Menu ----------
if (data === "menu_download") {
  return bot.editMessageText("📥 Download Menu:", {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: downloadMenu.reply_markup
  });
}

// ---------- Back to Main Menu ----------
if (data === "back_main") {
  return bot.editMessageText("🏠 Welcome to MEGA Bot! Choose an option:", {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: mainMenu.reply_markup // make sure mainMenu is defined
  });
}

// ---------- Download Options ----------
if (data === "download_video") {
  return bot.sendMessage(chatId, "📹 Send me a video link to download.");
}

if (data === "download_music") {
  return bot.sendMessage(chatId, "🎵 Send me a music link to download.");
}

if (data === "download_picture") {
  return bot.sendMessage(chatId, "🖼️ Send me a picture link to download.");
}
// --------------------- Fun Menu (Random & Premium Memes) ---------------------
if (data === "random_meme") {
  try {
    const res = await axios.get("https://meme-api.com/gimme");
    const meme = res.data;

    await bot.sendPhoto(chatId, meme.url, {
      caption: `🤣 ${meme.title}\n\nFrom r/${meme.subreddit}`
    });
  } catch (err) {
    console.error("Meme Error:", err.message);
    bot.sendMessage(chatId, "❌ Failed to load meme. Try again later!");
  }
}

if (data === "premium_meme") {
  const userId = query.from.id.toString();

  // 🔒 Premium access check
  if (!premiumUsers.includes(userId)) {
    return bot.sendMessage(chatId, "🚫 This feature is for *Premium Users* only!", {
      parse_mode: "Markdown"
    });
  }

  try {
    const res = await axios.get("https://meme-api.com/gimme/3");
    const memes = res.data.memes || [];

    if (memes.length === 0) {
      return bot.sendMessage(chatId, "❌ No premium memes found, try again later!");
    }

    for (const meme of memes) {
      await bot.sendPhoto(chatId, meme.url, {
        caption: `💎 ${meme.title}\n\nFrom r/${meme.subreddit}`
      });
    }
  } catch (err) {
    console.error("Premium Meme Error:", err.message);
    bot.sendMessage(chatId, "❌ Failed to load premium memes. Try again later!");
  }
}
  // ---------------- Intelligent Menu ----------------
  if (data === "quiz") {
    const question = quiz[Math.floor(Math.random() * quiz.length)];
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: question.a, callback_data: `quiz_correct_${question.a}` }],
          [{ text: "Wrong 1", callback_data: `quiz_wrong_1` }],
          [{ text: "Wrong 2", callback_data: `quiz_wrong_2` }],
          [{ text: "⬅️ Back", callback_data: "menu_intelligent" }]
        ]
      }
    };
    return bot.sendMessage(chatId, `❓ ${question.q}`, options);
  }

  if (data.startsWith("quiz_correct")) return bot.answerCallbackQuery(query.id, { text: "✅ Correct!" });
  if (data.startsWith("quiz_wrong")) return bot.answerCallbackQuery(query.id, { text: "❌ Wrong!" });

  // ---------------- Game Menu ----------------
  // ---------------- Fight Game ----------------
if (data === "fight_game") {
  const gameId = Math.floor(Math.random() * 1000000).toString();
  games[gameId] = {
    players: [{ id: query.from.id, name: query.from.first_name, hp: 100, cooldown: 0, premium: premiumUsers.includes(query.from.id) }],
    turnIndex: 0,
    status: 'waiting'
  };
  return bot.sendMessage(chatId, `🗡️ New fight created! Game ID: ${gameId}\nPlayers can join: /join ${gameId}`);
}

// ---------------- Rock-Paper-Scissors ----------------
if (data === "rps_game") {
  const gameId = Math.floor(Math.random() * 1000000).toString();
  rpsGames[gameId] = {
    players: [{ id: query.from.id, name: query.from.first_name }],
    moves: {},
    status: 'waiting'
  };
  return bot.sendMessage(chatId, `🪨 Rock-Paper-Scissors game created!\nGame ID: ${gameId}\nAnother player can join with:\n/joinrps ${gameId}`);
}

// ---------------- Leaderboard ----------------
if (data === "leaderboard") {
  const sorted = Object.values(leaderboard).sort((a,b) => b.wins - a.wins);
  if (sorted.length === 0) return bot.sendMessage(chatId, "🏆 No fights yet!");
  let text = "🏆 MEGA Bot Fight Leaderboard 🏆\n\n";
  sorted.slice(0,10).forEach((p,i) => { text += `${i+1}. ${p.name} - Wins: ${p.wins}, Fights: ${p.fights}\n`; });
  return bot.sendMessage(chatId, text);
}
// ---------------- Intelligent Menu / Calculator ----------------
if (data === "calculator") {
    calculatorUsers[query.from.id] = true;
    return bot.sendMessage(query.from.id, "🧮 Send me the calculation you want me to solve. Example: 2 + 2 × 5, (5+5)/2, √16, 50%");
}
if (data === "premium_ai") {
  const userId = query.from.id.toString();
  if (!premiumUsers.includes(userId)) {
    return bot.sendMessage(chatId, "🚫 Premium only feature!");
  }

  // Initially AI OFF
  aiUsers[userId] = { active: false, count: 0, lastReset: new Date().toISOString().slice(0,10) };

  // Send start/stop buttons
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶️ Start AI", callback_data: "start_ai" }],
        [{ text: "⏹ Stop AI", callback_data: "stop_ai" }]
      ]
    },
    parse_mode: "Markdown"
  };

  return bot.sendMessage(chatId, "🤖 MEGA Premium AI Assistant!\nUse buttons to start/stop AI responses.", options);
}
 // Track AI users
function resetDailyUsage(userId) {
  const today = new Date().toISOString().slice(0, 10);
  if (!aiUsers[userId] || aiUsers[userId].lastReset !== today) {
    aiUsers[userId] = { active: false, count: 0, lastReset: today };
  }
}

// Start AI
if (data === "start_ai") {
  const userId = query.from.id.toString();

  // Initialize user if not exist
  if (!aiUsers[userId]) {
    aiUsers[userId] = {
      active: false,
      count: 0,
      lastReset: new Date().toISOString().slice(0, 10) // keep track of daily reset
    };
  }

  // Activate AI without resetting count
  aiUsers[userId].active = true;

  return bot.sendMessage(
    chatId,
    `✅ AI Started! You have ${MAX_DAILY - (aiUsers[userId].count || 0)} questions left today.`
  );
}

if (data === "stop_ai") {
  const userId = query.from.id.toString();

  // Initialize user if not exist
  if (!aiUsers[userId]) {
    aiUsers[userId] = {
      active: false,
      count: 0,
      lastReset: new Date().toISOString().slice(0, 10)
    };
  }

  // Deactivate AI
  aiUsers[userId].active = false;

  return bot.sendMessage(chatId, "⏹ AI Stopped. You can restart anytime.");
}
// Handling user messages when AI is active
if (aiUsers[userId]?.active) {
  resetDailyUsage(userId);

  // Check limit first
  if (aiUsers[userId].count >= MAX_DAILY) {
    return bot.sendMessage(chatId, "🚫 You’ve reached your daily limit of AI questions. Come back tomorrow!");
  }

  // Increment after checking
  aiUsers[userId].count++;

  // Call AI
  const answer = await callAI(text);
  return bot.sendMessage(chatId, `🤖 MEGA AI says:\n${answer}`, { parse_mode: "Markdown" });
}
// Inside your callback_query listener
if (data === "sticker_maker") {
    const userId = query.from.id.toString();
    const chatId = query.message?.chat?.id;
    if (!chatId) return; // safety check

    // Premium check
    if (!premiumUsers.includes(userId)) {
        return bot.sendMessage(chatId, "🚫 This feature is for *Premium Users* only!", {
            parse_mode: "Markdown"
        });
    }

    // Mark user ready to send sticker
    stickerUsers[userId] = true;
    return bot.sendMessage(chatId, "🖌️ Send me a picture and I will convert it into a Telegram sticker!");
}   
// ---------------- Fight Game Actions ----------------
if (["attack","special","heal"].some(a => data.startsWith(a))) handleFightAction(query);
});

// ---------------- Join Fight Command ----------------
bot.onText(/\/join (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const gameId = match[1];
  const game = games[gameId];
  if (!game) return bot.sendMessage(chatId, "❌ Game not found!");
  if (game.players.find(p => p.id === msg.from.id)) return bot.sendMessage(chatId, "❌ Already joined!");
  if (game.players.length >= maxPlayers) return bot.sendMessage(chatId, "❌ Game is full!");

  game.players.push({ id: msg.from.id, name: msg.from.first_name, hp: 100, cooldown: 0, premium: premiumUsers.includes(msg.from.id) });
  bot.sendMessage(chatId, `✅ ${msg.from.first_name} joined! (${game.players.length}/${maxPlayers})`);

  if (game.players.length >= minPlayers && game.status === 'waiting') {
    game.status = 'active';
    sendTurnMessage(chatId, gameId);
  }
});
// ---------------- Join RPS Game ----------------
bot.onText(/\/joinrps (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const gameId = match[1];
  const game = rpsGames[gameId];

  if (!game) return bot.sendMessage(chatId, "❌ RPS Game not found!");
  if (game.players.length >= 2) return bot.sendMessage(chatId, "❌ Game is already full!");
  if (game.players.find(p => p.id === msg.from.id)) return bot.sendMessage(chatId, "❌ You already joined!");

  game.players.push({ id: msg.from.id, name: msg.from.first_name });
  bot.sendMessage(chatId, `✅ ${msg.from.first_name} joined Rock-Paper-Scissors!\nPlayers ready: ${game.players.map(p => p.name).join(" vs ")}`);

  if (game.players.length === 2) {
    game.status = 'active';
    startRPSRound(chatId, gameId);
  }
});

// ---------------- Hunter Commands ----------------
bot.onText(/\/kill (.+)/, (msg, match) => {
  const userId = msg.from.id;
  const playerName = match[1];
  const game = Object.values(hunterGames).find(g => g.status === 'active' && g.players.find(p => p.id === userId));

  if (!game) return bot.sendMessage(msg.chat.id, "❌ You are not in an active Hunter game.");
  if (userId !== game.hunterId) return bot.sendMessage(msg.chat.id, "❌ Only the hunter can kill.");

  const target = game.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (!target) return bot.sendMessage(msg.chat.id, "❌ Player not found.");
  if (!target.alive) return bot.sendMessage(msg.chat.id, "❌ Player is already dead.");

  target.alive = false;

  bot.sendMessage(target.id, "💀 You have been killed! Wait for revival.");
  game.players.forEach(p => {
    if (p.id !== target.id)
      bot.sendMessage(p.id, `☠️ ${target.name} has been killed by the hunter.`);
  });

  rotateHunter(game, userId);
});

bot.onText(/\/revive (.+)/, (msg, match) => {
  const userId = msg.from.id;
  const playerName = match[1];
  const game = Object.values(hunterGames).find(g => g.status === 'active' && g.players.find(p => p.id === userId));

  if (!game) return bot.sendMessage(msg.chat.id, "❌ You are not in an active Hunter game.");
  if (userId !== game.hunterId) return bot.sendMessage(msg.chat.id, "❌ Only the hunter can revive.");

  const target = game.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (!target) return bot.sendMessage(msg.chat.id, "❌ Player not found.");
  if (target.alive) return bot.sendMessage(msg.chat.id, "❌ Player is already alive.");

  target.alive = true;

  bot.sendMessage(target.id, "❤️ You have been revived by the hunter!");
  game.players.forEach(p => {
    if (p.id !== target.id)
      bot.sendMessage(p.id, `💚 ${target.name} has been revived by the hunter.`);
  });

  rotateHunter(game, userId);
});
function rotateHunter(game, currentHunterId) {
  const alivePlayers = game.players.filter(p => p.alive && p.id !== currentHunterId);
  if (alivePlayers.length === 0) return; // no one to rotate
  game.hunterId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
  const newHunter = game.players.find(p => p.id === game.hunterId);
  bot.sendMessage(newHunter.id, "⚔️ You are now the new HUNTER!");
}
// ---------------- Fight Game Functions ----------------
function sendTurnMessage(chatId, gameId) {
  const game = games[gameId];
  if (!game) return;
  while (game.players[game.turnIndex].hp <= 0) game.turnIndex = (game.turnIndex + 1) % game.players.length;
  const currentPlayer = game.players[game.turnIndex];
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🗡️ Attack", callback_data: `attack_${gameId}` }],
        [{ text: "💥 Special", callback_data: `special_${gameId}` }],
        [{ text: "❤️ Heal", callback_data: `heal_${gameId}` }]
      ]
    }
  };
  bot.sendMessage(chatId, `🎮 Turn: ${currentPlayer.name}\n` + gameStatusText(game), options);
}

function gameStatusText(game) { return game.players.map(p => `${p.name}: ${p.hp} HP`).join("\n"); }

function handleFightAction(query) {
  const chatId = query.message.chat.id;
  const [action, gameId] = query.data.split('_');
  const game = games[gameId];
  if (!game || game.status !== 'active') return;

  const player = game.players[game.turnIndex];
  if (query.from.id !== player.id) return bot.answerCallbackQuery(query.id, { text: "❌ Not your turn!" });

  let text = '';
  if (action === 'attack') {
    const opponents = game.players.filter(p => p.id !== player.id && p.hp > 0);
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    let damage = Math.floor(Math.random() * 16) + 5;
    if (player.premium && Math.random() < 0.2) damage *= 2;
    target.hp -= damage; 
    if (target.hp < 0) target.hp = 0;
    text = `🗡️ ${player.name} attacked ${target.name} for ${damage} damage!`;

  } else if (action === 'special') {
    if (player.cooldown > 0) return bot.answerCallbackQuery(query.id, { text: `❌ Special on cooldown (${player.cooldown} turns)` });
    const opponents = game.players.filter(p => p.id !== player.id && p.hp > 0);
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    let damage = Math.floor(Math.random() * 21) + 15;
    if (player.premium) damage += 10;
    target.hp -= damage; 
    if (target.hp < 0) target.hp = 0;
    player.cooldown = 3;
    text = `💥 ${player.name} used SPECIAL on ${target.name} for ${damage} damage!`;

  } else if (action === 'heal') {
    const heal = Math.floor(Math.random() * 6) + 10;
    player.hp += heal;
    if (player.hp > 100) player.hp = 100;
    text = `❤️ ${player.name} healed for ${heal} HP!`;
  }

  // Reduce cooldowns
  game.players.forEach(p => { if (p.cooldown > 0) p.cooldown--; });

  // Advance turn
  do {
      game.turnIndex = (game.turnIndex + 1) % game.players.length;
  } while (game.players[game.turnIndex].hp <= 0 && game.players.filter(p => p.hp > 0).length > 1);

  // Check for winner
  const alive = game.players.filter(p => p.hp > 0);
  if (alive.length === 1) {
      const winner = alive[0];
      text += `\n🏆 ${winner.name} is the winner!`;
      game.status = 'ended';

      // Update leaderboard
      if (!leaderboard[winner.id]) leaderboard[winner.id] = { name: winner.name, wins: 0, fights: 0 };
      leaderboard[winner.id].wins += 1;
      game.players.forEach(p => {
          if (!leaderboard[p.id]) leaderboard[p.id] = { name: p.name, wins: 0, fights: 0 };
          leaderboard[p.id].fights += 1;
      });
  }

  // Update the message with game result
  bot.editMessageText(text + '\n\n' + gameStatusText(game), { chat_id: chatId, message_id: query.message.message_id });
  if (game.status === 'active') sendTurnMessage(chatId, gameId);

  bot.answerCallbackQuery(query.id);
}
function startRPSRound(chatId, gameId) {
  const game = rpsGames[gameId];
  if (!game) return;

  bot.sendMessage(chatId, `🎮 Rock-Paper-Scissors begins!\n${game.players[0].name} vs ${game.players[1].name}`);

  for (const player of game.players) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🪨 Rock", callback_data: `rpsmove_${gameId}_rock` }],
          [{ text: "📄 Paper", callback_data: `rpsmove_${gameId}_paper` }],
          [{ text: "✂️ Scissors", callback_data: `rpsmove_${gameId}_scissors` }]
        ]
      }
    };
    bot.sendMessage(player.id, "Choose your move!", options);
  }
}

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // RPS move handling
  if (data.startsWith("rpsmove_")) {
    const [_, gameId, move] = data.split("_");
    const game = rpsGames[gameId];
    if (!game || game.status !== 'active') return;

    game.moves[query.from.id] = move;
    bot.answerCallbackQuery(query.id, { text: `You chose ${move}!` });

    // Wait until both players move
    if (Object.keys(game.moves).length === 2) {
      const [p1, p2] = game.players;
      const m1 = game.moves[p1.id];
      const m2 = game.moves[p2.id];

      const result = getRPSWinner(m1, m2);
      let text = `🪨 Rock-Paper-Scissors Results:\n\n${p1.name}: ${m1}\n${p2.name}: ${m2}\n\n`;

      if (result === 0) text += "🤝 It's a draw!";
      else if (result === 1) text += `🏆 ${p1.name} wins!`;
      else text += `🏆 ${p2.name} wins!`;

      bot.sendMessage(chatId, text);
      game.status = 'ended';
    }
  }
});

function getRPSWinner(move1, move2) {
  if (move1 === move2) return 0;
  if (
    (move1 === "rock" && move2 === "scissors") ||
    (move1 === "paper" && move2 === "rock") ||
    (move1 === "scissors" && move2 === "paper")
  ) return 1;
  return 2;
}
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;

    // ---------------- Translator ----------------
    if (translatorUsers[userId]) {
        const targetLang = translatorUsers[userId];
        bot.sendChatAction(chatId, "typing");
        const translated = await translateText(text, targetLang);
        bot.sendMessage(chatId, `🌐 Translation (${targetLang}):\n${translated}`);
        delete translatorUsers[userId]; // reset user state
        return;
    }

    // ---------------- Calculator ----------------
    if (calculatorUsers[userId]) {
        try {
            const formatted = text
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/√/g, 'sqrt')
                .replace(/%/g, '/100');
            const answer = math.evaluate(formatted);
            bot.sendMessage(chatId, `✅ Result: ${answer}`);
        } catch (err) {
            bot.sendMessage(chatId, "❌ Invalid expression! Use +, -, ×, ÷, %, √, (), etc.");
        }
        delete calculatorUsers[userId];
        return;
    }

    // ---------------- Premium AI ----------------
    // Handle AI User Chat
if (aiUsers[userId]?.active) {
  resetDailyUsage(userId); // make sure daily count is up-to-date

  if (aiUsers[userId].count >= MAX_DAILY) {
    aiUsers[userId].active = false; // stop AI automatically
    return bot.sendMessage(chatId, "🚫 You’ve reached your daily limit of AI questions. Come back tomorrow!");
  }

  aiUsers[userId].count++; // increment daily usage
  bot.sendChatAction(chatId, "typing");

  try {
    const answer = await callAI(text);
    return bot.sendMessage(chatId, `🤖 MEGA AI says:\n${answer}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("AI Response Error:", err.message);
    return bot.sendMessage(chatId, "⚠️ Something went wrong. Please try again.");
  }
}
// ---------------- Sticker Maker / Premium ----------------
if (stickerUsers[userId]) {
    if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[msg.photo.length - 1];
        try {
            const file = await bot.getFile(photo.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${YOUR_BOT_TOKEN}/${file.file_path}`;
            stickerUsers[userId] = false;
            return bot.sendMessage(msg.chat.id, `🖌️ Sticker created!\n${fileUrl}`);
        } catch (err) {
            console.error(err);
            return bot.sendMessage(msg.chat.id, "⚠️ Failed to create sticker.");
        }
    } else {
        return bot.sendMessage(msg.chat.id, "⚠️ Please send a picture.");
    }
}
    // ---------------- Dirly / Memory ----------------
if (pendingDirly[userId] === "saving") {
    if (!dirlyUsers[userId]) dirlyUsers[userId] = [];
    dirlyUsers[userId].push(text);

    // ✅ Debug: show saved messages in console
    console.log("Dirly for", userId, ":", dirlyUsers[userId]);

    delete pendingDirly[userId];
    return bot.sendMessage(chatId, "✅ Message saved in Dirly!");
}
});
// --------------------- Bot Ready ---------------------
console.log("MEGA Bot is running! ✅");

// --------------------- Polling Bot (No Express Needed) ---------------------
// Your bot will keep listening for Telegram messages continuously.
// Railway keeps the process alive, so no dummy server is required.
