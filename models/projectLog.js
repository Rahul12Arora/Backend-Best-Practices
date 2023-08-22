const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const ProjectLogSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    stage: {
        type: String,
        // required: true
    },
    user: { //equivalent to closedBy
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // s3Location: {
    //     type: String,
    //     default: ''
    // },
    s3Location : [{
        type : String,
        default: ''
    }],
    remark: {
        type: String,
        default: ''
    },
    preSalesCallDate : {
        type : Date
    },
    leadType : {
        type : String
    },
    nextFollowUpDate : {
        type : Date
    },
    salesCallDate : {
        type : Date
    },
    requirements : {
        type : String
    },
    estimatedBudget : {
        type : Number
    },
    salesCallComment : {
        type : String
    },
    quotationSentDate : {
        type : Date
    },
    momQuotationStage : {
        type : String
    },

    negotiationDate : {
        type : Date
    },
    momNegotitationStage : {
        type : String
    },
    siteVisitDate : {
        type : Date
    },
    momMeetingStage : {
        type : String
    },
    momSiteVisitStage : {
        type : String
    },
    closureDate : {
        type : Date
    },
    finalAmount : {
        type : Number
    },
    paymentPlan : {
        type : String
    },
    discount : {
        type : Number
    },
    softCloseInclude : {
        type : Boolean
    },
    falseCeiling : {
        type : String
    },
    finalQuoteAttached : {
        type : Boolean
    },
    clientMoveinDate : {
        type : Date
    },
    dealActivity : {
        type : String
    },
    notes : {
        type : String
    },
    amount : {
        type : Number
    },
    workingDrawingFile : {
        type : String
    },
    reminderDate : {
        type : Date
    },
    taggedUser : [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }]
    // closedBy : {
        
    // }
});

ProjectLogSchema.plugin(require('mongoose-timestamp'));
ProjectLogSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const ProjectLog = module.exports = mongoose.model('ProjectLog', ProjectLogSchema);

