const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const SiteBomProjectSchema = new mongoose.Schema({
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    siteBomProjectNo: {
        type: String
    },
    leadId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Lead"
    },
    projectId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Project"
    },
    projectStatus: {
        type: String
    },
    file1: {
        type: String
    },
    stage: {
        type: String
    },
    assignTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team'
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    }, experienceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    },
})
SiteBomProjectSchema.plugin(require('mongoose-timestamp'));
SiteBomProjectSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const SiteBomProject = module.exports = mongoose.model('SiteBomProject', SiteBomProjectSchema);