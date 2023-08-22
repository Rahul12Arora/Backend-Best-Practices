const express = require('express');
const router = express.Router();
const _ = require('lodash');
const queryString = require('query-string');
const async = require('async');
const User = require('../models/user');
const { ExecutionManagerRoleId, ExecutionUserRoleId} = require('../constant/constant')
const {factoryStage} = require('../constant/constant')
const auth = require('../middlewares/authentication');
const Project = require('../models/project');
const ProjectComponent = require('../models/projectComponent');
const Quotation = require('../models/quotation');
const Department = require('../models/department');
const ProjectLog = require('../models/projectLog');
const projectService = require('../services/project.service');
const filterService = require('../services/filter.service');
const Lead = require('../models/lead');
const usersService = require('../services/users.service');
const assignService = require('../services/assign.service');
const leadService = require('../services/lead.service');
const LeadLogs = require('../models/leadLog');
const OptimizationFile = require('../models/optimisationFiles')


router.get('/getOptimisationFiles', async (req, res) =>{
    try
    {
        let response = await OptimizationFile.find({})
        .populate({ path: 'projects', select: 'projectNumber clientName leadId'})
        .populate({path: 'uploadedBy', select: 'name'})
        .sort({createdAt: -1})

        let optimisationFiles = []
        
        for(let index = 0; index < response.length; index++)
        {
            let projects = ""

            response[index]["projects"].forEach(el=>projects+=` ${el.projectNumber},`)

            projects = projects.substring(0, projects.length-1)
            let obj =
            {
                _id: response[index]._id,
                projectsIds: response[index].projects,
                projects: projects,
                uploadedBy: response[index]["uploadedBy"].name,
                optimizationNumber: response[index].optimizationNumber,
                updatedAt: response[index].updatedAt,
                excelFileLink: response[index].excelFileLink,
                sawFileLink: response[index].sawFileLink,
                pastingFile: response[index].pastingFile,
            }
            optimisationFiles.push(obj)
            
        }
        res.status(200).json({optimisationFiles: optimisationFiles})
    }
    catch(error)
    {
        console.log(error, "err");
    }
})

router.post('/updateOptimisationFiles', async (req, res) => {
    try
    {
        const newOptimisationFile = new OptimizationFile(req.body)
        await newOptimisationFile.save()
        
        res.status(200).json({msg: "Updated"})
    }
    catch(error)
    {
        console.log(error, "err");
    }
})


router.put('/updateOptimizedSingleFile/:Id', async (req, res) => {
    try {
        const data = await OptimizationFile.findById(req.params.Id)
        data.excelFileLink = req.body.excelFileLink
        data.sawFileLink = req.body.sawFileLink
        data.projects = req.body.projects
        data.uploadedBy = req.body.uploadedBy
        data.pastingFile = req.body.pastingFile
        await data.save();
        res.status(200).json("Successfully Updated")
    }
    catch (error) {
        res.status(400).send(error)
    }
})

// Create project
router.post('/new', auth, (req, res) => {
    if (req.user.roles.find(role => role.name === 'Admin')) return res.status(403).json('Admin cannot create lead.');
    let deptStage = '';
    Department.find({ _id: req.user.departmentId })
        .select('stages')
        .then((deptStages) => {
            deptStage = deptStages[0].stages[0];
            return;
        })
        .then(() => {
            return Lead.find({ customerId: req.body.customerId })
                .select('lead_no');
        })
        .then((leads) => {
            let newLeadNo = 0;
            if (leads.length == 0) {
                newLeadNo = req.body.customer_no + 0.1;
            } else {
                const number = Math.max.apply(Math, leads.map(function (o) { return o.lead_no; }));
                const numStr = number.toString();
                newLeadNo = req.body.customer_no + '.' + parseInt(parseInt(numStr.split('.')[1]) + 1);
            }
            newLead = new Lead({
                lead_no: newLeadNo,
                customerId: req.body.customerId,
                address: req.body.address,
                projectType: req.body.projectType,
                createdBy: req.user._id,
                assignTo: req.user._id,
                departmentId: req.user.departmentId,
                teamId: req.user.teamId,
                leadStatus: 'Won',
                salesStage: 'Won',
                designStatus: 'Design',
                designStages: deptStage,
                scopeOfWork: req.body.scopeOfWork,
                sourceOfLead: req.body.sourceOfLead,
                startInteriors: req.body.startInteriors,
                leadType: req.body.leadType,
                isRegistered: req.body.isRegistered,
                propertyType: req.body.propertyType,
                area: req.body.area,
                city: req.body.city,
                experienceCenterId: req.body.experienceCenterId,
                floorPlan: req.body.floorPlan,
                discountOnAllScopes: req.body.discountOnAllScopes,
                status: 'Lead Received'
                // bookingAmount: req.body.bookingAmount,
                // bookingDate: req.body.bookingDate,
                // apartmentName: req.body.apartmentName,
                // apartmentNo: req.body.apartmentNo
            });
            return newLead.save();
        })
        .then((lead) => {
            leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user._id
            leadLogs.user = req.user._id;
            leadLogs.leadId = lead.id;
            leadLogs.stage = deptStage,
            leadLogs.dealActivity = req.user.name + ' has created a deal. ';
            return leadLogs.save();

        })
        // .then(() => {
        //     return Lead.findByIdAndUpdate(req.body.leadId, { $set: { leadStatus: 'Project Created' } }, { upsert: true });
        // })
        .then((leadlog) => {
            return leadService.assignRatesToLead(leadlog.leadId, req.user.orgId, req.body.city)
        })
        .then(() => {
            // console.log(lead, "lead");
            res.status(200).json('Lead created.');
        })
        .catch((err) => {
            console.log(err, "err");
        })
    // .catch((err) => res.status(400).send(err));

});


