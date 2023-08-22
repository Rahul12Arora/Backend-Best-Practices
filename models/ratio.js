const mongoose = require('mongoose');

const RatioSchema = mongoose.Schema({
    value: {
        type: Number,
        required: true
    },
    team : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    departmentId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    }
    // isActive: {
    //     type: Boolean,
    //     default: true,
    //     required: true
    // }
});

RatioSchema.plugin(require('mongoose-timestamp'));
RatioSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Ratio = module.exports = mongoose.model('Ratio', RatioSchema);