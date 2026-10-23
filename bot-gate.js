// Zainul FX Journal - community gate bot (no dependencies, plain Node)
// 1. Put your bot token below (or in the BOT_TOKEN env var).
// 2. Run: node bot-gate.js
// 3. In BotFather: /setmenubutton -> set the WEB APP URL to this bot's gate
//    is NOT needed anymore. Instead, this bot sends its own Open App button
//    after the user joins. Set BotFather menu button OFF or leave it as a
//    backup direct link.

const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN || 'PASTE_YOUR_BOT_TOKEN_HERE';
const TG_CHANNEL = '@zainul_fxx'; // your Telegram community, must be public or bot added as admin
const TG_LINK = 'https://t.me/zainul_fxx';
const WA_LINK = 'https://chat.whatsapp.com/CJscXJvHvGfDL08vpwlr6B';
const MINI_APP_URL = 'https://zainulfx01-eng.github.io/sec-journal/';

const API = (method, body) => new Promise((res, rej) => {
  const data = JSON.stringify(body || {});
  const req = https.request({
    hostname: 'api.telegram.org', path: `/bot${BOT_TOKEN}/${method}`,
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
  }, r => {
    let b = '';
    r.on('data', c => b += c);
    r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  });
  req.on('error', rej);
  if (body) req.write(data);
  req.end();
});

const WELCOME = `Welcome to Zainul FX Journal, the trading journal for serious gold traders.

Before you open the app, join the two communities:

1. Telegram: tap Join Telegram below
2. WhatsApp: tap Join WhatsApp below

Once you have joined both, tap "I have joined" to unlock the journal.`;

const isMember = async (chatId) => {
  try {
    const r = await API('getChatMember', { chat_id: TG_CHANNEL, user_id: chatId });
    return r.ok && ['creator', 'administrator', 'member', 'restricted'].includes(r.result.status);
  } catch (e) { return null; } // null = cannot verify (bot not in channel yet)
};

const sendGate = (chatId, name) => API('sendMessage', {
  chat_id: chatId,
  text: WELCOME.replace('Zainul FX Journal', name ? `Zainul FX Journal, ${name}` : 'Zainul FX Journal'),
  reply_markup: { inline_keyboard: [
    [{ text: 'Join Telegram', url: TG_LINK }],
    [{ text: 'Join WhatsApp', url: WA_LINK }],
    [{ text: 'I have joined', callback_data: 'check_join' }]
  ]}
});

const sendOpen = (chatId) => API('sendMessage', {
  chat_id: chatId,
  text: 'You are in. Open your journal below.',
  reply_markup: { inline_keyboard: [
    [{ text: 'Open Zainul FX Journal', web_app: { url: MINI_APP_URL } }]
  ]}
});

let offset = 0;
const poll = async () => {
  const r = await API('getUpdates', { offset, timeout: 25 });
  if (r.ok) for (const u of r.result) {
    offset = u.update_id + 1;
    const msg = u.message, cb = u.callback_query;
    if (msg && msg.text && msg.text.startsWith('/start')) {
      await sendGate(msg.chat.id, msg.chat.first_name);
    } else if (cb && cb.data === 'check_join') {
      const chatId = cb.message.chat.id;
      const member = await isMember(chatId);
      if (member === true) {
        await API('answerCallbackQuery', { callback_query_id: cb.id });
        await sendOpen(chatId);
      } else if (member === false) {
        await API('answerCallbackQuery', { callback_query_id: cb.id, text: 'I cannot find you in the Telegram community yet. Join @zainul_fxx and try again.' });
      } else {
        // Bot not admin of the channel: unlock on the honor system
        await API('answerCallbackQuery', { callback_query_id: cb.id });
        await sendOpen(chatId);
      }
    }
  }
  setTimeout(poll, 500);
};

poll().catch(console.error);
console.log('Zainul gate bot running. Ctrl+C to stop.');
