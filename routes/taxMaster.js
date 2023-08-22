const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authentication');
const Tax = require('../models/taxMaster');

// Create new department
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(400).json('Only admin can create tax master.');
    Tax.findOne({ tax: req.body.tax })
        .then((tax) => {
            if (tax) return res.status(400).json('Tax already exist.');
            tax = new Tax({
                tax: req.body.name,
                description: req.body.description
            });
            return tax.save();
        })
        .then((tax) => {
            res.status(200).send(tax);
        })
        .catch((err) => res.status(400).send(err));
});

// Get all project comp. masters
router.get('/all', auth, (req, res) => {
    Tax.find()
        .then((taxs) => {
            res.status(200).send(taxs);
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a department
router.put('/edit/:id', (req, res) => {
    Tax.findByIdAndUpdate(req.params.id, { $set: { description: req.body.description, tax: req.body.tax } }, { new: true })
        .then((tax) => {
            if (!tax) return res.status(400).json('Not updated.');
            res.status(200).send(tax);
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;

