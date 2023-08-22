const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScopeMasterSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    eligibleForDiscount: {
        type: Boolean,
        required: false,
        default: false
    },
    description: {
        type: String
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    }
});

ScopeMasterSchema.plugin(require('mongoose-timestamp'));
ScopeMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const ScopeMaster = module.exports = mongoose.model('ScopeMaster', ScopeMasterSchema);
