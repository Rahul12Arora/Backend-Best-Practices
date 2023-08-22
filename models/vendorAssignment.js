'use strict';
const mongoose = require('mongoose');

const vendorAssignmentSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    status: {
        type: String,
    },
    assignTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    experienceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    },
});

vendorAssignmentSchema.plugin(require('mongoose-timestamp'));
vendorAssignmentSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const vendorAssignmentLeads = module.exports = mongoose.model('vendorAssignmentLeads', vendorAssignmentSchema);
