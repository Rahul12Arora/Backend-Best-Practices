'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyDesignFormSchema = new mongoose.Schema({
    isDesignManagerInvolved: {
        type: String,
        required: true
    },
    feedback: {
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
    satisfactionIndexForDesignManager: [{
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
    chmId:{
        type: Schema.Types.ObjectId,
        ref: 'ChmLeads'
    }
});

CustomerSurveyDesignFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyDesignFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyDesignForm = module.exports = mongoose.model('CustomerSurveyDesignForm', CustomerSurveyDesignFormSchema);
