const mongoose = require('mongoose');

const DepartmentSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    stages: [{
        type: String,
        required: true
    }],
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    teams : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'    }]
});

DepartmentSchema.plugin(require('mongoose-timestamp'));
DepartmentSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const Department = module.exports = mongoose.model('Department', DepartmentSchema);


