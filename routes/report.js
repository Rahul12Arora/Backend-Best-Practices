const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');


const auth = require('../middlewares/authentication');
const User = require('../models/user');
const Customer = require('../models/customer');
const Department = require('../models/department');
const Project = require('../models/project');
const Team = require('../models/team');
const usersService = require('../services/users.service');
const Snag = require('../models/snag');
const ProductMaster = require('../models/productMaster');
const Lead = require('../models/lead');
const ProjectComponent = require('../models/projectComponent');
const Quotation = require('../models/quotation');
const filterService = require('../services/filter.service');
const ProjectLog = require('../models/projectLog');
const reportService = require('../services/report.service');

const PlyTypeMaster = require('../models/plyTypeMaster');
const SourceOfLead = require('../models/sourceOfLead');




router.get('/marketingOverview', auth, (req, res) => {
    let date = new Date();
    let responseObj = {};
    // let currentMonth = new Date(date.getFullYear(), date.getMonth(), 1); // need to uncomment
    let currentMonth = new Date(date.getFullYear(), date.getMonth()-1, 1);
    let currentYear = date.getFullYear();
    let currMonth = date.getMonth()-1;
    let responseArray = [];
    // Project.find({ createdAt: { $gte: currentMonth } }).count()
    Project.find({ createdAt: { $gte: currentMonth } })
    // Project.find({ }).select('_id')
        .then((cnt) => {
            let projIds = [];
            // console.log(cnt);
            if(cnt.length!=0) {
                cnt.forEach(cn=>{
                    projIds.push(cn._id);
                })
            }
            let resobj = {};
            // resobj.totalLeads = cnt.length;
            resobj.name = 'totalLeads';
            resobj.projects = projIds;
            resobj.count = cnt.length;
            responseArray.push(resobj);
            // console.log(responseArray);
            return Project.find({ $and: [{ createdAt: { $gte: currentMonth } }, { leadType: 'Real' }] });
        })
        .then((realCount) => {
            let projIds = [];
            // console.log(realCount);
            if(realCount.length!=0) {
                realCount.forEach(real=>{
                    projIds.push(real._id);
                })
            }
            let resobj = {};
            // resobj.totalLeads = cnt.length;
            resobj.name = 'realCount';
            resobj.projects = projIds;
            resobj.count = realCount.length;
            responseArray.push(resobj);
            // console.log(responseArray);

            // responseObj.realCount = realCount;
            return SourceOfLead.aggregate([
                { $match: { $and: [{ year: currentYear }, { month: currMonth }] } },
                { $group: { _id: null, totalSum: { $sum: '$value' } } }
            ]);
        })
        .then((totalSum) => {
            // console.log(totalSum,">")
            let cplObj = {};
            cplObj.name = 'cpl';
            // let cpl = 0;
            cplObj.count = 0;
            let totalVal = responseArray.find(o=>o.name =='totalLeads');
            // if (responseObj.totalLeads != 0 && totalSum.length > 0) {
            if (totalVal.count != 0 && totalSum.length > 0) {
                cplObj.count = parseFloat(totalSum[0].totalSum / totalVal.count);
            }
            // responseObj.cpl = cpl;
            responseArray.push(cplObj);
            let monthlyobj = {};
            monthlyobj.name = 'monthlySpent';
            if (totalSum.length > 0) {
                monthlyobj.count = totalSum[0].totalSum;
            } else {
                monthlyobj.count = 0;
            }
            responseArray.push(monthlyobj);
            let totalreal = responseArray.find(o=>o.name =='realCount');
            let relevancyobj = {};
            relevancyobj.name = 'relevancy';
            relevancyobj.count =0;
            if (totalVal.count != 0) {
                relevancyobj.count = parseInt((totalreal.count / totalVal.count) * 100);
            } else {
                relevancyobj.count = 0;
            }
            responseArray.push(relevancyobj);
            res.status(200).json(responseArray);

        })
        .catch((err) => {
            // console.log(err);
            res.json(err.message);
        })

})

let d = async (year) => {
    // console.log(year);
    let responseArray = [];
    for (let i = 1; i <= 12; i++) {
        let currentMonth = new Date(year, i - 1, 1);
        let nextMonth = new Date(year, i, 1);
        let currMonthValue = i - 1;
        let currentYear = year;
        // console.log(reportService.getMarketingReport(currentMonth,nextMonth,currMonthValue,currentYear));
        await reportService.getMarketingReport(currentMonth, nextMonth, currMonthValue, currentYear)
            .then((rep) => {
                if (rep) {
                    // console.log(rep,"rep");
                    // rep.monthVal = i-1;
                    responseArray.push(rep);
                } else {
                    let empArray = [];
                    responseArray.push(empArray);
                }
            })
    }
    return responseArray;
}

