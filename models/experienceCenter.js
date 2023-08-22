const mongoose = require('mongoose');
const Schema = mongoose.Schema

const experienceCenterSchema = Schema({
  name: {
    type: String,
    required: true
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: "Location"

  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: "Organisation"

  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
  },
  lat: {
    type: String,
  },
  long: {
    type: String,
  }
});

experienceCenterSchema.plugin(require('mongoose-timestamp'));
experienceCenterSchema.plugin(require('mongoose-delete'), {
  overrideMethods: true,
  deletedAt: true
});

module.exports = mongoose.model('ExperienceCenter', experienceCenterSchema);