//all projects for supervisor
router.get('/allprojectssupervisor', auth, (req, res) => {
    Project.find({})
        .select('project_no stage status')
        .populate('customerId', 'name')
        .then((projects) => {
            if (projects.length == 0) return res.status(200).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})

router.get('/mappedProjects', auth, (req, res) => {
    let query = {};
    // console.log(req.user,">?>>>>")
    // console.log("inside mapped");
    if (req.user.role == 'Admin') {
        return Project.find({ factoryProjectNo: { $exists: true } })
            .populate('supervisors', 'name')
            .populate('customerId', 'name')
            // .sort({factoryProjectNo : 1})
            .lean()
            .then((projs) => {
                if (projs.length == 0) return res.status(400).json('No projects found.');
                else {
                    let projArray = [];
                    return new Promise((resolve, reject) => {
                        async.forEach(projs, function (pro, callback) {
                            let count = 0;
                            let prodCount = 0;
                            let currPrice = 0;
                            let totalPrice = 0;
                            Quotation.findOne({ projectId: pro._id })
                                .sort({ createdAt: -1 }).limit(1).exec(function (er, result) {
                                    if (result) {
                                        result.components.forEach(comps => {
                                            comps.products.forEach(prod => {
                                                if (prod.images.length > 0) {
                                                    count++;
                                                }
                                                if (prod.isCompleted) {
                                                    currPrice += prod.productPrice;
                                                }
                                                totalPrice += prod.productPrice;

                                                prodCount++;
                                            })
                                        })
                                        if (pro.status == 'Completed') {
                                            currPrice = totalPrice;
                                        }
                                        pro.currPrice = currPrice;
                                        pro.totalPrice = totalPrice;
                                        // console.log(count,"count");
                                        pro.imageCount = count;
                                        pro.prodCount = prodCount;
                                        // console.log(pro,"prooooo");
                                        projArray.push(pro);
                                        callback();
                                    } else {
                                        callback();
                                    }
                                })
                        }, (err) => {
                            resolve(projArray);
                        })
                    })
                }
                // res.status(200).send(projs);
            })
            .then((projects) => {
                // console.log(projects,">>>>>>>>>>>")
                res.status(200).send(projects);
            })
    }
    else if (req.user.role == 'Manager') {
        let uid = [];
        return usersService.getUsersInATeam(req.user.team)
            .then((users) => {
                // console.log("-----------",users)
                users.users.forEach(user => {
                    // console.log(user._id, "pppppp")
                    uid.push(user._id);
                });
                uid.push(req.user._id);
                // console.log(uid,"ids");
                return Project.find({ supervisors: { $in: uid } })
                    .populate('supervisors', 'name')
                    .populate('customerId', 'name')
                    .lean();
            })
            .then((projs) => {
                // console.log(projs, "all pro")
                if (projs.length == 0) return res.status(400).json('No projects found.');
                else {
                    let projArray = [];
                    return new Promise((resolve, reject) => {
                        async.forEach(projs, function (pro, callback) {
                            let count = 0;
                            let prodCount = 0;
                            let currPrice = 0;
                            let totalPrice = 0;
                            Quotation.findOne({ projectId: pro._id })
                                .sort({ createdAt: -1 }).limit(1).exec(function (er, result) {
                                    result.components.forEach(comps => {
                                        comps.products.forEach(prod => {
                                            if (prod.images.length > 0) {
                                                count++;
                                            }
                                            if (prod.isCompleted) {
                                                currPrice += prod.productPrice;
                                            }
                                            totalPrice += prod.productPrice;

                                            prodCount++;
                                        })
                                    })
                                    pro.currPrice = currPrice;
                                    pro.totalPrice = totalPrice;
                                    pro.imageCount = count;
                                    pro.prodCount = prodCount;
                                    projArray.push(pro);
                                    callback();
                                })
                        }, (err) => {
                            resolve(projArray);
                        })
                    })
                }
            })
            .then((projects) => {
                res.status(200).send(projects);
            })
            .catch((err) => res.status(400).send(err));
        // console.log(users, "users");
    }
    else if (req.user.role == 'Supervisor') {

        // let uid = [];
        return Project.find({ factoryProjectNo: { $exists: true }, supervisors: { $in: req.user._id } })
            .populate('supervisors', 'name')
            .populate('customerId', 'name')
            .then((projs) => {
                if (projs.length == 0) return res.status(400).json('No projects found.');
                res.status(200).send(projs);
            })
            .catch((err) => res.status(400).send(err));
        // console.log(users, "users");
    } else
        return Project.find({ factoryProjectNo: { $exists: true } })
            .populate('supervisors', 'name')
            .populate('customerId', 'name')
            .then((projs) => {
                if (projs.length == 0) return res.status(400).json('No projects found.');
                // console.log(projs);
                res.status(200).send(projs);
            })

})



router.get('/discountedProjects', (req, res) => {
    Project.find({ discountApprovalRequest: true, discountStatus: 'Sent for approval' })
        .populate('customerId', 'name')
        .populate('assignTo', 'name')
        .populate('discountLogs.user', 'name')
        .populate('discountLogs.actionTakenBy', 'name')
        .populate('discountLogs.discountRequestedBy', 'name')
        .populate('discountRequestedBy', 'name')
        .then((projects) => {
            // let proArray = [];
            if (projects.length == 0) return res.status(200).json('No projects found.');
            // else {
            //     projects.forEach(pro=>{
            //         if(pro.discountLogs.length==0){
            //             proArray.push(pro);
            //         } else {
            //             if(pro.discountLogs[pro.discountLogs.length-1].approvalStatus)
            //         }
            //     })
            // }
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})




router.get('/customerProcProjects', (req, res) => {
    Project.find({ procurementApprovalRequest: true, procurementStatus: 'Sent for approval' })
        .populate('customerId', 'name')
        .populate('assignTo', 'name')
        .populate('customerProcLogs.user', 'name')
        .populate('customerProcLogs.procRequestedBy', 'name')
        .populate('customerProcLogs.actionTakenBy', 'name')
        .populate('procRequestedBy', 'name')
        .then((projects) => {
            // let proArray = [];
            if (projects.length == 0) return res.status(200).json('No projects found.');
            // else {
            //     projects.forEach(pro=>{
            //         if(pro.discountLogs.length==0){
            //             proArray.push(pro);
            //         } else {
            //             if(pro.discountLogs[pro.discountLogs.length-1].approvalStatus)
            //         }
            //     })
            // }
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})


// Get all project
router.get('/all', auth, (req, res) => {
    projectService.getAllProjects(req.user)
        .then((projects) => {
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
});

// Get all project
router.get('/userProjects/:id', (req, res) => {
    const email = req.params.id;
    projectService.getUserProjects(email)
        .then((projects) => {
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
});


// router.get('/active', auth, (req, res) => {
//     projectService.getActiveProjects(req.user)
//         .then((projects) => {
//             console.log("mmmmm")
//             if (projects.length == 0) return res.status(400).json('No project found.');
//             res.status(200).send(projects);
//         })
//         .catch((err) => res.status(400).send(err));
// });



router.post('/activeDashboard', auth, (req, res) => {
    projectService.getActiveProjectsDashboard(req.user, req.body)
        .then((projects) => {
            if (projects.length == 0) return res.status(400).json('No project found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})


router.post('/activeDashboardMarketing', auth, (req, res) => {
    // console.log("inside");
    let queryObject = filterService.getQuery(req.body);
    queryObject.status = 'OnGoing';
    // queryObject.createdBy = req.user._id;
    if (req.user.role == 'Manager') {
        let uid = [];
        return usersService.getUsersInATeam(req.user.team)
            .then((users) => {
                // console.log(users, "yttttttttt")
                users.users.forEach(user => {
                    uid.push(user._id);
                });
                // users.departmentId.stages.forEach(stage => {
                //     allDepts[stage] = [];
                // })
                // uid = users;
                uid.push(req.user._id);
                // console.log(uid,"ppppppp")
                // queryObject.assignTo = { $in: uid };
                queryObject.createdBy = { $in: uid }
                return Project.find(queryObject)
                    .select('status stage project_no customerId assignTo createdAt grandTotal team leadType totalCustomerOutflow')
                    .populate('team', 'name')
                    .populate('customerId', 'name')
                    .populate({ path: 'assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
                    .sort({ 'createdAt': -1 })
            })
            .then((projects) => {
                // console.log(projects, "managers");
                if (projects.length == 0) return res.status(400).json('No project found.');
                res.status(200).send(projects);
            })
            .catch((err) => res.status(400).send(err));
    } else {
        queryObject.createdBy = req.user._id;
        Project.find(queryObject)
            // .select('status stage project_no customerId assignTo createdAt grandTotal')
            .populate('customerId', 'name')
            .populate({ path: 'assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
            .sort({ 'createdAt': -1 })
            .then((projects) => {
                // if (projects.length == 0) return Promise.reject('No projects found.');
                // return projects;
                if (projects.length == 0) return res.status(400).json('No project found.');
                res.status(200).send(projects);
            })
            .catch((err) => res.status(400).send(err));
    }

})


//dashboard projects according to stage
router.put('/stage/select', auth, (req, res) => {
    // console.log(req.user.role, "usertype");
    let stage = queryString.parse(req.query.stage);
    let queryStage = Object.keys(stage)[0];
    let dept = queryString.parse(req.query.dept);
    let deptname = Object.keys(dept)[0];
    let teamId = queryString.parse(req.query.teamId);
    let team = Object.keys(teamId)[0];
    let query = {};
    let queryObject = filterService.getQuery(req.body);
    if (req.query.teamId) {
        queryObject.team = Object.keys(teamId)[0];
    }
    queryObject.department = deptname;
    queryObject.stage = queryStage;
    // console.log(query,"made query");
    if (req.user.role == 'User') return res.status(403).json('Unauthorized access.')
    // Project.find({ stage: queryStage, department: deptname, team: team })
    Project.find(queryObject)
        .select('project_no status stage totalCustomerOutflow')
        .populate('customerId', 'name')
        .populate('assignTo', 'name')
        .then((projects) => {
            if (projects.length == 0) return res.status(400).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
});

router.get('/closed', (req, res) => {
    myDate = new Date(req.body.toDate);
    toDate = new Date(myDate.setDate(myDate.getDate() + 1)).toISOString();
    startDate = new Date(req.body.fromDate);
    endDate = new Date(toDate);
    Project.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
        { $unwind: '$customer' },
        { $lookup: { from: 'quotations', localField: '_id', foreignField: 'projectId', as: 'quotation' } },
        { $project: { LeadCreatedDate: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } }, QuotationAmount: "$grandTotal", CustomerName: "$customer.name", Contact_no: "$customer.contact_no", Address: "$customer.address", QuotationSentOn: { $dateToString: { format: "%d-%m-%Y", date: { $arrayElemAt: ["$quotation.createdAt", -1] } } } } },
        { $sort: { createdAt: -1 } }
    ])
        .then((projects) => {
            // console.log(projects.length);
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
});

router.put('/stage/all', auth, (req, res) => {
    let queryObject = filterService.getQuery(req.body);
    if (req.user.role == 'User') return res.status(403).json('Unauthorized access.')
    // let dept = req.params.id;
    let deptstages = {};
    let finalStages = [];
    // let queryStage = Object.keys(stage)[0];
    let dept = queryString.parse(req.query.dept);
    let deptname = Object.keys(dept)[0];
    let teamId = queryString.parse(req.query.teamId);
    let team = Object.keys(teamId)[0];
    // let allDepts = {};
    // let query = {};
    if (req.query.teamId) {
        queryObject.team = Object.keys(teamId)[0];
    }
    queryObject.department = Object.keys(dept)[0];
    // console.log(query,"made query");
    Department.find({ _id: deptname })
        .then((depts) => {
            depts[0].stages.forEach(element => {
                deptstages[element] = [];
            });
            return depts[0].stages;
        })
        .then((departments) => {
            return Project.find(queryObject)
                // return Project.find({ department: deptname, team: team })
                .select('project_no status stage totalCustomerOutflow')
                .populate('customerId', 'name')
                // .populate('assignTo', 'name')
                .populate({ path: 'assignTo', populate: { path: 'department', select: 'name stages' }, select: 'name' })
                .populate('department', 'name');
        })
        .then((projects) => {
            projects[0].assignTo.department.stages.forEach(stage => {
                deptstages[stage] = [];
            })
            projects.forEach((prj) => {
                if (deptstages.hasOwnProperty(prj.stage)) {
                    deptstages[prj.stage].push(prj);
                }
            })
            let emp = {};
            for (let key in deptstages) {
                emp.stage = key;
                emp.projects = deptstages[key];
                finalStages.push(emp);
                emp = {}
            }
            if (finalStages.length == 0) return res.status(200).json('No projects found.');
            // console.log(finalStages,"ppppppp")
            finalStages.forEach(finalSt => {
                let totalAmount = 0;
                let count = 0;
                finalSt.projects.forEach(proj => {
                    totalAmount += proj.totalCustomerOutflow;
                    count += 1;
                })
                finalSt.finalAmount = totalAmount;
                finalSt.totalCount = count;
            })
            // console.log(finalStages,"ended")
            res.status(200).json(finalStages);
        })
        .catch((err) => res.status(400).send(err));
});




//closure  & Contract Signed projects
router.get('/admin/:stage', auth, (req, res) => {
    let finalProjs = [];
    Project.find({ stage: req.params.stage })
        .populate('customerId', 'name')
        .populate('assignTo', 'name')
        .populate('department', 'name')
        .populate('team', 'name')
        .then((projs) => {
            // cons     ole.log(projs);
            if (projs.length == 0) return res.status(400).json('No projects found.');
            // let allDepts = {};
            // projs.forEach((pro) => {
            //     if (allDepts.hasOwnProperty(pro.team.name)) {
            //         allDepts[pro.team.name].push(pro);
            //     } else {
            //         allDepts[pro.team.name] = [];
            //         allDepts[pro.team.name].push(pro);
            //     }
            // })
            // let emp = {};
            // for (var key in allDepts) {
            //     emp.team = key;
            //     emp.projects = allDepts[key];
            //     finalProjs.push(emp);
            //     emp = {}
            // }
            res.status(200).json(projs);
        })
        .catch((err) => res.status(400).send(err));
})




router.get('/factoryProjects', auth, (req, res) => {
    Department.find({ name: 'Factory' })
        .select('_id')
        .then((dep) => {
            // console.log(dep);
            return Project.find({ $and: [{ factoryProjectNo: { $exists: false } }, { department: dep[0]._id }] })
                .populate('customerId', 'name')
                .populate('assignTo', 'name');
        })
        .then((projects) => {
            // console.log(projects.length);
            if (projects.length == 0) return res.status(400).json('No projects found.');
            res.status(200).json(projects);
        })
        .catch((err) => res.status(400).send(err));
})



router.get('/riskProfile', auth, (req, res) => {

    let date = new Date();
    Project.find({ contractSignedDate: { $exists: true } })
        .then((projects) => {
            let responseObj = {};
            responseObj.serviceno = 0;
            responseObj.serviceprojects = [];
            responseObj.modularno = 0;
            responseObj.modularprojects = [];
            responseObj.normalno = 0;
            responseObj.normalprojects = [];
            responseObj.handoverno = 0;
            responseObj.handoverprojects = [];
            responseObj.highriskno = 0;
            responseObj.highriskprojects = [];
            responseObj.beyondcontrolno = 0;
            responseObj.beyondcontrolprojects = [];
            // console.log(projects, "risk")
            if (projects.length == 0) return res.status(200).json(responseObj);
            else {
                // console.log(responseObj,"LLLLL");
                projects.forEach(proj => {
                    if (date.getTime() - (20 * 24 * 60 * 60 * 1000) < proj.contractSignedDate.getTime()) {
                        responseObj.serviceno += 1;
                        responseObj.serviceprojects.push(proj._id);
                    } else if (date.getTime() - (25 * 24 * 60 * 60 * 1000) < proj.contractSignedDate.getTime()) {
                        responseObj.modularno += 1;
                        responseObj.modularprojects.push(proj._id);
                    } else if (date.getTime() - (45 * 24 * 60 * 60 * 1000) < proj.contractSignedDate.getTime()) {
                        responseObj.normalno += 1;
                        responseObj.normalprojects.push(proj._id);
                    } else if (date.getTime() - (60 * 24 * 60 * 60 * 1000) < proj.contractSignedDate.getTime()) {
                        responseObj.handoverno += 1;
                        responseObj.handoverprojects.push(proj._id);
                    } else if (date.getTime() - (75 * 24 * 60 * 60 * 1000) < proj.contractSignedDate.getTime()) {
                        responseObj.highriskno += 1;
                        responseObj.highriskprojects.push(proj._id);
                    } else {
                        responseObj.beyondcontrolno += 1;
                        responseObj.beyondcontrolprojects.push(proj._id);
                    }
                })

            }
            return res.status(200).json(responseObj);

        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err);
        })
    // .catch((err) => res.status(400).send(err));
})


// Get a projects of a customer
router.get('/customer/:customerId', auth, (req, res) => {
    Project.find({ customerId: req.params.customerId })
        .then((projects) => {
            if (projects.length == 0) return res.status(200).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
});


// Get a project details
router.get('/:projectId', (req, res) => {
    let projectDetails = {};
    Project.findById(req.params.projectId)
        // .select('project_no description projectType status stage')
        .populate('customerId', 'name address email contact_no customer_no')
        .populate('plyType', 'name pricePerUnit')
        .populate('assignTo', 'name')
        .populate('team', 'name')
        .populate('sourceOfLead', 'name')
        .populate('department', 'name')
        .populate('createdBy', 'name')
        .populate('sourceOfLead', 'name')
        .populate('discountLogs.user', 'name')
        .populate('discountLogs.actionTakenBy', 'name')
        .populate('customerProcLogs.user', 'name')
        .populate('customerProcLogs.actionTakenBy', 'name')
        .then((project) => {
            if (!project) return res.status(200).json('No projects found.');
            projectDetails = project.toJSON();
            return Quotation.find({ projectId: req.params.projectId })
                .select('version')
        })
        .then((quotations) => {
            let nextVersionNo = 0;
            if (quotations.length == 0) {
                nextVersionNo = `${projectDetails.projectNumber}.1`;
            } else {
                const number = Math.max.apply(Math, quotations.map(function (o) { return o.version.split('.')[o.version.split('.').length - 1] }));
                nextVersionNo = `${projectDetails.projectNumber}.${number + 1}`;
            }
            projectDetails.nextVersionNo = nextVersionNo;
            res.status(200).send(projectDetails);
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a project
router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['description', 'projectType', 'discountOnAllScopes', 'estimatedBudget', 'floorPlan', 'isRegistered', 'plyType', 'area', 'propertyType', 'scopeOfWork', 'startInteriors', 'city', 'sourceOfLead', 'leadType', 'remark', 'assignTo', 'factoryProjectNo', 'supervisors', 'address', 'status', 'contractSignedDate', 'modularDeliveryDate', 'projectCompletionDate', 'workingDrawingFile', 'expectedContractSign', 'expectedTenPercent']);
    // if(req.body)
    let options = { new: true };
    let leadTypeObj = '';
    // if(req.body.leadType && (req.body.leadType == 'Junk' || req.body.leadType =='Hold')){

    // }
    let sendersId = [];
    let smsAndEmailText = '';
    Project.findById(query)
        .then((project) => {
            leadTypeObj = project.leadType;
            if (req.body.leadType && (req.body.leadType == 'Junk' || req.body.leadType == 'Hold')) {
                update.assignTo = project.createdBy;
                // console.log(project,"ppppppp");
                return Project.findByIdAndUpdate(project._id, update, options)
                    .populate('assignTo', 'name');

            } else {
                return Project.findByIdAndUpdate(project._id, update, options)
                    .populate('assignTo', 'name');


            }

        })
        .then((updated) => {
            // console.log(updated, "uiuuuuu");
            log = {
                projectId: query,
                user: updated.assignTo,
                remark: 'Project details updated',
                // dealActivity : 'Lead Type is changed to '+ req.body.leadType 
            }

            // if (req.body.leadType && req.body.leadType != leadTypeObj && req.body.assignTo) {
            //     log.leadType = req.body.leadType,
            //         log.dealActivity = 'Lead Type is changed to ' + req.body.leadType + ' & assigned to Sales by ' + req.user.name;
            // } else if (req.body.leadType != leadTypeObj) {
            //     log.leadType = req.body.leadType,
            //         log.dealActivity = 'Lead Type is changed to ' + req.body.leadType + ' by ' + req.user.name;
            // } else if (req.body.assignTo) {
            //     // log.leadType = req.body.leadType,
            //     log.dealActivity = 'Project is assigned to sales by ' + req.user.name;
            // } else {
            //     log.dealActivity = 'Project details updated by ' + req.user.name;
            // }


            if (req.body.leadType && req.body.leadType == 'Real' && req.body.leadType != leadTypeObj && req.body.assignTo) {
                log.leadType = req.body.leadType,
                    log.dealActivity = 'Lead Type is changed to Real & assigned to ' + updated.assignTo.name + ' by ' + req.user.name;
            } else if (req.body.leadType && (req.body.leadType == 'Junk' || req.body.leadType == 'Hold') && req.body.leadType != leadTypeObj) {
                log.leadType = req.body.leadType,
                    log.dealActivity = 'Lead Type is changed to ' + req.body.leadType + ' by ' + req.user.name;
            } else if (req.body.assignTo) {
                log.dealActivity = 'Project is assigned to ' + updated.assignTo.name + ' by ' + req.user.name;
            }
            else if (req.body.supervisors) {
                log.dealActivity = 'Factory project no added & supervisors added by ' + req.user.name;
            }
            else {
                log.dealActivity = 'Project details updated by ' + req.user.name;
            }
            if (req.body.leadType && (req.body.leadType == 'Junk' || req.body.leadType == 'Hold')) {
                smsAndEmailText = `${log.dealActivity} for project no ${updated.project_no},customer name ${updated.customerId.name}`;
                sendersId.push(req.user._id);
                sendersId.push(updated.assignTo._id);
            }

            // if(req.body.leadType != leadTypeObj){
            //     log.leadType = req.body.leadType,
            //     log.dealActivity ='Lead Type is changed to '+ req.body.leadType; 
            // }
            // else if (req.body.assignTo) {
            //     log.dealActivity = 'Project is assigned to sales by ' + req.user.name;
            // } else {
            //     log.dealActivity = 'Project details updated by ' + req.user.name;
            // }
            return projectService.saveProjectLog(log);


        })
        .then(() => {
            if (sendersId.length != 0) {
                return User.find({ _id: { $in: sendersId } })
                    .select('email contact_no');
            } else {
                return;
            }
        })
        .then((users) => {
            let userDetail = {};
            let contact_no = [];
            let email = [];
            if (users && users.length != 0) {
                users.forEach((user) => {
                    contact_no.push(user.contact_no);
                    email.push(user.email);
                })
                userDetail.email = email;
                userDetail.contact_no = contact_no;
                userDetail.text = smsAndEmailText;
                userDetail.emailText = smsAndEmailText;
                if (process.env.NODE_ENV == 'production') {
                    return assignService.sendMessageOnAssign(userDetail);
                }
                // assignService.sendMessageOnAssign(userDetail);
            }
            // res.status(200).json('Project Details Updated.');
        })
        .then((logs) => {
            res.status(200).json("Updated succesfully");
        })
        // .catch((err) => res.status(400).send(err));
        .catch((err) => {
            console.log(err);
            res.status(400).json(err);
        })
    // Project.findByIdAndUpdate(query, update, options)
    //     .then((project) => {
    //         // if()
    //         // res.status(200).send(project);
    //     })
    //     .catch((err) => res.status(400).send(err));
});



router.put('/discountApproval/:id', auth, (req, res) => {

    Project.findByIdAndUpdate(req.params.id, { $set: { discountPercent: req.body.discountPercent, discountApprovalRequest: req.body.discountApprovalRequest, discountStatus: req.body.discountStatus, discountRequestedBy: req.user._id } })
        .then((project) => {
            res.status(200).json('Discount % sent/revoked for approval');
        })
        .catch((err) => {
            res.status(400).send(err.message);
        });
})


router.put('/procurementApproval/:id', auth, (req, res) => {
    Project.findByIdAndUpdate(req.params.id, { $set: { materialProcuredPercent: req.body.materialProcuredPercent, procurementApprovalRequest: req.body.procurementApprovalRequest, procurementStatus: req.body.procurementStatus, procRequestedBy: req.user._id } })
        .then((project) => {
            res.status(200).json('Procurement % sent/revoked for approval');
        })
        .catch((err) => {
            res.status(400).send(err.message);
        });
})

router.put('/approveDiscount/:id', auth, (req, res) => {
    let log = {
        discountValue: req.body.discountPercent,
        user: req.body.assignTo,
        actionTakenBy: req.user._id,
        discountRequestedBy: req.body.discountRequestedBy
    }
    if (req.body.discountApprovalRequest == true) {
        log.approvalStatus = false;
    } else {
        log.approvalStatus = true;
    }
    Project.findByIdAndUpdate(req.params.id, { $set: { discountPercent: req.body.discountPercent, discountApprovalRequest: req.body.discountApprovalRequest, discountStatus: req.body.discountStatus }, $push: { discountLogs: log } })
        .then(proj => {
            // console.log(proj,"updated");
            res.status(200).json('Project edited');
        })
        .catch((err) => {
            res.status(400).send(err.message);
        });

})


router.put('/approveProcurement/:id', auth, (req, res) => {
    let log = {
        customerProcValue: req.body.materialProcuredPercent,
        user: req.body.assignTo,
        actionTakenBy: req.user._id,
        procRequestedBy: req.body.procRequestedBy
    }
    if (req.body.procurementApprovalRequest == true) {
        log.approvalStatus = false;
    } else {
        log.approvalStatus = true;
    }
    Project.findByIdAndUpdate(req.params.id, { $set: { materialProcuredPercent: req.body.materialProcuredPercent, procurementApprovalRequest: req.body.procurementApprovalRequest, procurementStatus: req.body.procurementStatus }, $push: { customerProcLogs: log } })
        .then(proj => {
            // console.log(proj,"updated");
            res.status(200).json('Project edited');
        })
        .catch((err) => {
            res.status(400).send(err.message);
        });

})


// Delete project
router.delete('/remove/:id', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can delete project.');
    let projectId = req.params.id;
    let deleteQuotation = Quotation.deleteMany({ projectId: projectId });
    let deleteProjectLog = ProjectLog.deleteMany({ projectId: projectId });
    let deleteProject = Project.deleteOne({ _id: projectId });
    let deleteProjectComponent = ProjectComponent.deleteMany({ projectId: projectId })
    return Promise.all([deleteProject, deleteProjectLog, deleteQuotation, deleteProjectComponent])
        .then(() => {
            res.status(200).json('Project delete successfully.');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err.message);
        });
});



//all Projects
router.get('/allstage', auth, (req, res) => {
    Project.find({})
        .then((projects) => {
            if (projects.length == 0) return res.status(200).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
});

//all projects for supervisor
router.get('/allprojectssupervisor', auth, (req, res) => {
    Project.find({})
        .select('project_no stage status')
        .populate('customerId', 'name')
        .then((projects) => {
            if (projects.length == 0) return res.status(200).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})


router.get("/getExecutionProjectCount/:expcenter", async (req, res) => {
    try {
        let executionCounts = [];
        let query = {}

        if (req.query.startDate !== "undefined" && req.query.endDate !== "undefined")
        {
            query['designSignOffDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
        }

        let departmentId = await Department.findOne({ name: "Operations" }).select('_id')
        let execution
        if (req.query.isUser === "true"){
                execution = await User.find({_id : req.user._id,isActive:true})
        }else{
            execution = await User.find({ departmentId: departmentId._id, experienceCenterId: req.params.expcenter, $or: [{ roles: ExecutionManagerRoleId}, { roles : ExecutionUserRoleId}] ,isActive: true })
        }
        const getProjectCount = await Lead.find
        ({
            ...query,
            finalPaymentApprovalRequestStatus: 'NA',
            $or: [{ currentStage: "Under Execution" }, { currentStage: "Completed" }, { currentStage: "Completed-MWP" }],
        })
        .select('lead_no grandTotal factoryStage currentStage assignTo')
        .populate('erpProjectId', 'code clientName divisionOfProject startDate grandTotal status')
        .sort({ createdAt : 1 })
        .lean();

        for (j = 0; j < execution.length;j++){
        let projects = []
            for (let i = 0; i < getProjectCount.length;i++){
                if (String(getProjectCount[i].assignTo) === String(execution[j]._id) ){
                    projects.push(getProjectCount[i])
                }
            }

        let obj =
        {
            user: execution[j].name,
            userId: execution[j]._id
        }

        if (obj.stage == undefined)
        {
            obj.stage = {}
        }

        for (let m = 0; m < factoryStage.length; m++)
        {
            obj.stage[factoryStage[m]] = 0
        }
        
        for (let i = 0; i < projects.length; i++)
        {
            if (projects[i].currentStage) {
                obj.stage[projects[i].currentStage] += 1;
            } else {
                obj.stage[projects[i].currentStage] = 1
            }
        } 
            executionCounts.push(obj)
        }
        res.status(200).send(executionCounts);
    } catch (error) {
        console.log(error, "Error log");
    }
})

router.put('/projectDetails', auth, (req, res) => {
    let projs = req.body.projects;
    Project.find({ _id: { $in: projs } })
        .populate('customerId', 'name contact_no')
        .populate('assignTo', 'name')
        .populate('department', 'name')
        .then(projects => {
            if (projects.length == 0) return res.status(200).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})




module.exports = router;

