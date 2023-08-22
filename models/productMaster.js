const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductMasterSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true
        // required: true,
        // unique: true
    },
    description: {
        type: String,
        required: true
    },
    pricePerUnit: {
        type: Number,
        required: false
    },
    fixingPrice: {
        type: Number,
        required: false
    },
    moqInSqft: {
        type: Number,
        default: 1
    },
    unitId: {
        type: Schema.Types.ObjectId,
        ref: 'UnitTypeMaster',
        required: true
    },
    subUnitType: {
        type: String,
        required: true
    },
    priority: {
        type: Number,
        // required: true
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    plyInclude: {
        type: Boolean,
        default: false,
        required: true
    },
    finishInclude: {
        type: Boolean,
        default: false,
        required: true
    },
    scopeId: {
        type: Schema.Types.ObjectId,
        ref: 'ScopeMaster'
    },
    depth: {
        type: Number,
        default: 1,
        // required: true
    },
    newpricePerUnit: {
        type: Number
    }
});

ProductMasterSchema.plugin(require('mongoose-timestamp'));
ProductMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const ProductMaster = module.exports = mongoose.model('ProductMaster', ProductMasterSchema);


ProductMaster.findProductMaster = function (name, code) {
    return ProductMaster.findOne({ $and: [{ name: name }, { code: code }] })
        .then((product) => {
            if (product) return Promise.reject('Product already exist.');
        });
}

ProductMaster.findProjectMasterById = function (id) {
    return ProductMaster.findById(id)
        .then((product) => {
            if (!product) return Promise.reject('Product not found.')
        });
}