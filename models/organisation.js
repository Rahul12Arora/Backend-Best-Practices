const mongoose = require('mongoose');

const OrganisationSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    procurementNumber: {
        type: Number,
        default: 1
    },
    serviceOrderNumber: {
        type: Number,
        default: 1
    },
    materialTransferNumber: {
        type: Number,
        default: 1
    }
});

OrganisationSchema.plugin(require('mongoose-timestamp'));
OrganisationSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('Organisation', OrganisationSchema);
