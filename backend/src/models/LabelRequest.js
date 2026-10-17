'use strict';

const { DataTypes } = require('sequelize');

/* Définit le modèle LabelRequest (demande de label avant validation). */
module.exports = (sequelize) => {
  const LabelRequest = sequelize.define(
    'LabelRequest',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      structure_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      structure_type: {
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
        allowNull: false,
      },
      contact_email: {
        type: DataTypes.STRING(180),
        allowNull: false,
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
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      review_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'label_requests',
    },
  );

  return LabelRequest;
};
