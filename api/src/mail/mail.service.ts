import { Injectable, Logger } from '@nestjs/common';

export interface MailPayload {
  to:      string;
  subject: string;
  html:    string;
  from?:   string;
}

@Injectable()
export class MailService {
  private readonly logger    = new Logger(MailService.name);
  private readonly fromAddr  = process.env.MAIL_FROM ?? 'Kyra Atende <noreply@kyraatende.com.br>';
  private readonly apiKey    = process.env.RESEND_API_KEY;

  async send(payload: MailPayload): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`RESEND_API_KEY não configurada — email para ${payload.to} suprimido`);
      return;
    }

    const body = {
      from:    payload.from ?? this.fromAddr,
      to:      [payload.to],
      subject: payload.subject,
      html:    payload.html,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Resend error ${res.status}: ${err}`);
      throw new Error(`Falha ao enviar email (${res.status})`);
    }

    const { id } = await res.json();
    this.logger.log(`Email enviado | to: ${payload.to} | id: ${id}`);
  }
}
