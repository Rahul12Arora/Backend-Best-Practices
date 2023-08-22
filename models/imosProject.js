const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ImosProjectSchema = new mongoose.Schema({
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
    imosProjectNo: {
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
ImosProjectSchema.plugin(require('mongoose-timestamp'));
ImosProjectSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const ImosProject = module.exports = mongoose.model('ImosProject', ImosProjectSchema);