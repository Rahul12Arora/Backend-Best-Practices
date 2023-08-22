const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const constants = require('../constant/constant');

const ScopeStageSchema = new Schema({
    scopeId: {
        type: Schema.Types.ObjectId,
        ref: 'ScopeMaster',
        required: true
    },
    stage: {
        type: String,
        // enum: constants.approvalStatus
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
});


ScopeStageSchema.plugin(require('mongoose-timestamp'), {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});
ScopeStageSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('ScopeStage', ScopeStageSchema);
