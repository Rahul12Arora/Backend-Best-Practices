const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const constants = require('../constant/constant');

const SnagSchema = new Schema({
    snagCode: {
        type: String,
        required: true,
        unique: true
    },
    projectNo: {
        type: Number,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    vendor: {
        type: String,
        required: false
    },
    vendorAddress: {
        type: String,
        required: false
    },
    vendorContact: {
        type: Number,
        required: false
    },
    vendorQuotationPresent: {
        type: Boolean,
        required: false
    },
    status: {
        type: String,
        default: 'Open',
        enum: constants.snagStatus
    },
    outsourceType: {
        type: String,
        enum: constants.outsourceType
    },
    scopeId: {
        type: Schema.Types.ObjectId,
        ref: 'ScopeMaster',
        required: true
    },
    materials: [{
        category: {
            type: String
        },
        name: {
            type: String
        },
        description: {
            type: String
        },
        barcode: {
            type: String
        },
        pieceName: {
            type: String
        },
        isAvailableOnSite: {
            type: Boolean
        },
        reasonForChange: {
            type: String,
            enum: constants.reasonForChange
        },
        remark: {
            type: String
        },
        size: {
            type: Number
        },
        length: {
            type: Number
        },
        breadth: {
            type: Number
        },
        thickness: {
            type: Number
        },
        edgeBand1: {
            type: String
        },
        edgeBand2: {
            type: String
        },
        edgeBand3: {
            type: String
        },
        edgeBand4: {
            type: String
        },
        dimension: {
            type: String
        },
        color: {
            type: String
        },
        spacename: {
            type: String
        },
        itemname: {
            type: String
        },
        unitType: {
            type: Schema.Types.ObjectId,
            ref: 'UnitTypeMaster',
            default: '5b9bb794f90d19296cfe572c'//mm
        },
        plyType: {
            type: Schema.Types.ObjectId,
            ref: 'PlyTypeMaster'
        },
        finishType: {
            type: Schema.Types.ObjectId,
            ref: 'FinishTypeMaster'
        },
        quantity: {
            type: Number
        },
        code1: {
            type: String
        },
        code2: {
            type: String
        },
        status: {
            type: String,
            enum: constants.approvalStatus
        },
        expectedDeliveryDate: {
            type: Date
        },
        deliveryDate: {
            type: Date,
            required: function () { return this.isDelivered }
        },
        isDelivered: {
            type: Boolean,
            default: false,
            required: true
        },
        assignTo: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        logs: [{
            date: {
                type: Date
            },
            status: {
                type: String,
                enum: constants.approvalStatus
            },
            comment: {
                type: String
            },
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            attachmentLink: {
                type: String
            }
        }]
    }],
    components: [{
        projectComponentId: {
            type: Schema.Types.ObjectId,
            ref: 'ProjectComponentMaster'
        },
        items: [{
            itemId: {
                type: Schema.Types.ObjectId,
                ref: 'ProductMaster'
            },
            item: {
                type: String
            },
            itemVendorName: {
                type: String,
                required: [function () { return this.status == 'Approved' }, 'Vendor name is required']
            },
            itemVendorContact: {
                type: String,
                required: [function () { return this.status == 'Approved' }, 'Vendor contact is required']
            },
            itemVendorPrice: {
                type: Number,
                required: [function () { return this.status == 'Approved' }, 'Vendor price is required']
            },
            itemDecorpotPrice: {
                type: Number,
                required: [function () { return this.status == 'Approved' }, 'Decorpot price is required']
            },
            area: {
                type: Number
            },
            rate: {
                type: Number
            },
            remark: {
                type: String
            },
            status: {
                type: String,
                enum: constants.approvalStatus
            },
            expectedDeliveryDate: {
                type: Date
            },
            deliveryDate: {
                type: Date
            },
            isDelivered: {
                type: Boolean,
                default: false,
                required: true
            },
            assignTo: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            lowMarginReason: {
                type: String
            },
            poAttachment: {
                type: String
            },
            logs: [{
                date: {
                    type: Date
                },
                status: {
                    type: String,
                    enum: constants.approvalStatus
                },
                comment: {
                    type: String
                },
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User'
                },
                attachmentLink: {
                    type: String
                }


            }]
        }]
    }],
    vendorPrice: {
        type: Number
    },
    decorpotPrice: {
        type: Number
    },
    supervisorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itemDependency: {
        type: Boolean,
        required: true
    }
});


// ProcurementSchema.index({ 'sendForApproval.expireAt': 1 }, {
//     expireAfterSeconds: 30,
//     partialFilterExpression: {
//         isApprove: { $eq: false }
//     }
// });

SnagSchema.plugin(require('mongoose-timestamp'), {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});
SnagSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Snag = module.exports = mongoose.model('Snag', SnagSchema);