router.get('/marketingDetails', auth, async (req, res) => {
    let year = 0;
    let date = new Date();
    if (req.query.year) {
        year = req.query.year;
    } else {
        year = date.getFullYear();
    }
    let responseArray = [];
    let data = await d(year)
    // console.log(data, "array");
    if (data.length == 0) return res.status(400).json('No data found.')
    else {
        res.status(200).send(data);
    }
})


router.get('/marketingSales', (req, res) => {
    let date = new Date();
    let currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    reportService.marketingSales(currentMonth)
        .then((report) => {
            // console.log(report);
            res.status(200).json(report);
        })
        .catch((err) => {
            // console.log(err);
            res.status(400).json("No data found");
        })
})

let msd = async (year) => {
    // console.log(year);
    let responseArray = [];
    for (let i = 1; i <= 12; i++) {
        let currentMonth = new Date(year, i - 1, 1);
        let nextMonth = new Date(year, i, 1);
        let currMonthValue = i - 1;
        // let currentYear = year;
        // console.log(reportService.getMarketingReport(currentMonth,nextMonth,currMonthValue,currentYear));
        await reportService.marketingSales(currentMonth, nextMonth)
            .then((rep) => {
                if (rep) {
                    // console.log(rep,"rep");
                    // rep.monthVal = i-1;
                    responseArray.push(rep);
                } else {
                    let empArray = [];
                    responseArray.push(empArray);
                }
            })
    }
    return responseArray;
}

router.get('/marketingSalesDetails', auth, async (req, res) => {
    let year = 0;
    let date = new Date();
    if (req.query.year) {
        year = req.query.year;
    } else {
        year = date.getFullYear();
    }
    let responseArray = [];
    let data = await msd(year)
    // console.log(data, "array");
    if (data.length == 0) return res.status(400).json('No data found.')
    else {
        res.status(200).send(data);
    }
})




router.get('/salesOverview', (req, res) => {
    let date = new Date();
    let currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    reportService.salesReport(currentMonth)
        .then(data => {
            res.status(200).json(data);
        })
        .catch(err => {
            res.status(400).json(err);
        })

})

let sd = async (year) => {
    // console.log(year);
    let responseArray = [];
    for (let i = 1; i <= 12; i++) {
        let currentMonth = new Date(year, i - 1, 1);
        let nextMonth = new Date(year, i, 1);
        let currMonthValue = i - 1;
        // let currentYear = year;
        // console.log(reportService.getMarketingReport(currentMonth,nextMonth,currMonthValue,currentYear));
        await reportService.salesReport(currentMonth, nextMonth)
            .then((rep) => {
                if (rep) {
                    // console.log(rep,"rep");
                    // rep.monthVal = i-1;
                    responseArray.push(rep);
                } else {
                    let empArray = [];
                    responseArray.push(empArray);
                }
            })
    }
    return responseArray;
}

router.get('/salesDetails', async (req, res) => {
    // let date = new Date();
    // let currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    let year = 0;
    let date = new Date();
    if (req.query.year) {
        year = req.query.year;
    } else {
        year = date.getFullYear();
    }
    let data = await sd(year)
    // console.log(data, "array");
    if (data.length == 0) return res.status(400).json('No data found.')
    else {
        res.status(200).send(data);
    }

})


///to be run
router.put('/queryForClosure', (req, res) => {
    // ProjectLog.find({ stage: 'Closure' })
    // ProjectLog.find({ stage: 'Lost' })
    ProjectLog.find({ stage: 'Contract Signed' })
        .populate('projectId')
        .then((logs) => {
            return new Promise((resolve, reject) => {
                async.forEach(logs, function (log, callback) {
                    if (log.projectId) {
                        ProjectLog.update({ _id: log._id }, { $set: { amount: log.projectId.totalCustomerOutflow } }, { multi: true }).exec(function (err, response) {
                            callback();
                        })
                    }
                }, (err) => {
                    console.log('done');
                })
            })
        })
})

let dd = async (year) => {
    // console.log(year);
    let responseArray = [];
    for (let i = 1; i <= 12; i++) {
        let currentMonth = new Date(year, i - 1, 1);
        let nextMonth = new Date(year, i, 1);
        let currMonthValue = i - 1;
        // let currentYear = year;
        // console.log(reportService.getMarketingReport(currentMonth,nextMonth,currMonthValue,currentYear));
        await reportService.designDetails(currentMonth, nextMonth)
            .then((rep) => {
                if (rep) {
                    // console.log(rep,"rep");
                    // rep.monthVal = i-1;
                    responseArray.push(rep);
                } else {
                    let empArray = [];
                    responseArray.push(empArray);
                }
            })
    }
    return responseArray;
}


router.get('/designOverview', (req, res) => {
    let date = new Date();
    let currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    reportService.designReport(currentMonth)
        .then(data => {
            res.status(200).json(data);
        })
        .catch(err => {
            res.status(400).json(err);
        })

})

