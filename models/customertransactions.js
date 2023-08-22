const mongoose = require('mongoose');

const CustomerTransactionsSchema = mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    paymentImageUrl: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    stage: {
        type: String,
        required: true
    },
    amount:{
        type: String,
        required: true
    },
    finalApprovalStatus: {
        type: String,
        default: 'NA'
    },
    note: {
        type: String
    }
});

CustomerTransactionsSchema.plugin(require('mongoose-timestamp'));
CustomerTransactionsSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const CustomerTransactions = module.exports = mongoose.model('CustomerTransactions', CustomerTransactionsSchema);
