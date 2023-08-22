const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const LeadLogSchema = new Schema({
  notes: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  amount: {
    type: Number
  },
  dealActivity: {
    type: String
  },
  reminderDate: {
    type: Date
  },
  s3Location: [{
    type: String,
    default: ''
  }],
  leadId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Lead"
  },
  taggedUser: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
    // required: true
  }],
  stage: {
    type: String,
    // required: true
  },
  preSalesCallDate: {
    type: Date
  },
  leadType: {
    type: String
  },
  nextFollowUpDate: {
    type: Date
  },
  salesCallDate: {
    type: Date
  },
  requirements: {
    type: String
  },
  estimatedBudget: {
    type: Number
  },
  salesCallComment: {
    type: String
  },
  quotationSentDate: {
    type: Date
  },
  momQuotationStage: {
    type: String
  },

  negotiationDate: {
    type: Date
  },
  momNegotitationStage: {
    type: String
  },
  siteVisitDate: {
    type: Date
  },
  momMeetingStage: {
    type: String
  },
  momSiteVisitStage: {
    type: String
  },
  closureDate: {
    type: Date
  },
  softCloseInclude: {
    type: Boolean
  },
  falseCeiling: {
    type: String
  },
  finalQuoteAttached: {
    type: Boolean
  },
  clientMoveinDate: {
    type: Date
  },
  workingDrawingFile: {
    type: String
  }
  // reminderDate: {
  //   type: Date
  // },
})

LeadLogSchema.plugin(require('mongoose-timestamp'));
LeadLogSchema.plugin(require('mongoose-delete'), {
  overrideMethods: true,
  deletedAt: true
});
const LeadLog = module.exports = mongoose.model('LeadLog', LeadLogSchema);