const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ChecklistSchema = new mongoose.Schema({
    checkList: [{
        ids: {
            type: Number
        },
        id: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            require: true
        },
        yes: {
            type: String,
            default: ""
        },
        no: {
            type: String,
            default: ""
        },
        na: {
            type: String,
            default: ""
        }
    }],
    notes: [{
        id: {
            type: String
        },
        value: {
            type: String
        }
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
})
ChecklistSchema.plugin(require('mongoose-timestamp'));
ChecklistSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Checklist = module.exports = mongoose.model('Checklist', ChecklistSchema);