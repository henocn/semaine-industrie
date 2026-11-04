'use strict';

/* Produit tous les e-mails de notification avec des données fictives, en JSON sur la sortie standard.
   N'envoie rien : sert à relire le rendu avant de valider les textes. */
const { emails } = require('../src/utils/emailTemplates');
const { renderQrCard } = require('../src/utils/qrCard');

const SITE = 'https://semaineindustrie.tg';

/* Prépare les pièces jointes pour le JSON. */
function serialize(message) {
  return {
    ...message,
    attachments: message.attachments.map((file) => ({
      ...file,
      content: file.content.toString('base64'),
      encoding: 'base64',
    })),
  };
}

async function main() {
  const mail = emails(SITE);
  const school = { name: 'Université de Lomé, École polytechnique', code: 'EC-G7H5' };
  const person = { name: 'Afi Mensah', code: 'PA-3MXR' };
  const site = { name: 'Menuiserie industrielle de Kpalimé', code: 'IN-K7P4' };
  const company = { name: 'Sahel Invest', code: 'AF-9TQB' };

  const schoolCard = await renderQrCard({ payload: `${SITE}/passage/${school.code}`, name: school.name, code: school.code });
  const personCard = await renderQrCard({ payload: `${SITE}/passage/${person.code}`, name: person.name, code: person.code });
  const siteCard = await renderQrCard({ payload: `${SITE}/o/menuiserie-industrielle-de-kpalime`, name: site.name });

  const messages = [
    mail.schoolReceived({ ...school, city: 'Lomé', headcount: 32, registeredOn: '4 novembre 2026' }),
    mail.schoolApproved({ ...school, places: 32, cardPng: schoolCard }),
    mail.schoolRejected(school),
    mail.individualReceived(person),
    mail.individualApproved({ ...person, cardPng: personCard }),
    mail.individualRejected(person),
    mail.labelReceived(site),
    mail.labelApproved({ ...site, cardPng: siteCard }),
    mail.labelRejected(site),
    mail.businessReceived(company),
    mail.businessApproved(company),
    mail.businessRejected(company),
    mail.meeting({ code: company.code, day: '20/11/2026', slot: '10:30 à 11:00', place: 'Salle des rencontres, Lomé', others: 'Golfe Capital' }),
    mail.meeting({ code: company.code, day: '20/11/2026', slot: '15:00 à 15:30', place: 'Salle des rencontres, Lomé', others: 'Golfe Capital', rescheduled: true }),
    mail.schoolVisit({ code: school.code, day: '18/11/2026', slot: '09:00 à 12:00', site: site.name }),
    mail.siteVisit({ code: site.code, day: '18/11/2026', slot: '09:00 à 12:00', school: school.name, headcount: 32 }),
    mail.visitReminder({ code: school.code, day: '18/11/2026', slot: '09:00 à 12:00', place: site.name }),
  ];

  process.stdout.write(JSON.stringify(messages.map(serialize)));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
