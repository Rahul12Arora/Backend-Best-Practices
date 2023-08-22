const express = require('express');
const router = express.Router();
const _ = require('lodash');

const SourceOfLeadMaster = require('../models/sourceOfLeadMaster');
const auth = require('../middlewares/authentication');

router.post('/new', auth, (req, res) => {
    SourceOfLeadMaster.find({ name: req.body.name })
        .then((source) => {
            // console.log(source);
            if (source.length != 0) {
                return res.status(400).send('Source already exists.');
            }
            return new SourceOfLeadMaster({name: req.body.name}).save();
        })
        .then(() => {
            res.status(200).json("Successfully created");
        })
        .catch((err) => {
            res.status(400).send(err)
        });
})

router.get('/all', auth, (req,res)=>{
    SourceOfLeadMaster.find()
        .then((source)=>{
                return res.status(200).send(source)
            }
        )
        .catch((err)=>{
            return res.status(400).json(err);
        })
})

router.put('/isActive/:id',auth,(req,res)=>{
    SourceOfLeadMaster.findByIdAndUpdate(req.params.id,{$set : { isActive: req.body.isActive}})
        .then(()=>{
            return res.status(200).json("Field updated");
        }
        ).catch((err)=>{
            return res.status(400).json(err);
        })
})

module.exports = router;


