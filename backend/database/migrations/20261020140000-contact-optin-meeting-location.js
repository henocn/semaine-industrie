'use strict';

/* Consentement contact + lieu des rendez-vous affaires. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('label_requests', 'contact_opt_in', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('business_participants', 'contact_opt_in', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('business_meetings', 'location', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('business_meetings', 'attendee_ids', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.changeColumn('business_meetings', 'participant_b_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('label_requests', 'contact_opt_in');
    await queryInterface.removeColumn('business_participants', 'contact_opt_in');
    await queryInterface.removeColumn('business_meetings', 'location');
    await queryInterface.removeColumn('business_meetings', 'attendee_ids');
    await queryInterface.changeColumn('business_meetings', 'participant_b_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
