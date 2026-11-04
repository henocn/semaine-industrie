'use strict';

/* Envoi unique de la notification « en cours » aux écoles dotées d'un code par la migration.
   Sans option, liste seulement ce qui partirait.
   --send envoie e-mail et WhatsApp ; --send --email-only garde WhatsApp pour plus tard.
   Une trace par canal empêche tout second envoi, même si le script est relancé.
   Les inscriptions postérieures à la migration sont notifiées à l'inscription et n'entrent pas ici. */
const { sequelize, AuditEvent, Participation } = require('../src/models');
const mailService = require('../src/modules/notifications/mail.service');
const whatsappService = require('../src/modules/whatsapp/whatsapp.service');

const BACKFILL = 'backfill_tracking_code';
const SENT = { email: 'notify_received_email', whatsapp: 'notify_received_whatsapp' };
const PAUSE_MS = 1500;

const send = process.argv.includes('--send');
const emailOnly = process.argv.includes('--email-only');

/* Marque un envoi réussi. */
function mark(channel, row, detail) {
  return AuditEvent.create({
    action: SENT[channel],
    entity_type: 'participation',
    entity_id: row.id,
    summary: `Notification « en cours » envoyée par ${channel} : ${row.name}`,
    meta: { code: row.tracking_code, ...detail },
  });
}

/* État d'un canal, sans jamais afficher l'adresse ni le numéro. */
function plan(contact, alreadySent, held = false) {
  if (alreadySent) return 'déjà envoyé';
  if (!contact) return 'pas de contact';
  return held ? 'en attente' : 'à envoyer';
}

async function main() {
  const events = await AuditEvent.findAll({
    where: { entity_type: 'participation', action: [BACKFILL, SENT.email, SENT.whatsapp] },
    attributes: ['action', 'entity_id'],
  });
  const done = new Set(events.map((event) => `${event.action}:${event.entity_id}`));
  const ids = events.filter((event) => event.action === BACKFILL).map((event) => event.entity_id);
  const rows = await Participation.findAll({
    where: { id: ids, kind: 'ecole', status: 'pending' },
    order: [['created_at', 'ASC']],
  });

  console.log(`${rows.length} école(s) concernée(s), ${send ? 'ENVOI' : 'liste seule'}`);
  let failed = 0;
  for (const row of rows) {
    const emailState = plan(row.email, done.has(`${SENT.email}:${row.id}`));
    const whatsappState = plan(row.phone, done.has(`${SENT.whatsapp}:${row.id}`), emailOnly);
    console.log(`- ${row.name} | ${row.tracking_code} | e-mail : ${emailState} | WhatsApp : ${whatsappState}`);
    if (!send) continue;

    if (emailState === 'à envoyer') {
      const sent = await mailService.participationReceived(row);
      if (sent.ok) await mark('email', row, {});
      else failed += 1;
      console.log(`    e-mail : ${sent.ok ? 'envoyé' : `échec (${sent.reason})`}`);
    }
    if (whatsappState === 'à envoyer') {
      const sent = await whatsappService.notifyParticipationReceived(row);
      if (sent.ok) await mark('whatsapp', row, { template: sent.template || null });
      else failed += 1;
      console.log(`    WhatsApp : ${sent.ok ? `envoyé (${sent.template || 'message de session'})` : 'échec'}`);
    }
    await new Promise((resolve) => { setTimeout(resolve, PAUSE_MS); });
  }
  return failed;
}

main()
  .then(async (failed) => {
    await sequelize.close();
    process.exit(failed ? 2 : 0);
  })
  .catch(async (err) => {
    console.error(err.message);
    await sequelize.close();
    process.exit(1);
  });
