const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuotationSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        // required: true
    },
    leadId: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    components: [{
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
        projCompId: {
            type: Schema.Types.ObjectId,
            ref: 'ProjectComponent',
            // required: true
        },
        products: [{
            product: {
                type: Schema.Types.ObjectId,
                ref: 'ProductMaster',
                required: true
            },
            pricePerUnit: {
                type: Number
            },
            finishType: {
                type: Schema.Types.ObjectId,
                ref: 'FinishTypeMaster',
                // required: true
            },
            unitType: {
                type: Schema.Types.ObjectId,
                ref: 'UnitTypeMaster',
                required: true
            },
            subUnitType: {
                type: String,
                required: true
            },
            length: {
                type: Number
            },
            width: {
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
                type: Number,
                required: true
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
                type: Number,
                required: false
            },
            code: {
                type: String

            },
            images: [{
                type: Schema.Types.ObjectId,
                ref: 'Image',
            }],
            isCompleted: {
                type: Boolean,
                default: false
            },
            totalPricePerUnit: {
                type: Number
            }
        }]
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eligibleDiscountScopes: {
        type: String,
        required: false
    },
    eligibleNonDiscountScopes: {
        type: String,
        required: false
    },
    discountAmountTotal: {
        type: Number,
        required: false
    },
    totalAmount: {
        type: Number,
        required: true
    },
    miscTotal: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true
    },
    totalDiscPrAmnt: {
        type: Number,
        required: false
    },
    discItemsSubTotal: {
        type: Number,
        required: false
    },
    totalNonDiscPrAmnt: {
        type: Number,
        required: false
    },
    discountOnAllScopes: {
        type: Boolean,
        required: false
    },
    discountPercent: {
        type: Number,
        required: true
    },
    materialProcured: {
        type: Number
    },
    taxPercent: {
        type: Number,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    s3Location: {
        type: String,
        default: ''
    },
    maskedQuotationS3: {
        type: String,
        default: ''
    },
    totalCustomerOutflow: {
        type: Number,
        default: 0
    },
    noOfImages: {
        type: Number,
        default: 0
    }
});

QuotationSchema.plugin(require('mongoose-timestamp'));
QuotationSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Quotation = module.exports = mongoose.model('Quotation', QuotationSchema);

Quotation.findByName = function (name) {
    Quotation.findOne({ name: name });
}

Quotation.findQuoteById = function (id) {
    return Quotation.findById(id)
        .then((quotation) => {
            if (!quotation) return Promise.reject('Quotation not found.');
            return quotation;
        });
}

