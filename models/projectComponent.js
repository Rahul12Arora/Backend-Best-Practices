const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectComponentSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        // required: true
    },
    leadId: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        // required: true
    },
    // projectComponent: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'ProjectComponentMaster',
    //     required: true
    // },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'SpaceNames',
        required: true
    },
    plyType: {
        type: Schema.Types.ObjectId,
        ref: 'PlyTypeMaster',
        // required: true
    },
    priority: {
        type: String
    },
    products: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'ProductMaster'
        },
        finishType: {
            type: Schema.Types.ObjectId,
            ref: 'FinishTypeMaster',
        },
        unitType: {
            type: Schema.Types.ObjectId,
            ref: 'UnitTypeMaster'
        },
        quantity: {
            type: Number
        },
        moqInSqft: {
            type: Number,
            default: 1
        },
        subUnitType: {
            type: String
        },
        fixingCharge: {
            type: Number
        },
        length: {
            type: Number
        },
        width: {
            type: Number
        },
        depth: {
            type: Number
        },
        area: {
            type: Number,
            required: true
        },
        priority: {
            type: Number,
            // required: true
        },
        productPrice: {
            type: Number
        },
        productCustomPrice: {
            type: Number,
            default: 0
        },
        productCustomArea: {
            type: Number,
            default: 0
        },
        productPricePerUnit: {
            type: Number
        },
        originalProductPrice: {
            type: Number
        },
        totalPricePerUnit: {
            type: Number
        },
        code: {
            type: String
        },
        images: [{
            type: Schema.Types.ObjectId,
            ref: 'Image',
        }],
        isDelete: {
            type: Boolean,
            default: true
        },
        isCompleted: {
            type: Boolean,
            default: false
        }
    }]
});

ProjectComponentSchema.plugin(require('mongoose-timestamp'));
ProjectComponentSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const ProjectComponent = module.exports = mongoose.model('ProjectComponent', ProjectComponentSchema);


ProjectComponent.findByComponent = function (leadId, categoryId) {
    return ProjectComponent.findOne({ $and: [{ categoryId }, { leadId }] })
        .then((component) => {
            if (component) return Promise.reject('Component already exist.');
        });
}


