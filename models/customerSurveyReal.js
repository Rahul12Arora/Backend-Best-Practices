'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyRealFormSchema = new mongoose.Schema({
    feedback: {
        type: String,
        required: true
    },
    howSatisfiedWithInteraction: {
        type: String,
        default: '',
        required: true
    },
    satisfactionIndexRatio: [{
        id: {
            type: String
        },
        sortId: {
            type: Number
        },
        description: {
            type: String
        },
        actionSelected: {
            type: String
        }
    }],
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
    }
});

CustomerSurveyRealFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyRealFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyRealForm = module.exports = mongoose.model('CustomerSurveyRealForm', CustomerSurveyRealFormSchema);
