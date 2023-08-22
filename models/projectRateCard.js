const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProjectRateCardSchema = new Schema({
  projectRCMasterId: {
    type: Schema.Types.ObjectId,
    ref: "ProjectRCMaster",
    required: true,
  },
  itemId: {
    type: Schema.Types.ObjectId,
    refPath: "docType",
    required: true,
  },
  docType: {
    type: String,
    default: "ProductMaster",
    enum: ["ProductMaster", "PlyTypeMaster", "FinishTypeMaster"],
    required: true
  },
  rate: {
    type: Number,
    required: true,
  }
});


ProjectRateCardSchema.plugin(require("mongoose-timestamp"));
ProjectRateCardSchema.plugin(require("mongoose-delete"), {
  overrideMethods: true,
  deletedAt: true,
});

module.exports = mongoose.model("ProjectRateCard", ProjectRateCardSchema);
