'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyLostFormSchema = new mongoose.Schema({
    isVisitedExperienceCenter: {
        type: String,
        required: true
    },
    invitedExperienceCenter: {
        type: String,
        default: ''
    },
    reasonForNotChoosingDecorpot: {
        type: String,
        default: '',
        required: true
    },
    otherReasonForNotChoosingDecorpot: {
        type: String,
        default: 'NA'
    },
    comments: {
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

CustomerSurveyLostFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyLostFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyLostForm = module.exports = mongoose.model('CustomerSurveyLostForm', CustomerSurveyLostFormSchema);
