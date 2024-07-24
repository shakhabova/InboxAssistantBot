export interface ImapMailModel {
  name: string;
  email: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  fromEmails: string[];
}