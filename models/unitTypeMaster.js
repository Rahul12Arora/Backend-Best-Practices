const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UnitTypeMasterSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    }
});

UnitTypeMasterSchema.plugin(require('mongoose-timestamp'));
UnitTypeMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('UnitTypeMaster', UnitTypeMasterSchema);


