import readYamlFile from "read-yaml-file";
import * as imaps from 'imap-simple';
import { ImapMailModel } from "./mail.model";

export interface ConnectionModel {
  conn: imaps.ImapSimple;
  email: ImapMailModel;
}

export class ImapService {
  private connections: imaps.ImapSimple[] = [];
  fromDate = new Date();

  constructor(private messagesHandler: (messages: imaps.Message[], conn: ConnectionModel) => void) {
    this.initConnectionsAndRun();
  }

  private async initConnectionsAndRun() {
    const emails = await readYamlFile<ImapMailModel[]>('./mails.yml');
    this.connections = await Promise.all(emails.map(email => this.generateConn(email)));
  }

  private async generateConn(emailConfigModel: ImapMailModel): Promise<imaps.ImapSimple> {
    let conn: imaps.ImapSimple;
    const connConfig: imaps.ImapSimpleOptions = {
      imap: {
        user: emailConfigModel.email,
        password: emailConfigModel.password,
        host: emailConfigModel.host,
        port: emailConfigModel.port,
        tls: emailConfigModel.tls,
        authTimeout: 3000,
      },
      onmail: () => this.callSearch({ conn, email: emailConfigModel })
    };
    conn = await imaps.connect(connConfig);
    await conn.openBox('INBOX');
    return conn;
  }

  private async callSearch(connModel: ConnectionModel): Promise<void> {
    var searchCriteria = [
      'UNSEEN',
      ['FROM', connModel.email.fromEmails[0]], // TODO from emails array
      ['SINCE', this.fromDate],
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