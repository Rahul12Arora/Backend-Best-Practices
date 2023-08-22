'use strict';
const mongoose = require('mongoose');
const constants = require('../constant/constant');
const mongoosePaginate = require('mongoose-paginate-v2');

const MetaLeadSchema = new mongoose.Schema({
    projectType: {
        type: String
    },
    discountOnAllScopes: {
        type: Boolean,
        required: false,
        default: true
    },
    lead_no: {
        type: Number,
    },
    isRegistered: {
        type: String,
        required: false
    },
    floorPlan: {
        type: String
    },
    address: {
        type: String,
    },
    area: {
        type: String
    },
    propertyType: {
        type: String
    },
    remark: {
        type: String
    },
    scopeOfWork: {
        type: String
    },
    startInteriors: {
        type: String,
        required: false
    },
    city: {
        type: String
    },
    experienceCenterId: {
        type: String
    },
    leadType: {
        type: String,
    },
    leadStatus: {
        type: String,
        default: "Open"
    },
    salesStage: {
        type: String,
        default: "Lead Received"
    },
    executionStage: {
        type: String,
        default: "Working Drawning Received"
    },
    imosStage: {
        type: String,
        default: "Assign To IMOS User"
    },
    factoryStage: {
        type: String
    },
    readyToDispatchDate: {
        type: Date
    },
    contractFinanceApproved: {
        type: Boolean,
        default: false
    },
    contractDesignApproved: {
        type: Boolean,
        default: false
    },
    contractDesignManagerApproved: {
        type: Boolean,
        default: false
    },
    contractFinalMarkingApproved: {
        type: Boolean,
        default: false
    },
    contractQualityControlApproved: {
        type: Boolean,
        default: false
    },
    contractOperationApproved: {
        type: Boolean,
        default: false
    },
    contractCustomerApproved: {
        type: Boolean,
        default: false
    },
    designToExecutionLogsStatus: {
        type: String,
        default: 'Initial'
    },
    contractRejectReason: {
        type: String
    },
    contractLeadRejectedBy: {
        type: String
    },
    designStages: {
        type: String
    },
    estimatedBudget: {
        type: Number
    },
    status: {
        type: String,
    },
    designStatus: {
        type: String,
    },
    designHoldReason: {
        type: String
    },
    proposedDesignStartDate: {
        type: Date
    },
    expectedDesignSignOffDate: {
        type: Date
    },
    assignTo: {
        type: String
    },
    previouslyAssignedTo: [],
    teamId: {
        type: String
    },
    departmentId: {
        type: String
    },
    customerId: {
        type: String
    },
    createdBy: {
        type: String
    },
    designerAssigned: {
        type: Boolean,
        default: false
    },
    designHeadAssigned: {
        type: Boolean,
        default: false
    },
    approvalDone: {
        type: Boolean,
        default: false
    },
    paymentDone: {
        type: Number,
        default: 0
    },
    customerAccepted: {
        type: Boolean,
        default: false
    },
    contractSignedValue: {
        type: Number
    },
    finalAmountInClosure: {
        type: Number,
        default: 0
    },
    quotationSentDate: {
        type: Date
    },
    projectCompletionDate: {
        type: Date
    },
    designSignOffDate: {
        type: Date
    },
    closureDate: {
        type: Date
    },
    clientMoveinDate: {
        type: Date
    },
    leadWonDate: {
        type: Date
    },
    salesWonUser: {
        type: String
    },
    salesWonManager: {
        type: String
    },
    salesWonTeam: {
        type: String
    },
    grandTotal: {
        type: Number,
        default: 0,
        get: v => Math.round(v),
        set: v => Math.round(v)
    },
    discountPercent: {
        type: Number,
        default: 0
    },
    taxPercent: {
        type: Number,
        default: 0
    },
    totalCustomerOutflow: {
        type: Number
    },
    materialProcuredPercent: {
        type: Number
    },
    discountApprovalRequest: {
        type: Boolean,
        default: false
    },
    discountStatus: {
        type: String,
        // enum: constants.projectAction
    },
    designManagerAssigned: {
        type: String
    },
    tokenPercent: {
        type: Number,
        default: 0
    },
    possessionDate: {
        type: Date
    },
    isERPProjectCreated: {
        type: Boolean,
        default: false
    },
    materialReceivedPercentage: {
        type: Boolean
    },
    salesLeadOwnRole: {
        type: String,
        default: 'NA'
    },
    reasonForLost:{
        type:String,
    },
    finalPaymentApprovalRequestStatus: {
        type: String,
        default: 'NA'
    },
    customerDesignSignOffDate:{
        type: Date,
        default: Date.now()
    },
    materialDispatchedDate:{
        type: Date,
    },
    erpProjectNo: {
        type: String,
        unique: true
    },
    salesMeetingDone: {
        type: Boolean,
        required: false,
        default: false
    },
});


MetaLeadSchema.plugin(require('mongoose-timestamp'));
MetaLeadSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
MetaLeadSchema.plugin(mongoosePaginate);

const MetaLead = module.exports = mongoose.model('MetaLead', MetaLeadSchema);