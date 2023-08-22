const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectTypeMasterSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

ProjectTypeMasterSchema.plugin(require('mongoose-timestamp'));
ProjectTypeMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('ProjectTypeMaster', ProjectTypeMasterSchema);

