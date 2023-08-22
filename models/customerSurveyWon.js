'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyWonFormSchema = new mongoose.Schema({
    isVisitedExperienceCenter: {
        type: String,
        required: true
    },
    visitedExperienceCenter: {
        type: String,
        default: ''
    },
    reasonToChooseDecorpot: {
        type: String,
        default: '',
        required: true
    },
    otherReasonToChooseDecorpot: {
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

CustomerSurveyWonFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyWonFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyWonForm = module.exports = mongoose.model('CustomerSurveyWonForm', CustomerSurveyWonFormSchema);
