const mongoose = require('mongoose')
const Schema = mongoose.Schema

const OrgRateCardSchema = new Schema({
  rateCardMasterId: {
    type: Schema.Types.ObjectId,
    ref: "RateCardMaster",
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
  },
  isActive: {
    type: Boolean,
    default: true,
  },
})

OrgRateCardSchema.plugin(require('mongoose-timestamp'), {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});
OrgRateCardSchema.plugin(require('mongoose-delete'), {
  overrideMethods: true,
  deletedAt: true
});

module.exports = mongoose.model('OrgRateCard', OrgRateCardSchema);
