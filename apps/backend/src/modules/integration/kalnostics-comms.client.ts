import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';

/** A base64 attachment forwarded verbatim to the kalnostics Exchange gateway. */
export interface CommsAttachment {
  data: string; // base64
  name: string;
  type: string; // MIME type
}

/** One email recipient. */
export interface CommsRecipient {
  toAddress: string;
  recipientName?: string;
}

/** Parameters for a single email dispatch. */
export interface SendEmailParams {
  subject: string;
  body: string;
  recipients: CommsRecipient[];
  attachments?: CommsAttachment[];
}

/**
 * Thin client over the kalnostics-new communication API. The inventory backend
 * does not own a mail transport — document email is dispatched through
 * kalnostics' `POST /communications/send` (Exchange gateway), forwarding the
 * caller's own Bearer token so the message is composed in their tenant/branch
 * context (CLAUDE.md §4.7 — context from the token, never the body).
 */
@Injectable()
export class KalnosticsCommsClient {
  private readonly logger = new Logger(KalnosticsCommsClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Queue an email through the kalnostics comms gateway.
   * @param bearerToken the caller's `Authorization: Bearer …` header value.
   * @param params subject/body/recipients/attachments for the message.
   * @throws KaltrosException if the gateway is unreachable or rejects the send.
   */
  async sendEmail(bearerToken: string, params: SendEmailParams): Promise<void> {
    const baseUrl = this.config.get<string>('kalnostics.baseUrl');
    const timeoutMs = this.config.get<number>('kalnostics.timeoutMs') ?? 15000;
    if (!baseUrl) {
      throw new KaltrosException(
        'COMMS_NOT_CONFIGURED',
        'Email service is not configured.',
        { reason: 'KALNOSTICS_API_BASE_URL missing' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}/communications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: bearerToken,
        },
        body: JSON.stringify({
          channel: 'EMAIL',
          subject: params.subject,
          body: params.body,
          recipients: params.recipients.map((r) => ({
            recipientType: 'CUSTOM',
            toAddress: r.toAddress,
            recipientName: r.recipientName,
          })),
          attachments: params.attachments,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(
          `comms send failed: ${res.status} ${text.slice(0, 500)}`,
        );
        throw new KaltrosException(
          'COMMS_SEND_FAILED',
          'Could not send the email.',
          { status: res.status, body: text.slice(0, 500) },
          HttpStatus.BAD_GATEWAY,
        );
      }
    } catch (err) {
      if (err instanceof KaltrosException) throw err;
      this.logger.error(`comms send error: ${String(err)}`);
      throw new KaltrosException(
        'COMMS_UNREACHABLE',
        'Email service is unreachable.',
        { error: String(err) },
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
