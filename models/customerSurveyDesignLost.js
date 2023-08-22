'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSurveyDesignLostFormSchema = new mongoose.Schema({
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
    satisfactionIndexForChm: [{
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
    reasonForNotMovingAhead: {
        type: String
    },
    isChmInvolved: {
        type: String,
        required: true
    },
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

CustomerSurveyDesignLostFormSchema.plugin(require('mongoose-timestamp'));
CustomerSurveyDesignLostFormSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const CustomerSurveyDesignLostForm = module.exports = mongoose.model('CustomerSurveyDesignLostForm', CustomerSurveyDesignLostFormSchema);
