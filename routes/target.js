const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');
const constants = require('../constant/constant');
const auth = require('../middlewares/authentication');
const Target = require('../models/target');
const User = require('../models/user');

router.post('/new', auth, (req, res) => {
    let target = new Target(_.pick(req.body, ['userId', 'value', 'year', 'month']));
    target.save()
        .then(() => {
            res.status(200).json("successfully created");
        })
        .catch((err) => res.status(400).send(err));
})


router.put('/edit/:id', auth, (req, res) => {
    // console.log(req.params.id);
    // console.log(req.body.value);
    Target.findByIdAndUpdate(req.params.id, { $set: { value: req.body.value } })
        .then((code) => {
            // console.log(code, "code data");
            res.status(200).json("Updated");
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
})



router.put('/query', (req, res) => {
    User.find({ isActive: true }).select('_id')
        .then((users) => {
            return new Promise((resolve, reject) => {
                async.forEach(users, function (user, callback) {
                    target = new Target({
                        userId: user._id,
                        value: 0,
                        year: 2019,
                        month: 9
                    });
                    target.save(function (err, response) {
                        callback();
                    });
                }, (err) => {
                    console.log("done");
                })
            })
        })
})

router.get('/all', auth, (req, res) => {
    // console.log(req.params.year)
    let empArray = [];
    let sentYear;
    if (req.query.year) {
        sentYear = req.query.year
    } else {
        sentYear = new Date().getFullYear();
    }
    User.find({ $and: [{ isActive: true }, { teamId: req.query.teamId }]})
        .select('name')
        .populate('roles', 'name').lean().sort({name: 1})
        .then((users) => {
            return users;
        })
        .then((users) => {
            let newArr = [];
            return new Promise((resolve, reject) => {
                async.forEach(users, function (user, callback) {
                    Target.find({ $and: [{ userId: user._id }, { year: sentYear }] }).lean().populate('userId').exec(function (err, response) {
                        let empty = {};
                        empty.name = user.name;
                        empty.userId = user._id;
                        empty.customerole = user.roles.find(role => role.name === 'Sales Manager' || role.name === 'Design Manager' || role.name === 'Marketing Manager') ? 'Manager' : 'User';
                        empty.budgetArray = [];
                        empty.total = 0;
                        for (let i = 0; i < 12; i++) {
                            let isExists = response.find(o => o.month == i)
                            if (!isExists) {
                                let empObj = {};
                                empObj.month = i;
                                empObj.value = 'NA';
                                // empObj.name = user.name;
                                // empObj.sourceid = user._id;
                                empty.budgetArray.push(empObj);
                            }
                            else {
                                let empObj = {};    
                                empObj.month = i;
                                empObj.value = isExists.value;
                                empObj.year = isExists.year;
                                empObj.lastEditedBy = isExists.lastEditedBy;
                                empObj._id = isExists._id;
                                // empObj.name = user.name;
                                // empObj.sourceId = user._id;
                                // empObj._id = isExists._id;
                                empty.total += isExists.value;
                                empty.budgetArray.push(empObj);
                            }
                        }
                        empArray.push(empty);
                        // newArr = [];
                        callback();
                    })

                }, (err) => {
                    resolve();
                })
            })
        })
        .then((emp) => {
            // console.log(emp,"LLLLLLLLL")
            // console.log("pehle", empArray)
            res.status(200).json(empArray);
        })
        .catch((err) => {
            console.log(err, "err");
            res.status(400).send("No data found");
        }
        )
})

module.exports = router;
