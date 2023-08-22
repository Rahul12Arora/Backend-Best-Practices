const mongoose = require('mongoose');
const Schema = mongoose.Schema

const LocationSchema = Schema({
  name: {
    type: String,
    required: true
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: "Organisation"

  },
  state: {
    type: String
  },
});

LocationSchema.plugin(require('mongoose-timestamp'));
LocationSchema.plugin(require('mongoose-delete'), {
  overrideMethods: true,
  deletedAt: true
});

module.exports = mongoose.model('Location', LocationSchema);
