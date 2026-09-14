/**
 * whatsapp.worker.ts — DEPRECATED
 *
 * Substituído por WhatsappService.handleWebhook() com processamento
 * assíncrono direto (fire-and-forget via `void`).
 *
 * A fila BullMQ para WhatsApp foi removida. BullMQ/Redis continua
 * sendo usado apenas para Push Notifications.
 *
 * Motivo: Evolution API self-hosted elimina a necessidade do Twilio
 * e, no volume do MVP, async direto é suficiente.
 */

export {};
