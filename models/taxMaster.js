const mongoose = require('mongoose');

const TaxSchema = mongoose.Schema({
    tax: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

TaxSchema.plugin(require('mongoose-timestamp'));
TaxSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Tax = module.exports = mongoose.model('Tax', TaxSchema);


