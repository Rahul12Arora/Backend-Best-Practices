const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const ProjectTypeMaster = require('../models/projectTypeMaster');


// Create Unit Type masters
router.post('/new', auth, (req, res) => {
    projectTypeMaster = new ProjectTypeMaster(_.pick(req.body, ['name', 'description']));
    projectTypeMaster.save()
        .then((type) => {
            res.status(200).send(type);
        })
        .catch(err => res.status(400).send(err))
});


// Get all Unit Type masters
router.get('/all', auth, (req, res) => {
    ProjectTypeMaster.find({})
        .select('name description')
        .then((types) => {
            res.status(200).send(types);
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a Unit Type master
router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['name', 'description']);
    let options = { new: true };
    ProjectTypeMaster.findByIdAndUpdate(query, update, options)
        .then((type) => {
            res.status(200).send(type);
        })
        .catch((err) => res.status(400).send(err));
});


// Delete Unit Type master
router.delete('/remove/:id', auth, (req, res) => {
    ProjectTypeMaster.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).send('Unit deleted.');
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;
