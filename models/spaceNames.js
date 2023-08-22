'use strict';

const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SpaceNameSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'MaterialMaster',
    required: true
  }],
  priority: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  }
})

SpaceNameSchema.plugin(require('mongoose-timestamp'));
SpaceNameSchema.plugin(require('mongoose-delete'), {
  overrideMethods: true,
  deletedAt: true
});

module.exports = mongoose.model('SpaceNames', SpaceNameSchema);
