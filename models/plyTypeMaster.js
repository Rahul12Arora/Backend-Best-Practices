const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlyTypeMasterSchema = new Schema({
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
    isActive: {
        type: Boolean,
        default: true,
        required: true
    },
    defaultPly: {
        type: Boolean,
        default: false,
        // required: true
    },
    defaultPlyFor: [{
        type: Schema.Types.ObjectId,
        ref: "Organisation"
    }]
});

PlyTypeMasterSchema.plugin(require('mongoose-timestamp'));
PlyTypeMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const PlyTypeMaster = module.exports = mongoose.model('PlyTypeMaster', PlyTypeMasterSchema);