router.get('/designDetails', async (req, res) => {
    let year = 0;
    let date = new Date();
    if (req.query.year) {
        year = req.query.year;
    } else {
        year = date.getFullYear();
    }
    let data = await dd(year)
    // console.log(data, "array");
    if (data.length == 0) return res.status(400).json('No data found.')
    else {
        res.status(200).send(data);
    }
})


router.get('/factory', (req, res) => {
    let stages = [
        "Working Drawing Received",
        "Production Drawing Received",
        "Under Production",
        "Material Ready Not Delivered",
        "Site Under Control",
        "Snag",
        "Completed"
    ];
    let reportData = {};
    reportData.innerView = [];
    let teamData = {};
    Department.find({ name: 'Factory' }).select('_id')
        .then((designIds) => {
            // console.log(salesIds, "sales");
            return Team.find({ departmentId: designIds[0]._id }).select('manager users').populate('users manager');
        })
        .then((teams) => {
            // console.log(teams);
            // res.status(200).json(teams)
            teamData = teams;
            return Project.find({ stage: { $in: stages } })

        })
        .then((projects) => {
            if (projects.length != 0) {
                let teamReport = [];
                let empObj = {};
                let empArray = [];
                empstages = [
                    "Working Drawing Received",
                    "Production Drawing Received",
                    "Under Production",
                    "Material Ready Not Delivered",
                    "Site Under Control",
                    "Snag",
                    "Completed"
                ]
                empstages.forEach(em=>{
                    let obj = {};
                    obj.stage = em;
                    obj.projects = [];
                    obj.count = 0;
                    empArray.push(obj);
                })
                projects.forEach(proj => {
                    // empObj[proj.stage] = (empObj[proj.stage] || 0) + 1;
                    let found = empArray.find(o=>o.stage == proj.stage);
                    if(!found){
                        let obj = {};
                        obj.stage = proj.stage;
                        obj.projects = [];
                        obj.projects.push(proj._id);
                        obj.count = 1;
                        empArray.push(obj);
                    } else {
                        found.projects.push(proj._id);
                        found.count++;
                    }
                })
                // reportData.outerView = empObj;
            reportData.outerView = empArray;

                // console.log(reportData.outerView, '>>>>>>>>>>>>>>>>>>')
                // })
            }


            teamData.forEach(team => {
                let teamObj = {};
                if (team.manager) {
                    teamObj.managername = team.manager.name
                } else {
                    teamObj.managername = 'NA';
                }
                let emp = {};
                let innerArray = [];
                // emp = {
                //     "Working Drawing Received": 0,
                //     "Production Drawing Received": 0,
                //     "Under Production": 0,
                //     "Material Ready Not Delivered": 0,
                //     "Site Under Control": 0,
                //     "Snag": 0,
                //     "Completed": 0
                // }
                emp = [
                    "Working Drawing Received",
                    "Production Drawing Received",
                    "Under Production",
                    "Material Ready Not Delivered",
                    "Site Under Control",
                    "Snag",
                    "Completed"
                ]
                emp.forEach(em=>{
                    let obj = {};
                    obj.stage = em;
                    obj.projects = [];
                    obj.count = 0;
                    innerArray.push(obj);
                })
                team.users.forEach(user => {
                    let data = projects.filter(o => o.assignTo.toString() == user._id.toString());
                    if (data) {
                        data.forEach(dat => {
                            let found = innerArray.find(o=>o.stage == dat.stage);
                            // emp[dat.stage] = (emp[dat.stage] || 0) + 1;
                            found.projects.push(dat._id);
                            found.count ++;
                        })
                    }
                })
                if (team.manager) {
                    let manData = projects.filter(o => o.assignTo.toString() == team.manager.toString());
                    if (manData) {
                        manData.forEach(mandat => {
                            // emp[mandat.stage] = (emp[mandat.stage] || 0) + 1;
                            let found = innerArray.find(o=>o.stage == mandat.stage);
                            // emp[dat.stage] = (emp[dat.stage] || 0) + 1;
                            found.projects.push(mandat._id);
                            found.count ++;
                        })
                    }
                }

                // teamObj.data = emp;
                teamObj.data = innerArray;
                reportData.innerView.push(teamObj);
            })

            res.status(200).json(reportData);
        })
        .catch((err) => {
            console.log(err)
            res.status(400).json('Error occurred');
        })
})

// teamData.forEach(team => {
//     let teamObj = {};
//     if(team.manager){
//         teamObj.managername = team.manager.name
//     } else {
//         teamObj.managername = 'NA';
//     }

//     // teamObj.stages = 
//     teamObj.managerObj = {};
//     team.users.forEach(user => {
//         teamObj.managerObj[proj.stage] = (teamObj.managerObj[proj.stage] || 0) + 1;
//     })
// })
// teamReport.push(empObj)

module.exports = router;
