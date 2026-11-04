'use strict';

/* Envoi unique par e-mail de la notification « en cours » aux écoles dotées d'un code par la migration.
   Sans option, liste seulement ce qui partirait ; --send envoie.
   Une trace par e-mail empêche tout second envoi, même si le script est relancé.
   Les inscriptions postérieures à la migration sont notifiées à l'inscription et n'entrent pas ici. */
const { sequelize, AuditEvent, Participation } = require('../src/models');
const mailService = require('../src/modules/notifications/mail.service');

const BACKFILL = 'backfill_tracking_code';
const SENT = 'notify_received_email';
const PAUSE_MS = 1500;

const send = process.argv.includes('--send');

/* État de l'envoi, sans jamais afficher l'adresse. */
function plan(row, alreadySent) {
  if (alreadySent) return 'déjà envoyé';
  return row.email ? 'à envoyer' : 'pas d’e-mail';
}

async function main() {
  const events = await AuditEvent.findAll({
    where: { entity_type: 'participation', action: [BACKFILL, SENT] },
    attributes: ['action', 'entity_id'],
  });
  const done = new Set(events.filter((event) => event.action === SENT).map((event) => event.entity_id));
  const ids = events.filter((event) => event.action === BACKFILL).map((event) => event.entity_id);
  const rows = await Participation.findAll({
    where: { id: ids, kind: 'ecole', status: 'pending' },
    order: [['created_at', 'ASC']],
  });

  console.log(`${rows.length} école(s) concernée(s), ${send ? 'ENVOI' : 'liste seule'}`);
  let failed = 0;
  for (const row of rows) {
    const state = plan(row, done.has(row.id));
    console.log(`- ${row.name} | ${row.tracking_code} | e-mail : ${state}`);
    if (!send || state !== 'à envoyer') continue;

    const sent = await mailService.participationReceived(row);
    if (sent.ok) {
      await AuditEvent.create({
        action: SENT,
        entity_type: 'participation',
        entity_id: row.id,
        summary: `Notification « en cours » envoyée par e-mail : ${row.name}`,
        meta: { code: row.tracking_code },
      });
    } else {
      failed += 1;
    }
    console.log(`    ${sent.ok ? 'envoyé' : `échec (${sent.reason})`}`);
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
