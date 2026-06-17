const crypto = require('crypto');
global.crypto = crypto;

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const os = require('os');

const BOT_NAME = process.env.BOT_NAME || 'MOMO XMD';
const OWNER_NAME = process.env.OWNER_NAME || 'MOMO47';
const PREFIX = '.';
const MODE = 'Public';
const VERSION = '1.0.0';

console.log(`\n╭─────────────────────╮`);
console.log(`│ ${BOT_NAME} BOT STARTING │`);
console.log(`╰─────────────────────╯\n`);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Safari'),
        auth: state,
        printQRInTerminal: true, // QR itatoka hapa
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n╭─────────────────────╮');
            console.log(`│ SCAN QR CODE HAPA CHINI │`);
            console.log('╰─────────────────────╯');
            console.log('Nenda WhatsApp > Settings > Linked Devices > Link a Device');
        }

        if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} IS ONLINE`);
            console.log(`👑 Owner: ${OWNER_NAME}`);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut;
            
            console.log('Connection closed, reconnecting...', shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!text.startsWith(PREFIX)) return;

        const cmd = text.slice(PREFIX.length).trim().toLowerCase();

        if (cmd === 'menu' || cmd === 'help') {
            const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(0);
            const ramPercent = Math.round((ramUsed / (ramTotal * 1024)) * 100);
            const ramBar = '█'.repeat(Math.floor(ramPercent / 10)) + '░'.repeat(10 - Math.floor(ramPercent / 10));

            const menu = `╭── *${BOT_NAME}* ──
│ 👑 *OWNER*: ${OWNER_NAME}
│ 📌 *PREFIX*: [ ${PREFIX} ]
│ 🖥️ *HOST*: Heroku
│ ⚡ *PING*: 331 ms
│ 🔧 *MODE*: ${MODE}
│ 📦 *VERSION*: ${VERSION}
│ 💾 *RAM*: ${ramUsed} MB of ${ramTotal} GB
│ ${ramBar} ${ramPercent}%
╰─────────────────

╭─ *AI MENU* ─
│ ▸ analyze ▸ blackbox ▸ code ▸ dalle
│ ▸ deepseek ▸ gemini ▸ generate ▸ gpt
│ ▸ story ▸ summarize ▸ teach ▸ translate2
╰────────────

╭─ *DOWNLOAD MENU* ─
│ ▸ tiktok ▸ instagram ▸ youtube ▸ twitter
│ ▸ mediafire ▸ gdrive ▸ apk ▸ song
╰──────────────────

_${BOT_NAME} by ${OWNER_NAME}_`;

            await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
        }

        if (cmd === 'ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: `Pong! ${Math.floor(Math.random() * 100)}ms` }, { quoted: msg });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
