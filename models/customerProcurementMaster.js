const mongoose = require('mongoose');

const CustomerProcuredMaterialSchema = mongoose.Schema({
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

CustomerProcuredMaterialSchema.plugin(require('mongoose-timestamp'));
CustomerProcuredMaterialSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const CustomerProcuredMaterial = module.exports = mongoose.model('CustomerProcuredMaterial', CustomerProcuredMaterialSchema);