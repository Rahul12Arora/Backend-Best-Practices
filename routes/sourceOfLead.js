const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');
const constants = require('../constant/constant');
const SourceOfLead = require('../models/sourceOfLead');
const auth = require('../middlewares/authentication');
const SourceOfLeadMaster = require('../models/sourceOfLeadMaster');

router.post('/new', auth, (req, res) => {
    // const SourceOfLead = require('../models/sourceOfLead');
    // let source = new Scope(_.pick(req.body, ['name', 'description', 'departmentId']));
    // let source = new SourceOfLead(_.pick(req.body,['name']));
    SourceOfLead.find({ name: req.body.name })
        .then((source) => {
            if (source.length != 0) return res.status(400).send('Source already exist.');
            source = new SourceOfLead({
                name: req.body.name,
                // departmentId: req.body.departmentId
            });
            return source.save();
        })
        .then(() => {
            res.status(200).json("successfully created");
        })
        .catch((err) => res.status(400).send(err));
})

router.get('/all', auth, (req, res) => {
    // console.log(req.params.year)
    let empArray = [];
    var sentYear;
    if (req.query.year) {
        sentYear = req.query.year
    } else {
        sentYear = new Date().getFullYear();
    }
    SourceOfLeadMaster.find({ isActive: true })
        .select('name').lean()
        .then((sourceMaster) => {
            return sourceMaster;
        })
        .then((srMaster) => {
            let newArr = [];
            return new Promise((resolve, reject) => {
                async.forEach(srMaster, function (src, callback) {
                    SourceOfLead.find({ $and: [{ sourceId: src._id }, { year: sentYear }, { locationId: req.query.location }, { experienceCenterId: req.query.expcenter }] }).lean().populate('sourceId').exec(function (err, response) {
                        let empty = {};
                        empty.name = src.name;
                        empty.sourceid = src._id;
                        empty.budgetArray = [];
                        for (let i = 0; i < 12; i++) {
                            let isExists = response.find(o => o.month == i)
                            if (!isExists) {
                                let empObj = {};
                                empObj.month = i;
                                empObj.value = 'NA';
                                // empObj.name = src.name;
                                // empObj.sourceid = src._id;
                                empty.budgetArray.push(empObj);
                            }
                            else {
                                let empObj = {};
                                empObj.month = i;
                                empObj.value = isExists.value;
                                empObj.year = isExists.year;
                                empObj.lastEditedBy = isExists.lastEditedBy;
                                empObj._id = isExists._id;
                                // empObj.name = src.name;
                                // empObj.sourceId = src._id;
                                // empObj._id = isExists._id;
                                empty.budgetArray.push(empObj);
                            }
                        }
                        empty.total = 0;
                        empty.budgetArray.forEach(ele1 => {
                            if (ele1.value !== 'NA') {
                                empty.total += ele1.value;
                            }
                        })
                        empArray.push(empty);
                        // newArr = [];
                        callback();
                    })

                }, (err) => {
                    resolve();
                })
            })
            // console.log(srMaster,">>>>>>")
            // return new Promise((resolve, reject) => {
            //     async.forEach(srMaster, function (src, callback) {
            //         SourceOfLead.find({ $and: [{ sourceId: src._id }, { year: sentYear }] }).exec(function (err, response) {
            //             // console.log(response,"data aaya");
            //             // src.budgetArray[response[0].month] = response;
            //             if (response.length != 0) {
            //                 console.log("inside if");
            //                 response.forEach((dat) => {
            //                     src.budgetArray[dat.month] = dat;
            //                 })
            //                 empArray.push(src);
            //                 callback();
            //             }
            //             else {
            //                 // console.log("else", response);
            //                 // // console.log(src,"src");
            //                 empArray.push(src);
            //                 // let empObj = {};
            //                 // empObj._id = src._id;
            //                 // empObj.name = src.name;
            //                 // empObj.budgetArray = [];
            //                 // src.budgetArray.forEach(bud => {
            //                 //     if (empArray.find(o => o.month)) {
            //                 //         empObj.budgetArray.push(bud);
            //                 //     }
            //                 // })
            //                 // // empObj.budgetArray = src.budgetArray;
            //                 // // console.log(empArray,"harbar");
            //                 // // console.log(empObj,"obj");
            //                 // empArray.push(empObj);
            //                 // console.log(empArray, "array");
            //                 callback();
            //             }
            //         })
            //     }, (err) => {
            //         resolve();
            //     })
            // })
        })
        .then((emp) => {
            // console.log(emp,"LLLLLLLLL")
            // console.log("pehle", empArray)
            res.status(200).json(empArray);
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send("Error Occured");
        }
        )
})

router.post('/addBudget', auth, (req, res) => {
    let saveYear;
    if (req.body.year == undefined) {
        saveYear = new Date().getFullYear();
    } else {
        saveYear = req.body.year;
    }
    let sourcelead = new SourceOfLead(
        {
            sourceId: req.body.sourceId,
            value: req.body.value,
            month: req.body.month,
            year: saveYear,
            lastEditedBy: req.user,
            experienceCenterId: req.body.experienceCenterId,
            locationId: req.body.locationId
        }
    )
    sourcelead.save().then(
        () => {
            res.status(200).json("Successfully added");
        }
    ).catch(
        (err) => {
            console.log(err);
            res.status(400).send("Error occured")
        }
    );
})

router.put('/edit/:id', auth, (req, res) => {
    // console.log(req.params.id);
    // console.log(req.body.value);
    SourceOfLead.findByIdAndUpdate(req.params.id, { $set: { value: req.body.value } })
        .then((code) => {
            res.status(200).json("Updated");
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
})


module.exports = router;


