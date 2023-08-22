const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');

const auth = require('../middlewares/authentication');
const ScopeStage = require('../models/scopeStage');

router.post('/new', auth, (req, res) => {
    async.each(req.body.stages, (element, callback) => {
        let newStage = new ScopeStage();
        newStage.scopeId = req.body.scopeId;
        newStage.stage = element.stage;
        newStage.users = element.users;
        newStage.save();
        callback();
    }, (err) => {
        if (err) {
            console.log(err);
            res.status(500).json('Error occurred');
        } else {
            res.status(200).json('Saved successfully.');
        }
    })
});


router.get('/all', auth, (req, res) => {
    ScopeStage.find()
        .populate('scopeId', 'name')
        .populate('users', 'name')
        .then((stages) => {
            if (stages.length == 0) return res.status(400).json('No stages found');
            let responseData = [];
            let obj = {
                scopeName: '',
                stages: []
            };
            stages.forEach(element => {
                let isExist = responseData.find(ele => ele.scopeName == element.scopeId.name);
                if (!isExist) {
                    obj.scopeName = element.scopeId.name;
                    obj.stages.push({ stage: element.stage, users: element.users });
                    responseData.push(obj);
                } else {
                    isExist.stages.push({ stageId: element._id, stage: element.stage, users: element.users });
                }
            })
            res.status(200).send(responseData);
        })
        .catch(err => {
            console.log(err);
            res.status(400).send(err);
        });
});


// Get a scope stages
router.get('/getStages/:scopeId', auth, (req, res) => {
    ScopeStage.find({ scopeId: req.params.scopeId })
        .populate('scopeId', 'name')
        .populate('users', 'name')
        .select('scopeId stage users')
        .lean()
        .then((stages) => {
            if (stages.length == 0) return res.status(400).json('No stages found');
            let obj = {
                scopeName: '',
                stages: []
            };
            obj._id = stages[0].scopeId._id;
            obj.scopeName = stages[0].scopeId.name;
            stages.forEach(element => {
                obj.stages.push({ stageId: element._id, stage: element.stage, users: element.users });
            })
            res.status(200).send(obj);
        })
        .catch(err => res.status(400).send(err));
});


// Edit stages
router.put('/edit/:scopeId', auth, (req, res) => {
    let query = { $and: [{ _id: req.body.stageId }, { scopeId: req.params.scopeId }] };
    let update = {};
    if (req.body.stage) {
        update.stage = req.body.stage;
    }
    if (req.body.users && req.body.users.length != 0) {
        update.users = req.body.users;
    }
    let options = { new: true };
    ScopeStage.findOneAndUpdate(query, update, options)
        .then((stages) => {
            if (!stages) return res.status(404).json('Can not update.');
            res.status(200).send(stages);
        })
        .catch(err => res.status(400).send(err));
});


router.delete('/remove/:stageId', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(401).json('Only admin can delete stage!!!');
    ScopeStage.findByIdAndDelete(req.params.stageId)
        .then(() => {
            res.status(200).json('Deleted successsfully.');
        })
        .catch(err => {
            console.log(err);
            res.status(500).json('Something went wrong.');
        });
})


module.exports = router;
