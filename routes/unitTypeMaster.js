const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const UnitTypeMaster = require('../models/unitTypeMaster');


// Create Unit Type masters
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can create unit type master');
    unitTypeMaster = new UnitTypeMaster(_.pick(req.body, ['name', 'description']));
    unitTypeMaster.save()
        .then((unit) => {
            res.status(200).send(unit);
        })
        .catch(err => res.status(400).send(err))
});


// Get all Unit Type masters
router.get('/all', auth, (req, res) => {
    UnitTypeMaster.find({})
        .select('name description isActive')
        .then((units) => {
            res.status(200).send(units);
        })
        .catch((err) => res.status(400).send(err));
});


// Deactivate a unitType
router.put('/deactivate/:id', auth, (req, res) => {
    UnitTypeMaster.findById(req.params.id)
        .select('isActive')
        .then((unitType) => {
            if (unitType && unitType.isActive) {
                unitType.isActive = false;
            } else {
                unitType.isActive = true;
            }
            return unitType.save();
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a Unit Type master
router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['name', 'description']);
    let options = { new: true };
    UnitTypeMaster.findByIdAndUpdate(query, update, options)
        .then((unit) => {
            res.status(200).send(unit);
        })
        .catch((err) => res.status(400).send(err));
});


// Delete Unit Type master
router.delete('/remove/:id', auth, (req, res) => {
    UnitTypeMaster.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).send('Unit deleted.');
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;
