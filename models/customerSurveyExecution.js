'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyExecutionFormSchema = new mongoose.Schema({
    howSatisfiedWithExecutionAndDelivery: {
        type: String,
        required: true
    },
    // comments: {
    //     type: String,
    //     default: '',
    //     required: true
    // },
    howSatisfiedWithExecutionTeam: {
        type: String,
        default: '',
        required: true
    },
    feedbackForSpecificVendor: {
        type: String,
        default: 'NA',
        required: true
    },
    additionalFeedback: {
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
    },
    chmId: {
        type: Schema.Types.ObjectId,
        ref: 'ChmLeads'
    }
});

CustomerSurveyExecutionFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyExecutionFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyExecutionForm = module.exports = mongoose.model('CustomerSurveyExecutionForm', CustomerSurveyExecutionFormSchema);
