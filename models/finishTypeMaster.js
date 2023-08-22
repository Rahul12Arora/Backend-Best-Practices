const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FinishTypeMasterSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    pricePerUnit: {
        type: Number,
        required: true
    },
    unitId: {
        type: Schema.Types.ObjectId,
        ref: 'UnitTypeMaster',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    }
});

FinishTypeMasterSchema.plugin(require('mongoose-timestamp'));
FinishTypeMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const FinishTypeMaster = module.exports = mongoose.model('FinishTypeMaster', FinishTypeMasterSchema);

