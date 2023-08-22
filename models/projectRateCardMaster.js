"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectRCMasterSchema = new Schema({
  leadId: {
    type: Schema.Types.ObjectId,
    ref: "Lead",
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project",
  },
  rateCardId: {
    type: Schema.Types.ObjectId,
    ref: "RateCardMaster",
    required: true,
  },
  markUp: {
    type: Number,
    required: true,
    default: 0
  },
  projectRateCardCode: {
    type: String,
    required: true,
  },
});


ProjectRCMasterSchema.plugin(require("mongoose-timestamp"));
ProjectRCMasterSchema.plugin(require("mongoose-delete"), {
  overrideMethods: true,
  deletedAt: true,
});

module.exports = mongoose.model("ProjectRateCardMaster", ProjectRCMasterSchema);
