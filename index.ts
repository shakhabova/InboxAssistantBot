import { Bot } from 'grammy';
import * as imaps from 'imap-simple';
import { ConnectionModel, ImapService } from './imap-service';
import { simpleParser } from 'mailparser';
import _ from 'lodash';
import 'dotenv/config';

const bot = new Bot(process.env.BOT_TOKEN!);

const adminChatId = +process.env.GROUP_ID!;

const imapService = new ImapService(messagesHandler);

async function messagesHandler(messages: imaps.Message[], conn: ConnectionModel) {
  const messagesForBot: string[] = [];
  messages.forEach(function (item) {
    var all = _.find(item.parts, { which: '' });
    if (!all) {
      return;
    }

    var id = item.attributes.uid;
    var idHeader = 'Imap-Id: ' + id + '\r\n';
    simpleParser(idHeader + all.body, (_err, mail) => {
      const message = `Почта: ${conn.email.email}
От: ${mail.from?.text}
Тема: ${mail.subject ?? '-пусто-'}
Время: ${mail.date}


${mail.text}
      `;
      messagesForBot.push(message);
    });
  });

  for (let message of messagesForBot) {
    await bot.api.sendMessage(adminChatId, message);
  }
}

bot.hears(/hi/i, (ctx) => {
  ctx.reply('hi there');
});
bot.hears(/check_id/i, (ctx) => {
  console.log(ctx.chat);
});

bot.start();
