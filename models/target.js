const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const constants = require('../constant/constant');

const TargetSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // budget:{
    value: {
        type: Number
    },
    year: {
        type: Number
    },
    month: {
        type: Number
    },
    lastEditedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
    // }
});



TargetSchema.plugin(require('mongoose-timestamp'), {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});
TargetSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('Target', TargetSchema);