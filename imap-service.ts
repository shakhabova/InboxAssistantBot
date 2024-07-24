import readYamlFile from "read-yaml-file";
import * as imaps from 'imap-simple';
import { ImapMailModel } from "./mail.model";

export interface ConnectionModel {
  conn: imaps.ImapSimple;
  email: ImapMailModel;
}

export class ImapService {
  private connections: ConnectionModel[] = [];
  fromDate = new Date();

  constructor(private messagesHandler: (messages: imaps.Message[], conn: ConnectionModel) => void) {
    this.initConnections();
  }

  private async initConnections() {
    const emails = await readYamlFile<ImapMailModel[]>('./mails.yml');
    const configs: [imaps.ImapSimpleOptions, ImapMailModel][] = emails.map(email => {
      return [
        {
          imap: {
            user: email.email,
            password: email.password,
            host: email.host,
            port: email.port,
            tls: email.tls,
            authTimeout: 3000,
          }
        },
        email
      ]
    });

    this.connections = await Promise.all(configs.map(([conf, mail]) => this.getConn(conf, mail)));
    this.runInterval();
  }

  private async getConn(conf: imaps.ImapSimpleOptions, mail: ImapMailModel): Promise<ConnectionModel> {
    const conn = await imaps.connect(conf);
    await conn.openBox('INBOX');
    return { conn, email: mail };
  }

  private async runInterval() {
    setInterval(async () => {
      await Promise.all(this.connections.map(conn => this.callSearch(conn)))
    }, 5000);
  }

  private async callSearch(connModel: ConnectionModel): Promise<void> {
    var searchCriteria = [
      ['FROM', connModel.email.fromEmails[0]], // TODO from emails array
      ['SINCE', this.fromDate],
      'UNSEEN'
    ];
    
    var fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    };
    const res = await connModel.conn.search(searchCriteria, fetchOptions);
    if (res?.length) {
      this.messagesHandler(res, connModel);
    }
  }
}