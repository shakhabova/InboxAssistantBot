import readYamlFile from "read-yaml-file";
import * as imaps from 'imap-simple';
import { ImapMailModel } from "./mail.model";
import { subDays } from "date-fns";

export interface ConnectionModel {
  conn: imaps.ImapSimple;
  email: ImapMailModel;
}

export class ImapService {
  private connections: Array<imaps.ImapSimple | undefined> = [];
  fromDate = subDays(new Date(), 1);

  constructor(private messagesHandler: (messages: imaps.Message[], conn: ConnectionModel) => void) {
    this.initConnectionsAndRun();
  }

  private async initConnectionsAndRun() {
    const emails = await readYamlFile<ImapMailModel[]>('./mails.yml');
    this.connections = await Promise.all(emails.map(email => this.generateConn(email)));
  }

  private async generateConn(emailConfigModel: ImapMailModel): Promise<imaps.ImapSimple | undefined> {
    let conn: imaps.ImapSimple;
    const connConfig: imaps.ImapSimpleOptions = {
      imap: {
        user: emailConfigModel.email,
        password: emailConfigModel.password,
        host: emailConfigModel.host,
        port: emailConfigModel.port,
        tls: emailConfigModel.tls,
        authTimeout: 3000,
        tlsOptions: {
          servername: emailConfigModel.host,
        }
      },
      onmail: () => this.callSearch({ conn, email: emailConfigModel }),
    };

    try {
      conn = await imaps.connect(connConfig);
      await conn.openBox('INBOX');
      return conn;
    } catch (err) {
      console.error(err);
    }
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

    try {
      const res = await connModel.conn.search(searchCriteria, fetchOptions);
      if (res?.length) {
        this.messagesHandler(res, connModel);
      }
    } catch (err) {
      console.error(err);
    }
  }
}