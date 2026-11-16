'use strict';

/* Renvoi unique de l'e-mail d'acceptation aux particuliers acceptés (envois bloqués par la limite SiteGround).
   Le message précise que ceux qui l'ont déjà reçu peuvent l'ignorer.
   Sans option, liste seulement ce qui partirait ; --send envoie.
   Une trace par e-mail empêche tout second envoi, même si le script est relancé.
   Rythme lent (une toutes les 10 s, soit 360 par heure) et arrêt au premier refus du serveur d'envoi,
   pour ne pas prolonger un blocage. --limit=N borne le nombre d'envois de cette exécution. */
const { sequelize, AuditEvent, Participation, Passport } = require('../src/models');
const mailService = require('../src/modules/notifications/mail.service');

const SENT = 'resend_approved_email';
const PAUSE_MS = 10000;

const send = process.argv.includes('--send');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

async function main() {
  const done = new Set((await AuditEvent.findAll({
    where: { entity_type: 'participation', action: SENT },
    attributes: ['entity_id'],
  })).map((event) => event.entity_id));
  const rows = await Participation.findAll({
    where: { kind: 'particulier', status: 'approved' },
    order: [['updated_at', 'ASC']],
  });
  const passports = new Map((await Passport.findAll({
    where: { id: rows.map((row) => row.passport_id).filter(Boolean) },
    attributes: ['id', 'code'],
  })).map((passport) => [passport.id, passport.code]));

  const todo = rows.filter((row) => row.email && !done.has(row.id) && passports.get(row.passport_id));
  console.log(`${rows.length} particulier(s) accepté(s) : ${todo.length} à envoyer, ${done.size} déjà renvoyé(s), `
    + `${rows.filter((row) => !row.email).length} sans e-mail — ${send ? 'ENVOI' : 'liste seule'}`);
  if (!send) {
    todo.forEach((row) => console.log(`- ${row.name} | ${passports.get(row.passport_id)}`));
    return 0;
  }

  let sentCount = 0;
  for (const row of todo) {
    if (sentCount >= limit) break;
    const code = passports.get(row.passport_id);
    const sent = await mailService.participationApproved(row, code, { resend: true });
    if (!sent.ok) {
      console.log(`- ${row.name} | ${code} : échec (${String(sent.reason).split('\n')[0]})`);
      console.log(`Arrêt : ${sentCount} envoyé(s) dans cette exécution. Relancer plus tard, les envoyés seront sautés.`);
      return 2;
    }
    await AuditEvent.create({
      action: SENT,
      entity_type: 'participation',
      entity_id: row.id,
      summary: `E-mail d'acceptation renvoyé : ${row.name}`,
      meta: { code },
    });
    sentCount += 1;
    console.log(`- ${row.name} | ${code} : envoyé (${sentCount}/${todo.length})`);
    await new Promise((resolve) => { setTimeout(resolve, PAUSE_MS); });
  }
  console.log(`Terminé : ${sentCount} envoyé(s).`);
  return 0;
}

main()
  .then(async (code) => {
    await sequelize.close();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err.message);
    await sequelize.close();
    process.exit(1);
  });
