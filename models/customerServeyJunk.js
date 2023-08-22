'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyJunkFormSchema = new mongoose.Schema({
    feedback: {
        type: String,
        required: true
    },
    whenFlatAvailbleForInterior: {
        type: String,
        default: '',
        required: true
    },
    budgetForInteriors: {
        type: String,
        default: '',
        required: true
    },
    conveyedMessage: {
        type: String,
        default: ''
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

CustomerSurveyJunkFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyJunkFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyJunkForm = module.exports = mongoose.model('CustomerSurveyJunkForm', CustomerSurveyJunkFormSchema);
