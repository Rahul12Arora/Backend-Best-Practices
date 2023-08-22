const express = require('express');
const router = express.Router();
const _ = require('lodash');

const Scope = require('../models/scopeMaster');
const auth = require('../middlewares/authentication');


router.post('/new', auth, (req, res) => {
    let scope = new Scope(_.pick(req.body, ['name', 'eligibleForDiscount', 'description', 'departmentId']));
    scope.save()
        .then(() => {
            res.status(200).json('Scope created successfully.');
        })
        .catch((err) => res.status(500).json(err));
});


router.get('/all', auth, (req, res) => {
    Scope.find()
        .populate('departmentId', 'name')
        .then((scopes) => {
            res.status(200).json(scopes);
        })
        .catch((err) => res.status(500).json(err));
});

router.put('/edit/:id', auth, (req, res) => {
    let _id = req.params.id;
    let update = _.pick(req.body, ['description', 'departmentId', 'eligibleForDiscount']);
    let options = { new: true };
    return Scope.findByIdAndUpdate(_id, update, options)
        .then((scope) => {
            if (scope) res.status(200).json('Successfully edited.');
        })
        .catch((err) => res.status(500).json(err));
})

router.put('/deactivate/:id', auth, (req, res) => {
    Scope.findById(req.params.id)
        .select('isActive')
        .then((scope) => {
            if (scope && scope.isActive) {
                scope.isActive = false;
            } else {
                scope.isActive = true;
            }
            return scope.save();

        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;
