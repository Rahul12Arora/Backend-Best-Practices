const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const FinishTypeMaster = require('../models/finishTypeMaster');

// Create project comp. masters
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can create finish type master');
    finishTypeMaster = new FinishTypeMaster({
        name: req.body.name,
        description: req.body.description,
        pricePerUnit: req.body.pricePerUnit,
        unit: req.body.unit
    });
    finishTypeMaster.save()
        .then((finishType) => {
            res.status(200).send(finishType);
        })
        .catch(err => res.status(400).send(err))
});


// Get all project comp. masters
router.get('/all', auth, (req, res) => {
    FinishTypeMaster.find({})
        .select('name pricePerUnit description isActive')
        .populate('unit', 'name')
        .then((finishTypes) => {
            res.status(200).send(finishTypes);
        })
        .catch((err) => res.status(400).send(err));
});


router.get('/:id', auth, (req, res) => {
    FinishTypeMaster.findOne({})
        .select('name pricePerUnit isActive')
        .populate('unit', 'name')
        .then((finishType) => {
            res.status(200).send(finishType);
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a product master
router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['name', 'pricePerUnit', 'description', 'unit', 'isActive']);
    let options = { new: true };
    FinishTypeMaster.findByIdAndUpdate(query, update, options)
        .then((finishType) => {
            res.status(200).send(finishType);
        })
        .catch((err) => res.status(400).send(err));
});


// Deactivate a finishType
router.put('/deactivate/:id', auth, (req, res) => {
    FinishTypeMaster.findById(req.params.id)
        .select('isActive')
        .then((finishType) => {
            if (finishType && finishType.isActive) {
                finishType.isActive = false;
            } else {
                finishType.isActive = true;
            }
            return finishType.save();
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


// Delete product master
router.delete('/remove/:id', auth, (req, res) => {
    FinishTypeMaster.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).json({
                success: true,
                msg: 'Item deleted.'
            });
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;