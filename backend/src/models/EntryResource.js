'use strict';

const { DataTypes } = require('sequelize');

/* Fichier ressource lié à une fiche acceptée. */
module.exports = (sequelize) => {
  const EntryResource = sequelize.define(
    'EntryResource',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entry_kind: {
        type: DataTypes.ENUM('organization', 'participation', 'business'),
        allowNull: false,
      },
      entry_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    { tableName: 'entry_resources' },
  );

  return EntryResource;
};
