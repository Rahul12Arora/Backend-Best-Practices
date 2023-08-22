const mongoose = require('mongoose')
const Schema = mongoose.Schema

const rateCardMasterSchema = new Schema({

  orgId: {
    type: Schema.Types.ObjectId,
    // ref: "Organisation",
    required: true,
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: "Location"
  },
  markUp: {
    type: Number,
    default: 0
  },
  rateCardCode: {
    type: String,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    // ref: "User",
    required: true
  }
})

rateCardMasterSchema.plugin(require('mongoose-timestamp'), {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});
rateCardMasterSchema.plugin(require('mongoose-delete'), {
  overrideMethods: true,
  deletedAt: true
});


module.exports = mongoose.model('RateCardMaster', rateCardMasterSchema)

