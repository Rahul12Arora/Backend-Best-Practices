const mongoose = require('mongoose');

const DiscountSchema = mongoose.Schema({
    value: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    }
});

DiscountSchema.plugin(require('mongoose-timestamp'));
DiscountSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Discount = module.exports = mongoose.model('Discount', DiscountSchema);