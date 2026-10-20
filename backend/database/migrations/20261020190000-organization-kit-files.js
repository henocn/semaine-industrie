'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /* Ajoute kit_files (liste) et migre l'ancien PDF unique. */
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('organizations', 'kit_files', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });

    await queryInterface.sequelize.query(`
      UPDATE organizations
      SET kit_files = jsonb_build_array(
        jsonb_build_object(
          'id', 'legacy',
          'name', 'kit.pdf',
          'url', label_document_url,
          'mime', 'application/pdf',
          'size', null
        )
      )
      WHERE label_document_url IS NOT NULL
        AND label_document_url <> ''
        AND (kit_files IS NULL OR kit_files = '[]'::jsonb);
    `);
  },

  /* Retire kit_files. */
  async down(queryInterface) {
    await queryInterface.removeColumn('organizations', 'kit_files');
  },
};
