'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('../utils/constants');
const databaseValidation = require('../utils/databaseValidation');

const ProjectMaterialSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    materials: [{
        reservedQuantity: {
            type: Number,
            default: 0
        },
        spaceNameId: {
            type: Schema.Types.ObjectId,
            ref: "SpaceNames",
            required: true
        },
        subCategoryId: {
            type: Schema.Types.ObjectId,
            ref: "SubCategory",
            required: true
        },
        materialId: {
            type: Schema.Types.ObjectId,
            ref: 'MaterialMaster',
            required: true
        },
        scopeId: {
            type: Schema.Types.ObjectId,
            ref: 'ScopeMaster',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unitType: {
            type: Schema.Types.ObjectId,
            ref: 'UnitTypeMaster',
            required: false
        },
    }],
    submittedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: constants.ProjectMaterialStatus.all(),
        default: constants.ProjectMaterialStatus.saved
    }
});

ProjectMaterialSchema.plugin(require('mongoose-timestamp'));
ProjectMaterialSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('ProjectMaterial', ProjectMaterialSchema);