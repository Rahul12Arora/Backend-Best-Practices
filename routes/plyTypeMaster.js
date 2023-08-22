const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const PlyTypeMaster = require('../models/plyTypeMaster');


// Create ply Type masters
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can create ply master');
    plyTypeMaster = new PlyTypeMaster({
        name: req.body.name,
        description: req.body.description,
        pricePerUnit: req.body.pricePerUnit
    });
    plyTypeMaster.save()
        .then((ply) => {
            res.status(200).send(ply);
        })
        .catch(err => res.status(400).send(err))
});


// Get all ply Type masters
router.get('/all', auth, (req, res) => {
    PlyTypeMaster.find({})
        .select('name description pricePerUnit isActive defaultPly')
        .sort({ 'name': 1 })
        .then((plys) => {
            res.status(200).send(plys);
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a ply Type master
router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['name', 'description','pricePerUnit']);
    let options = { new: true };
    PlyTypeMaster.findByIdAndUpdate(query, update, options)
        .then((ply) => {
            res.status(200).send(ply);
        })
        .catch((err) => res.status(400).send(err));
});


// Deactivate a plyType
router.put('/deactivate/:id', auth, (req, res) => {
    PlyTypeMaster.findById(req.params.id)
        .select('isActive')
        .then((plyType) => {
            if (plyType && plyType.isActive) {
                plyType.isActive = false;
            } else {
                plyType.isActive = true;
            }
            return plyType.save();
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});

router.put('/setDefault/:id', auth, (req, res) => {
    // PlyTypeMaster.findById(req.params.id)
    //     .select('isActive')
    //     .then((plyType) => {
    //         if (plyType && plyType.isActive) {
    //             plyType.isActive = false;
    //         } else {
    //             plyType.isActive = true;
    //         }
    //         return plyType.save();
    //     })
    PlyTypeMaster.updateMany({},{$set : {defaultPly : false}})
        .then((ply)=>{
            return PlyTypeMaster.findByIdAndUpdate(req.params.id,{$set : {defaultPly : true}},{new : true})
        })
        .then((yes) => {
            // console.log(yes);
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


// Delete ply Type master
router.delete('/remove/:id', auth, (req, res) => {
    PlyTypeMaster.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).send('Unit deleted.');
        })
        .catch((err) => res.status(400).send(err));
});




module.exports = router;
