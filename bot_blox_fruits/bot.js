const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

let grupoAtivado = null;

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Escaneie o QR Code acima para conectar');
});

client.on('ready', () => {
    console.log('🤖 Bot conectado com sucesso!');
});

async function tirarScreenshotComTexto() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://fruityblox.com/stock', {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        await page.waitForSelector('.grid.grid-cols-2', { timeout: 30000 });

        const element = await page.$('main'); // Captura a tela toda visível do estoque
        const screenshotPath = path.resolve(__dirname, 'frutas_final.png');
        await element.screenshot({ path: screenshotPath });

        await browser.close();
        return screenshotPath;

    } catch (err) {
        await browser.close();
        console.error('❌ Erro ao capturar frutas:', err);
        return null;
    }
}

async function enviarEstoqueAutomatico() {
    if (!grupoAtivado) return;

    const imagem = await tirarScreenshotComTexto();
    if (imagem && fs.existsSync(imagem)) {
        const media = MessageMedia.fromFilePath(imagem);
        const chat = await client.getChatById(grupoAtivado);

        await chat.sendMessage(media);
        await chat.sendMessage("🛒 *Rene Store*\nEntre no nosso grupo para comprar contas:\nhttps://chat.whatsapp.com/DFIANib1yYNC8lff0qjiv4");
    }
}

client.on('message', async msg => {
    const isGroup = msg.from.includes('@g.us');

    if (msg.body.toLowerCase() === '!ativa' && isGroup) {
        grupoAtivado = msg.from;
        msg.reply('✅ Este grupo foi ativado para receber o estoque automaticamente!');
    }

    if (msg.body.toLowerCase() === '!desativa' && isGroup && msg.from === grupoAtivado) {
        grupoAtivado = null;
        msg.reply('❌ Envio automático desativado para este grupo.');
    }

    if (msg.body.toLowerCase() === '!stock') {
        const imagem = await tirarScreenshotComTexto();
        if (imagem && fs.existsSync(imagem)) {
            const media = MessageMedia.fromFilePath(imagem);
            await msg.reply(media);
            await msg.reply("🛒 *Rene Store*\nEntre no nosso grupo para comprar contas:\nhttps://chat.whatsapp.com/DFIANib1yYNC8lff0qjiv4");
        } else {
            msg.reply('❌ Ocorreu um erro ao gerar a imagem do estoque.');
        }
    }
});

client.initialize();

// Verifica o estoque de hora em hora
setInterval(enviarEstoqueAutomatico, 60 * 60 * 1000);


