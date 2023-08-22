'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TeamSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    manager: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: false
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    assistantManagerUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    locationId: [{
        type: Schema.Types.ObjectId,
        ref: "Location"
    }],
    experienceCenterId: [{
        type: Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

TeamSchema.plugin(require('mongoose-timestamp'));
TeamSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('Team', TeamSchema);
