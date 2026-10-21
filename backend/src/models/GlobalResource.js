'use strict';

const { DataTypes } = require('sequelize');

/* Document global (PDF programme ou autre fichier partagé). */
module.exports = (sequelize) => {
  const GlobalResource = sequelize.define(
    'GlobalResource',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    { tableName: 'global_resources' },
  );

  return GlobalResource;
};
