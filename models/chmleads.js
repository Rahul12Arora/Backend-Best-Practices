'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CHMSchema = new mongoose.Schema({
    leadId: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
    },
    assignTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team'
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },
    experienceCenterId: {
        type: Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    },
});

CHMSchema.plugin(require('mongoose-timestamp'));
CHMSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const ChmLeads = module.exports = mongoose.model('ChmLeads', CHMSchema);
