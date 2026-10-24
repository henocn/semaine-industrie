'use strict';

const { DataTypes } = require('sequelize');

/* Définit le modèle Organization (entreprise ou école labellisable). */
module.exports = (sequelize) => {
  const Organization = sequelize.define(
    'Organization',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(220),
        allowNull: true,
        unique: true,
      },
      type: {
        type: DataTypes.ENUM('entreprise', 'ecole'),
        allowNull: false,
      },
      sector: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      region: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      lng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      contact_name: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      contact_email: {
        type: DataTypes.STRING(180),
        allowNull: true,
      },
      contact_phone: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      products: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      photo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      gallery_urls: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      label_code: {
        type: DataTypes.STRING(40),
        allowNull: true,
        unique: true,
      },
      legacy_code: {
        type: DataTypes.STRING(40),
        allowNull: true,
        unique: true,
      },
      label_document_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      kit_files: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      label_status: {
        type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      labeled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      max_visitors: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      visit_slots: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      safety_rules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'organizations',
    },
  );

  return Organization;
};
