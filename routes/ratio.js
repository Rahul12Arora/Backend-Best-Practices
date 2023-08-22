const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const Ratio = require('../models/ratio');
const async = require('async');
const Department = require('../models/department');
const Team = require('../models/team');




router.post('/new', (req, res) => {
    // if (req.user.role != 'Admin') return res.status(400).send('Only admin can create ratio master.');
    // ratio = new Ratio(_.pick(req.body, ['value', 'team']));
    let ratios = req.body;

    async.forEachOf(ratios, function (ratio, key, callback) {
        Ratio.find({ team: ratio.teamId }).exec(function (err, resp) {
            // console.log(resp,"resp");
            if (!resp.length == 0) {
                // console.log("1");
                Ratio.findOneAndUpdate({ team: ratio.teamId }, { $set: { value: ratio.value } }, { new: true }).exec(function (err, resp) {
                    // console.log(resp,"response");
                    callback();
                })
            }
            else {
                // console.log("2");
                ratioObj = new Ratio({
                    value: ratio.value,
                    team: ratio.teamId,
                    departmentId: ratio.departmentId

                })
                ratioObj.save();
                callback();

            }
        })

    }, (err) => {
        // console.log(count,)

        // resolve();
        if (err) return res.status(404).json('ratio is not created');
        return res.status(200).json('ratio created successfully');

    })
    // res.status(200).json(users);




});


router.get('/all', (req, res) => {
    let dept = [];
    let allteam = [];
    Team.find({})
        .select('departmentId name')
        .populate('departmentId', 'name')
        .lean()
        .then((teams) => {
            // console.log(teams, "ooo");
            return new Promise((resolve, reject) => {
                async.forEach(teams, function (team, callback) {
                    Ratio.findOne({ team: team._id }).exec(function (err, resp) {

                        if (resp) {
                            let teamObj = {};
                            teamObj.name = team.name;
                            teamObj._id = team._id;
                            teamObj.department = team.departmentId;
                            teamObj.ratio = resp.value;
                            allteam.push(teamObj);
                            callback();
                        }
                        else {
                            let teamObj = {};
                            teamObj.name = team.name;
                            teamObj._id = team._id;
                            teamObj.department = team.departmentId;
                            teamObj.ratio = 0;
                            allteam.push(teamObj);
                            callback();
                        }
                    })
                }, (err) => {
                    resolve(allteam);

                })
            })
        })
        .then((allteams) => {
            let deptArray = [];
            var resultArray = [];
            let obj = {};
            obj.department = allteams[0].department;
            obj.team = [{ name: allteams[0].name, _id: allteams[0]._id, ratio: allteams[0].ratio }];
            resultArray.push(obj);
            allteams.forEach((arr, i) => {
                if (i !== 0) {
                    let findIndex = resultArray.findIndex((val) => {
                        return allteams[i].department._id === val.department._id;
                    })
                    if (findIndex === -1) {
                        let obj = {};
                        obj.department = allteams[i].department;
                        obj.team = [{ name: allteams[i].name, _id: allteams[i]._id, ratio: allteams[i].ratio }];
                        resultArray.push(obj);
                    }
                    else {
                        resultArray[findIndex].team.push({ name: allteams[i].name, _id: allteams[i]._id, ratio: allteams[i].ratio });
                    }
                };
            })
            return resultArray;
            // return deptArray;

        })
        .then((departments) => {
            if (departments.length == 0) return res.status(200).json('No ratios found');
            res.status(200).json(departments);
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
})


module.exports = router;