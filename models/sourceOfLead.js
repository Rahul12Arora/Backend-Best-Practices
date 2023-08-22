const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const constants = require('../constant/constant');

const SourceOfLeadSchema = new Schema({
    sourceId: {
        type: Schema.Types.ObjectId,
        ref: 'SourceOfLeadMaster'
    },
    // budget:{
        value: {
            type: Number
        },
        year: {
            type: Number
        },
        month: {
            type: Number
        },
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Location"
        },
        experienceCenterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExperienceCenter"
        },
        lastEditedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    // }
});



SourceOfLeadSchema.plugin(require('mongoose-timestamp'), {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});
SourceOfLeadSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('SourceOfLead', SourceOfLeadSchema);