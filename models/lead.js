'use strict';
const mongoose = require('mongoose');
const constants = require('../constant/constant');
const mongoosePaginate = require('mongoose-paginate-v2');

const LeadSchema = new mongoose.Schema({
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
        enum: constants.isRegistered,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location"
    },
    experienceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    },
    sourceOfLead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SourceOfLeadMaster"
    },
    leadType: {
        type: String,
        enum: constants.leadType,
        required: true
    },
    leadStatus: {
        type: String,
        enum: constants.leadStatus,
        default: "Open"
    },
    currentStage: {
        type: String,
    },
    floorPlanReceivedToDesigner: {
        type: String,
    },
    designerDiscussedQuotationWithClient: {
        type: String,
    },
    designerDiscussedRequirementWithClient: {
        type: String,
    },
    designerAndSalesOwnerMeetingDate: {
        type: Date
    },
    salesStage: {
        type: String,
        enum: constants.salesStages,
        default: "Lead Received"
    },
    executionStage: {
        type: String,
        enum: constants.executionStage
    },
    imosStage: {
        type: String,
        enum: constants.imosStage
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
    contractDesignManagerApproved: {
        type: Boolean,
        default: false
    },
    contractQualityControlApproved: {
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
    designUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    contractRejectReason: {
        type: String
    },
    contactLeadRejectedRole: {
        type: String
    },
    contractLeadRejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    designStages: {
        type: String,
        enum: constants.designStages
    },
    estimatedBudget: {
        type: Number
    },
    status: {
        type: String,
        enum: constants.leadStages,
        required: true
    },
    designStatus: {
        type: String,
        enum: ["Design-Hold", "Design"],
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    previouslyAssignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    designerAssigned: {
        type: Boolean,
        default: false
    },
    designerAssignedDate:
    {
        type: Date
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
    contractSignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
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
    executionCompletionDate: {
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
    workingDrawingFile: {
        type: String
    },
    ThreeDworkingDrawingFile: {
        type: String
    },
    scanQuotationFile: {
        type: String
    },
    scanCheckListFile: {
        type: String
    },
    scanContractFile: {
        type: String
    },
    quotationCsvFile:{
        type: String
    },
    discountRequestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
        enum: constants.projectAction
    },
    discountLogs: [{
        discountValue: {
            type: Number
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        approvalStatus: {
            type: Boolean
        },
        actionTakenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        discountRequestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    salesCheckList: [{
        id: {
            type: String
        },
        sortId: {
            type: Number
        },
        description: {
            type: String
        },
        actionSelected: {
            type: String
        },
        customerAction: {
            type: String,
            default: 'yes'
        }
    }],
    salesExecutiveApproved: [{
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'Approval Not Initiated'
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        approvedDate: {
            type: Date,
            default: Date.now()
        },
    }],
    salesManagerApproved: [{
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'Approval Not Initiated'
        },
        remark: {
            type: String
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        approvedDate: {
            type: Date,
            default: Date.now()
        },
    }],
    finanaceManagerApproved: [{
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'Approval Not Initiated'
        },
        remark: {
            type: String
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        approvedDate: {
            type: Date,
            default: Date.now()
        },
    }],
    customerApproved: [{
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'Approval Not Initiated'
        },
        checkListRemarkByCustomer: {
            type: String
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer"
        },
        approvedDate: {
            type: Date,
            default: Date.now()
        },
    }],
    centerHeadApproved: [{
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'Approval Not Initiated'
        },
        remark: {
            type: String
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        approvedDate: {
            type: Date,
            default: Date.now()
        },
    }],
    businessHeadApproved: [{
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'Approval Not Initiated'
        },
        remark: {
            type: String
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        approvedDate: {
            type: Date,
            default: Date.now()
        },
    }],
    designManagerAssigned: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    tokenPercent: {
        type: Number,
        default: 0
    },
    paymentProofAtachement: {
        type: String
    },

    salesPaymentProofAtachement: {
        type: String
    },
    possessionDate: {
        type: Date
    },
    checkListRemarkBySalesUser: {
        type: String
    },
    backPlySupport: {
        type: String
    },
    contractSignedPaymentReceviedAttachemnt: {
        type: String
    },
    financeReceipt: {
        receiptNumber: {
            type: Number
        },
        s3Location: {
            type: String
        },
        accountName: {
            type: String
        },
        accountThrough: {
            type: String
        },
        onAccountOf: {
            type: String
        },
        paymentDone: {
            type: String
        },
        receiptDate: {
            type: Date,
            default: Date.now()
        },
    },
    salesChecklistPdfFile: {
        type: String
    },
    isERPProjectCreated: {
        type: Boolean,
        default: false
    },
    erpProjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    },
    finalWDFile: {
        type: String
    },
    imosCarpentryFile: {
        type: String
    },
    imosCustomFile: {
        type: String
    },
    imosEdgeBandingFile: {
        type: String
    },
    imosHardwareFile: {
        type: String
    },
    imosPastingListPdf: {
        type: String
    },
    imosPastingListExcel: {
        type: String
    },
    imosSawFile: {
        type: String
    },
    imosMprFile: {
        type: String
    },
    imosJaliFile: {
        type: String
    },
    imosTrackingFile: {
        type: String
    },
    newImosCarpentryFile: {
        type: String
    },
    newImosCustomFile: {
        type: String
    },
    newImosEdgeBandingFile: {
        type: String
    },
    newImosHardwareFile: {
        type: String
    },
    newImosPastingListPdf: {
        type: String
    },
    newImosPastingListExcel: {
        type: String
    },
    newImosSawFile: {
        type: String
    },
    newImosMprFile: {
        type: String
    },
    newImosJaliFile: {
        type: String
    },
    newImosTrackingFile: {
        type: String
    },
    updatedPastingListFile: {
        type: String
    },
    materialReceived: {
        type: Boolean
    },
    salesLeadOwnRole: {
        type: String,
        enum: constants.salesLeadOwnRoles,
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
        // default: Date.now()
    },
    materialDispatchedDate:{
        type: Date,
    },
    termsAndConditionsPdf:{
        type:String,
        default: "https://qt-quotation-tool.s3.amazonaws.com/customername/ContractSign.pdf",
    },
    imosToFactoryDate: {
        type: Date
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
    meetingWithCustomer: {
        meetingType: {
            type: String,
        },
        meetingStage: {
            type: String,
        },
        meetingDate: {
            type: Date,
        },
    },
    salesWonUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    chmUser:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    salesWonManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    designUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    designManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    daysAsPerContractSign:{
        type: Number
    },
    extraDaysDueToClientDependency:{
        type:Number
    },
    designSignOffUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    tenPercentPaid:{
        type: Boolean
    },
    amountReceivedInSales:{
        type: Number
    },
    amountReceivedInDesign:{
        type: Number
    },
    floorPlanAttachment: {
        type: String
    },
    recordingFile: {
        type: String
    },
    salesWonUserName: {
        type: String
    },
    salesWonManagerName: {
        type: String
    },
    teamName: {
        type: String
    },
    designSignOffUserName: {
        type: String
    },
    experienceCenterName: {
        type: String
    },
    cityName: {
        type: String
    },
    assignToName: {
        type: String
    },
    clientDependency:{
        type: String
    },
    factoryBomCompletedUser:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    siteQcCompletedUser:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reinitiateProcess:{
        type: String,
    },
    customerRequriedGst: {
        type: Boolean
    }, 
    customerGstInName: {
        type: String
    },
    customerGstInNumber: {
        type: String
    },
    customerGstShipping: {
        type: String
    },
    dateOfDesignKickOffMeeting:
    {
        type: Date
    },

    designKickOffCustomerFileLinks:
    {
        skpFileLink:
        {
            type: String
        },
        quotationFileLink:
        {
            type: String
        },
        momFileLink:
        {
            type: String
        },
        screenshShotsLinks:
        {
            type: [String]
        },
    },
    isDesignKickOffCustomerApprovedFromDesign:
    {
        type: Boolean,
        default: false
    },
    isDesignKickOffCustomerApprovedFromChm:
    {
        type: Boolean,
        default: false
    },
    chmReasonForDesignKickOffRejection:
    {
        type: String
    },
    designKickOffCustomerActionFromChm:
    {
        type: String,
        default: 'Pending'
    },
});


LeadSchema.plugin(require('mongoose-timestamp'));
LeadSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
LeadSchema.plugin(mongoosePaginate);

const Lead = module.exports = mongoose.model('Lead', LeadSchema);