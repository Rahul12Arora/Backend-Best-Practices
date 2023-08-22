'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('../utils/constants');

const ProjectSchema = new Schema({
    projectNumber: {
        type: String,
        required: true,
        // unique: true
    },
    discountOnAllScopes: {
        type: Boolean,
        required: false,
        default: true
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    stage: {
        type: String,
        default: 'Initial',
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    clientName: {
        type: String,
        required: true
    },
    apartmentName: {
        type: String,
        required: false
    },
    clientAddress: {
        type: String,
        required: false
    },
    contactNumber: {
        type: String,
        required: true,
        unique: true
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location"
    },
    experienceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    },
    leadId: {
        type: Schema.Types.ObjectId,
        ref: "Lead"
    },
    divisionOfProject: {
        type: String,
        required: false
    },
    startDate: {
        type: Date,
        required: false
    },
    expectedDeliveryDate: {
        type: Date,
        required: false
    },
    // price: {
    //     type: Number,
    //     required: true
    // },
    totalPrice: {
        type: Number
    },
    discountPercent: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    customerToProcureInPercent: {
        type: Number,
        default: 0
    },
    customerToProcure: {
        type: Number,
        default: 0
    },
    decorpotScope: {
        type: Number,
        default: 0
    },
    gst: {
        type: Number,
        default: 0
    },
    miscellaneous: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        default: 0
    },
    taxPercent: {
        type: Number,
        default: 0
    },
    customerOutflow: {
        type: Number,
        default: 0
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },
    totalCustomerOutflow: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: constants.ProjectStatus.all(),
        default: constants.ProjectStatus.created
    },
    procurementNumber: {
        type: Number,
        default: 1
    },
    materialTransferNumber: {
        type: Number,
        default: 1
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});


ProjectSchema.plugin(require('mongoose-timestamp'));
ProjectSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});


module.exports = mongoose.model('Project', ProjectSchema);


// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const constants = require('../constant/constant');

// const ProjectSchema = new Schema({
//     project_no: {
//         type: Number,
//         required: true
//     },
//     discountOnAllScopes: {
//         type: Boolean,
//         required: false,
//         default: true
//     },
//     customerId: {
//         type: Schema.Types.ObjectId,
//         ref: 'Customer',
//         required: true
//     },
//     createdBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     projectType: {
//         type: String
//     },
//     estimatedBudget: {
//         type: Number
//     },
//     floorPlan: {
//         type: String
//     },
//     isRegistered: {
//         type: String,
//         enum: constants.isRegistered,
//         required: true
//     },
//     plyType: {
//         type: Schema.Types.ObjectId,
//         ref: 'PlyTypeMaster',
//         required: true,
//     },
//     address: {
//         type: String,
//         required: true
//     },
//     area: {
//         type: Number
//     },
//     propertyType: {
//         type: String,
//         required: true
//     },
//     scopeOfWork: {
//         type: String
//     },
//     remark: {
//         type: String
//     },
//     startInteriors: {
//         type: String,
//         required: true
//     },
//     city: {
//         type: String,
//     },
//     sourceOfLead: {
//         type: Schema.Types.ObjectId,
//         ref: 'SourceOfLeadMaster'
//     },
//     leadType: {
//         type: String,
//         enum: constants.leadType,
//         required: true
//     },
//     status: {
//         type: String,
//         enum: constants.status,
//         default: 'OnGoing'
//     },
//     stage: {
//         type: String,
//         default: 'Lead Received',
//         enum: constants.leadStages,
//         required: true
//     },

//     department: {
//         type: Schema.Types.ObjectId,
//         ref: 'Department',
//         required: true
//     },
//     team: {
//         type: Schema.Types.ObjectId,
//         ref: 'Team',
//         // required: true
//     },
//     assignTo: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     discountPercent: {
//         type: Number,
//         default: 0
//     },
//     taxPercent: {
//         type: Number,
//         default: 0
//     },
//     grandTotal: {
//         type: Number,
//         default: 0,
//         get: v => Math.round(v),
//         set: v => Math.round(v)
//     },
//     isConverted: {
//         type: Boolean,
//         default: false
//     },
//     finalAmountInClosure: {
//         type: Number,
//         default: 0
//     },
//     quotationSentDate: {
//         type: Date
//     },
//     closureDate: {
//         type: Date
//     },
//     contractSignedDate: {
//         type: Date
//     },
//     totalCustomerOutflow: {
//         type: Number,
//         default: 0
//     },
//     materialProcuredPercent: {
//         type: Number
//     },
//     factoryProjectNo: {
//         type: Number,
//         unique: true
//     },
//     supervisors: [{
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//     }],
//     discountApprovalRequest: {
//         type: Boolean,
//         default: false
//     },
//     discountStatus: {
//         type: String,
//         enum: constants.projectAction,
//         // default : false
//     },
//     procurementApprovalRequest: {
//         type: Boolean,
//         default: false
//     },
//     procurementStatus: {
//         type: String,
//         enum: constants.projectAction,
//         // default : false
//     },
//     discountLogs: [{
//         discountValue: {
//             type: Number
//         },
//         user: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true
//         },
//         approvalStatus: {
//             type: Boolean
//         },
//         actionTakenBy: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true
//         },
//         discountRequestedBy: {
//             type: Schema.Types.ObjectId,
//             ref: 'User'
//         }

//     }],
//     customerProcLogs: [{
//         customerProcValue: {
//             type: Number
//         },
//         user: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true
//         },
//         approvalStatus: {
//             type: Boolean
//         },
//         actionTakenBy: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true
//         },
//         procRequestedBy: {
//             type: Schema.Types.ObjectId,
//             ref: 'User'
//         }
//     }],

//     closedBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//         // required: true
//     },
//     contractSignedBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//     },
//     contractSignedValue: {
//         type: Number
//     },
//     discountRequestedBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//     },
//     procRequestedBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//     },
//     modularDeliveryDate: {
//         type: Date
//     },
//     workingDrawingFile: {
//         type: String
//     },
//     projectCompletionDate: {
//         type: Date
//     },
//     expectedContractSign: {
//         type: Date
//     },
//     expectedTenPercent: {
//         type: Date
//     }

// });

// ProjectSchema.plugin(require('mongoose-timestamp'));
// ProjectSchema.plugin(require('mongoose-delete'), {
//     overrideMethods: true,
//     deletedAt: true
// });

// const Project = module.exports = mongoose.model('Project', ProjectSchema);


// Project.findProjectById = function (id) {
//     return Project.findById(id)
//         .then((project) => {
//             if (!project) return Promise.reject('Project not found.');
//             return project;
//         });
// }

