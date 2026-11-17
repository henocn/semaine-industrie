'use strict';

/* Renvoie l'e-mail d'acceptation à tous les particuliers acceptés (mention « si déjà reçu, n'en tenez pas compte »).
   Sans option, compte seulement ; --send envoie. S'arrête au premier refus du serveur d'envoi.
   Rapport par personne : logs/renvoi-particuliers-AAAA-MM-JJ.csv (envoyé, échec ou non tenté). */
const fs = require('fs');
const path = require('path');
const { sequelize, Participation, Passport } = require('../src/models');
const mailService = require('../src/modules/notifications/mail.service');
const participationService = require('../src/modules/participations/participation.service');

const send = process.argv.includes('--send');
const REPORT = path.join(__dirname, '..', 'logs', `renvoi-particuliers-${new Date().toISOString().slice(0, 10)}.csv`);

const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

async function main() {
  const rows = await Participation.findAll({ where: { kind: 'particulier', status: 'approved' }, order: [['name', 'ASC']] });
  const codes = new Map((await Passport.findAll({
    where: { id: rows.map((row) => row.passport_id).filter(Boolean) },
    attributes: ['id', 'code'],
  })).map((passport) => [passport.id, passport.code]));
  const todo = rows.filter((row) => row.email && codes.get(row.passport_id));
  console.log(`${todo.length} e-mail(s) à envoyer${send ? '' : ' (ajouter --send pour envoyer)'}`);
  if (!send) return 0;

  const results = new Map();
  let count = 0;
  let stopped = null;
  for (const row of todo) {
    const sent = await mailService.participationApproved(row, codes.get(row.passport_id), { resend: true });
    await participationService.recordApprovedMail(row, sent);
    if (!sent.ok) {
      stopped = String(sent.reason).split('\n')[0];
      results.set(row.id, ['échec', new Date().toISOString(), stopped]);
      break;
    }
    results.set(row.id, ['envoyé', new Date().toISOString(), '']);
    count += 1;
    await new Promise((resolve) => { setTimeout(resolve, 1000); });
  }

  const lines = [['nom', 'code', 'telephone', 'email', 'statut', 'heure', 'detail'].join(';')];
  for (const row of rows) {
    const [status, at, detail] = results.get(row.id)
      || [!row.email ? 'pas d’e-mail' : !codes.get(row.passport_id) ? 'pas de QR' : 'non tenté (arrêt)', '', ''];
    lines.push([row.name, codes.get(row.passport_id) || row.tracking_code, row.phone, row.email, status, at, detail].map(cell).join(';'));
  }
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `﻿${lines.join('\n')}\n`);

  console.log(stopped ? `Arrêt après ${count} envoi(s) : ${stopped}` : `Terminé : ${count} envoyé(s).`);
  console.log(`Rapport : ${REPORT}`);
  return stopped ? 2 : 0;
}

main()
  .then(async (code) => { await sequelize.close(); process.exit(code); })
  .catch(async (err) => { console.error(err.message); await sequelize.close(); process.exit(1); });
