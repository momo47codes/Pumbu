const crypto = require('crypto');
global.crypto = crypto;

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const BOT_NAME = process.env.BOT_NAME || 'MOMO XMD';
const OWNER_NAME = process.env.OWNER_NAME || 'MOMO47';
const OWNER_NUMBER = process.env.OWNER_NUMBER || '255765409584';
const PREFIX = '.';

let hasPaired = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Safari'),
        auth: state,
        printQRInTerminal: false,
    });

    if (!fs.existsSync('./auth/creds.json') &&!hasPaired) {
        hasPaired = true;
        await new Promise(resolve => setTimeout(resolve, 15000));

        try {
            const code = await sock.requestPairingCode(OWNER_NUMBER);
            console.log(`\nCODE: ${code.match(/.{1,4}/g).join('-')}\n`);

            setTimeout(() => process.exit(0), 30000);
        } catch (err) {
            console.log('Error:', err.message);
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(`${BOT_NAME} ONLINE`);
            hasPaired = true;
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            if (statusCode!== DisconnectReason.loggedOut) {
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

        if (cmd === 'menu') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `*${BOT_NAME} MENU*\n\n.menu\n.ping`
            }, { quoted: msg });
        }
        if (cmd === 'ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! ✅' }, { quoted: msg });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
