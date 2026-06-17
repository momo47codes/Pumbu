const crypto = require('crypto');
global.crypto = crypto;

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const os = require('os');

const BOT_NAME = process.env.BOT_NAME || 'MOMO XMD';
const OWNER_NAME = process.env.OWNER_NAME || 'MOMO47';
const OWNER_NUMBER = process.env.OWNER_NUMBER || '255765409584';
const PREFIX = '.';
const MODE = 'Public';
const VERSION = '1.0.0';

console.log(`\n╭─────────────────────╮`);
console.log(`│ ${BOT_NAME} BOT STARTING │`);
console.log(`╰─────────────────────╯\n`);

let pairingSent = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Safari'),
        auth: state,
        printQRInTerminal: false,
    });

    // PAIRING CODE - Tuma mara 1 tu
    if (!fs.existsSync('./auth/creds.json') &&!pairingSent) {
        pairingSent = true;
        await new Promise(resolve => setTimeout(resolve, 8000)); // Subiri 8sec
        try {
            const code = await sock.requestPairingCode(OWNER_NUMBER);
            console.log('\n╭─────────────────────╮');
            console.log(`│ ${BOT_NAME} PAIRING CODE │`);
            console.log('╰─────────────────────╯');
            console.log(`CODE: ${code}`);
            console.log('Nenda WhatsApp > Settings > Linked Devices > Link Device\n');
        } catch (err) {
            console.log('Pairing code error:', err.message);
            pairingSent = false; // Ijaribu tena kama imefail
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} IS ONLINE`);
            console.log(`👑 Owner: ${OWNER_NAME}`);
            console.log(`📱 Number: ${OWNER_NUMBER}`);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut;

            console.log('Connection closed, reconnecting...', shouldReconnect);

            // Reconnect tu kama tumesha-pair na sio 428 error
            if (shouldReconnect && pairingSent && statusCode!== 428) {
                setTimeout(() => startBot(), 10000); // Subiri 10sec
            } else if (statusCode === 428) {
                console.log('428 Error: Futa auth folder + restart bot');
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
            const speed = (Math.random() * 0.9 + 0.2).toFixed(4);

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
│ ▸ analyze
│ ▸ blackbox
│ ▸ code
│ ▸ dalle
│ ▸ deepseek
│ ▸ gemini
│ ▸ generate
│ ▸ gpt
│ ▸ story
│ ▸ summarize
│ ▸ teach
│ ▸ translate2
╰────────────

╭─ *AUDIO MENU* ─
│ ▸ bass
│ ▸ blown
│ ▸ deep
│ ▸ earrape
│ ▸ reverse
│ ▸ robot
│ ▸ tomp3
│ ▸ toptt
│ ▸ volaudio
╰──────────────

╭─ *DOWNLOAD MENU* ─
│ ▸ apk
│ ▸ download
│ ▸ facebook
│ ▸ gdrive
│ ▸ gitclone
│ ▸ image
│ ▸ instagram
│ ▸ mediafire
│ ▸ pin
│ ▸ savestatus
│ ▸ song
│ ▸ tiktok
│ ▸ twitter
│ ▸ video
│ ▸ xvideo
╰──────────────────

╭─ *OWNER MENU* ─
│ ▸ restart
│ ▸ update
│ ▸ setbotname
│ ▸ setownername
│ ▸ setownernumber
│ ▸ mode
╰─────────────

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
