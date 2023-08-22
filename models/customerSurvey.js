'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveySchema = new mongoose.Schema({
    leadId: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
    },
    leadOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    surveyType: {
        type: String
    },
    surveyStatus: {
        type: String,
        enum: ["Sent", "Submitted"]
    }
});

CustomerSurveySchema.plugin(require('mongoose-timestamp'));
CustomerSurveySchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurvey = module.exports = mongoose.model('CustomerSurvey', CustomerSurveySchema);
