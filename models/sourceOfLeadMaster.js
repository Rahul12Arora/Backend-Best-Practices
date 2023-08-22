const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SourceOfLeadMasterSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});



SourceOfLeadMasterSchema.plugin(require('mongoose-timestamp'), {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});
SourceOfLeadMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('SourceOfLeadMaster', SourceOfLeadMasterSchema);