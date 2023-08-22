const express = require('express');
const router = express.Router();
const async = require('async');
const _ = require('lodash');

const User = require('../models/user');
const Snag = require('../models/snag');
const auth = require('../middlewares/authentication');
const scopeService = require('../services/scope.service');
const snagService = require('../services/snag.service');
const poService = require('../services/generatePO.service');


router.post('/new', auth, (req, res) => {
    let newSnag = '';
    let code = '';
    let customerName = '';
    let snagStatus = 'Sent for approval';
    if (req.body.customerName.indexOf(' ') == -1) {
        customerName = req.body.customerName;
    } else {
        customerName = `${req.body.customerName.split(' ')[0]}_${req.body.customerName.split(' ')[1]}`;
    }
    // Snag.find({ projectNo: req.body.projectNo })
    Snag.find({ $or: [{ projectNo: req.body.projectNo }, { customerName: req.body.customerName }] })
        .select('snagCode customerName')
        .then((snags) => {
            if (snags.length != 0) {
                const number = Math.max.apply(Math, snags.map(function (o) { return o.snagCode.split('_')[o.snagCode.split('_').length - 1] }));
                code = `Snag_${snags[0].customerName}_${(number < 100 ? '00' : '') + (number + 1)}`;
                req.body.customerName = snags[0].customerName;
            } else {
                code = `Snag_${customerName}_001`
            }
            if (!req.body.assignTo) {
                if (req.body.vendorQuotationPresent === false) {
                    snagStatus = 'Sent for edit';
                    return User.findOne({ email: 'purchase@decorpot.com' })
                        .select('_id');
                }
                return scopeService.getManagerOfScope(req.body.scopeId);
            } else {
                return null;
            }
        })
        .then((user_id) => {
            let userId = '';
            if (user_id) {
                userId = user_id;
            } else {
                userId = req.body.assignTo;
            }
            let log = {
                date: Date.now(),
                status: snagStatus,
                comment: req.body.comment,
                user: req.user._id
            };
            newSnag = new Snag(req.body);
            newSnag.snagCode = code;
            if (newSnag.materials && newSnag.materials.length != 0) {
                newSnag.materials.forEach(mat => {
                    mat.status = snagStatus;
                    mat.assignTo = userId;
                    log.attachmentLink = mat.logs[0].attachmentLink;
                    mat.logs = [];
                    mat.logs.push(log);
                })
            }
            if (req.body.itemDependency) {
                newSnag.components.forEach(component => {
                    component.items.forEach(item => {
                        item.status = snagStatus;
                        item.assignTo = userId;
                        log.attachmentLink = item.logs[0].attachmentLink;
                        item.logs = [];
                        item.logs.push(log);
                    })
                })
            }
            newSnag.createdBy = req.user._id;
            return newSnag.save();
        })
        .then((snag) => {
            let actions = [{ status: 'REQUEST RAISED' }]
            if (process.env.NODE_ENV == 'production') {
                return snagService.sendMessageAndEmail(snag._id, actions, req.user);
            } else {
                return
            }
        })
        .then(() => {
            res.status(200).json('Snag saved successfully.');
        })
        .catch((err) => {
            res.status(400).json(err.message);
            console.log(err);
        });
});



router.get('/all', auth, (req, res) => {
    let query = [];
    if (req.user.role == 'Admin') {
        query = [
            { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
            { $sort: { 'projectNo': 1 } }
        ]
    } else if (req.user.role == 'Supervisor') {
        query = [
            // { $match: { createdBy: req.user._id } },
            { $match: { $or: [{ createdBy: req.user._id }, { supervisorId: req.user._id }] } },

            { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
            { $sort: { 'projectNo': 1 } }
        ]
    } else {
        query = [
            { $match: { $and: [{ status: { $ne: 'Completed' } }, { $or: [{ 'materials.assignTo': req.user._id }, { 'components.items.assignTo': req.user._id }] }] } },
            { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
            { $sort: { 'projectNo': 1 } }
        ]
    }
    snagService.getAllSnags(query)
        .then((snags) => {
            res.status(200).json(snags);
        })
        .catch((err) => {
            res.status(400).json(err.message);
            console.log(err);
        });
});


// get all snags of a project
router.get('/snagDetails', auth, (req, res) => {
    let query = {};
    let resData = [];
    let snagDetails = {};
    // let canDelete = false;
    let userId = req.user._id;
    // let scopeId = {};
    // if (req.query.scopeId) {
    //     scopeId = req.query.scopeId;
    // }
    if (req.user.role == 'Admin') {
        // searching 

        if (req.query.userId) {
            userId = req.query.userId;
            if (req.query.scopeId) {
                query = {
                    $and: [{ status: { $ne: 'Completed' } }, { $or: [{ 'materials.assignTo': userId }, { 'components.items.assignTo': userId }] }, { scopeId: req.query.scopeId }]
                };
            } else {
                query = {
                    $and: [{ status: { $ne: 'Completed' } }, { $or: [{ 'materials.assignTo': userId }, { 'components.items.assignTo': userId }] }]
                };
            }
        }
        else if (req.query.projectNo) {
            query = { projectNo: req.query.projectNo };
        }
        else {
            if (req.query.scopeId) {
                query = {
                    $and: [{ status: { $ne: 'Completed' } }, { scopeId: req.query.scopeId }]
                }
            } else {

                query = {
                    $and: [{ status: { $ne: 'Completed' } }]
                }
            }

        }
    } else if (req.user.role == 'Supervisor') {
        if (req.query.scopeId) {
            if (req.query.projectNo) {
                query = { $and: [{ projectNo: req.query.projectNo }, { $or: [{ createdBy: userId }, { supervisorId: req.user._id }] }, { scopeId: req.query.scopeId }] };
            } else {
                query = { $and: [{ $or: [{ createdBy: userId }, { supervisorId: req.user._id }] }, { scopeId: req.query.scopeId }] };
            }
        }
        else {
            query = { $and: [{ projectNo: req.query.projectNo }, { $or: [{ createdBy: userId }, { supervisorId: req.user._id }] }] };
        }
        // query = { $and: [{ projectNo: req.query.projectNo }, { createdBy: userId }] };
        // query = { $and: [{ projectNo: req.query.projectNo }, { $or: [{ createdBy: userId }, { supervisorId: req.user._id }] }] };


    } else {
        query = {
            $and: [{ projectNo: req.query.projectNo }, { status: { $ne: 'Completed' } }, { $or: [{ 'materials.assignTo': userId }, { 'components.items.assignTo': userId }] }]
        };
    }
    Snag.find(query)
        .populate('scopeId', 'name')
        .populate('supervisorId', 'name contact_no')
        .populate('createdBy', 'name')
        .populate('materials.unitType', 'name')
        .populate('materials.plyType', 'name')
        .populate({ path: 'materials.assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'components.items.assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'materials.logs.user', select: 'name contact_no' })
        .populate({ path: 'components.items.logs.user', select: 'name contact_no' })
        .then((snags) => {
            if (snags.length == 0) return res.status(400).json('No snag found.');
            let approvalTimeout = false;
            let deliveryTimeout = false;
            let percentageOfItems = 0;
            let percentageOfMaterials = 0;
            let counts = {
                'Sent for approval': 0,
                'Approved': 0,
                'Rejected': 0,
                'Approved': 0,
                'Factory work initiated': 0,
                'Delivered to site': 0
            };
            async.each(snags, function (snag, callback) {
                snagDetails = snag.toJSON();
                if (snagDetails.itemDependency) {
                    if (snagDetails.components.length != 0) {
                        let num = 0;
                        snagDetails.components.forEach(component => {
                            component.items.forEach(item => {
                                counts[item.status] = (counts[item.status] || 0) + 1;
                                num += 1;
                                if (item.status == 'Sent for approval') {
                                    let sentForApproval = item.logs.find(log => log.status == 'Sent for approval');
                                    let timeout = false;
                                    if (sentForApproval)
                                        timeout = snagService.checkTimeout(sentForApproval.date);
                                    if (timeout)
                                        approvalTimeout = true
                                }
                                if (item.status == 'Factory work initiated')
                                    deliveryTimeout = this.checkTimeout(item.expectedDeliveryDate, checkDeliveryTimeout = true);
                            });
                        });
                        percentageOfItems = Math.round(((counts['Rejected'] + counts['Delivered to site']) * 100) / num);
                    }
                } else {
                    snagDetails.materials.forEach(material => {
                        counts[material.status] = (counts[material.status] || 0) + 1;
                        if (material.status == 'Sent for approval') {
                            let sentForApproval = material.logs.find(log => log.status == 'Sent for approval');
                            let timeout = false;
                            if (sentForApproval)
                                timeout = snagService.checkTimeout(sentForApproval.date);
                            if (timeout)
                                approvalTimeout = true
                        }
                        if (material.status == 'Factory work initiated')
                            deliveryTimeout = this.checkTimeout(material.expectedDeliveryDate, checkDeliveryTimeout = true);
                    })
                    percentageOfMaterials = Math.round(((counts['Rejected'] + counts['Delivered to site']) * 100) / (snagDetails.materials.length));
                }
                snagDetails.completionPercent = percentageOfMaterials + percentageOfItems;
                counts = {
                    'Sent for approval': 0,
                    'Approved': 0,
                    'Rejected': 0,
                    'Approved': 0,
                    'Factory work initiated': 0,
                    'Delivered to site': 0
                };
                percentageOfItems = 0;
                percentageOfMaterials = 0;
                snagDetails.status = snagDetails.status;
                // if (userId.toString() == snagDetails.createdBy._id.toString() || req.user.role == 'Admin') {
                //     if (snagDetails.itemDependency) {
                //         snagDetails.components.forEach(component => {
                //             let allApproved = component.items.find(item => item.status != 'Sent for approval');
                //             if (!allApproved) {
                //                 canDelete = true;
                //             } else {
                //                 canDelete = false;
                //             }
                //         })
                //     } else {
                //         let allApproved = snagDetails.materials.find(mat => mat.status != 'Sent for approval');
                //         if (!allApproved) {
                //             canDelete = true;
                //         } else {
                //             canDelete = false;
                //         }
                //     }
                // }
                snagDetails.approvalTimeout = approvalTimeout;
                snagDetails.deliveryTimeout = deliveryTimeout;
                // snagDetails.canDelete = canDelete;
                snagDetails.project_no = snagDetails.projectNo;
                snagDetails.customerName = snagDetails.customerName;
                delete snagDetails.assignTo;
                approvalTimeout = false;
                deliveryTimeout = false;
                resData.push(snagDetails);
                snagDetails = {};
                callback();
            }, function (err) {
                if (err) throw new Error(err);
                res.status(200).json(resData);
            })
        })
        .catch((err) => {
            res.status(400).json(err.message);
            console.log(err);
        });
});


// all snags
router.get('/allSnagDetails', auth, (req, res) => {
    let query = {};
    let resData = [];
    let snagDetails = {};
    // let canDelete = false;
    let userId = req.user._id;
    // let scopeId = {};
    // if (req.query.scopeId) {
    //     scopeId = req.query.scopeId;
    // }
    if (req.user.role == 'Admin') {
        query = {
                    $and: [{ status: { $ne: 'Completed' } }, { scopeId: req.query.scopeId }]
                }
            }
  
    Snag.find(query)
        .populate('scopeId', 'name')
        .populate('supervisorId', 'name contact_no')
        .populate('createdBy', 'name')
        .populate('materials.unitType', 'name')
        .populate('materials.plyType', 'name')
        .populate({ path: 'materials.assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'components.items.assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'materials.logs.user', select: 'name contact_no' })
        .populate({ path: 'components.items.logs.user', select: 'name contact_no' })
        .then((snags) => {
            if (snags.length == 0) return res.status(400).json('No snag found.');
            let approvalTimeout = false;
            let deliveryTimeout = false;
            let percentageOfItems = 0;
            let percentageOfMaterials = 0;
            let counts = {
                'Sent for approval': 0,
                'Approved': 0,
                'Rejected': 0,
                'Approved': 0,
                'Factory work initiated': 0,
                'Delivered to site': 0
            };
            async.each(snags, function (snag, callback) {
                snagDetails = snag.toJSON();
                if (snagDetails.itemDependency) {
                    if (snagDetails.components.length != 0) {
                        let num = 0;
                        snagDetails.components.forEach(component => {
                            component.items.forEach(item => {
                                counts[item.status] = (counts[item.status] || 0) + 1;
                                num += 1;
                                if (item.status == 'Sent for approval') {
                                    let sentForApproval = item.logs.find(log => log.status == 'Sent for approval');
                                    let timeout = false;
                                    if (sentForApproval)
                                        timeout = snagService.checkTimeout(sentForApproval.date);
                                    if (timeout)
                                        approvalTimeout = true
                                }
                                if (item.status == 'Factory work initiated')
                                    deliveryTimeout = this.checkTimeout(item.expectedDeliveryDate, checkDeliveryTimeout = true);
                            });
                        });
                        percentageOfItems = Math.round(((counts['Rejected'] + counts['Delivered to site']) * 100) / num);
                    }
                } else {
                    snagDetails.materials.forEach(material => {
                        counts[material.status] = (counts[material.status] || 0) + 1;
                        if (material.status == 'Sent for approval') {
                            let sentForApproval = material.logs.find(log => log.status == 'Sent for approval');
                            let timeout = false;
                            if (sentForApproval)
                                timeout = snagService.checkTimeout(sentForApproval.date);
                            if (timeout)
                                approvalTimeout = true
                        }
                        if (material.status == 'Factory work initiated')
                            deliveryTimeout = this.checkTimeout(material.expectedDeliveryDate, checkDeliveryTimeout = true);
                    })
                    percentageOfMaterials = Math.round(((counts['Rejected'] + counts['Delivered to site']) * 100) / (snagDetails.materials.length));
                }
                snagDetails.completionPercent = percentageOfMaterials + percentageOfItems;
                counts = {
                    'Sent for approval': 0,
                    'Approved': 0,
                    'Rejected': 0,
                    'Approved': 0,
                    'Factory work initiated': 0,
                    'Delivered to site': 0
                };
                percentageOfItems = 0;
                percentageOfMaterials = 0;
                snagDetails.status = snagDetails.status;
                // if (userId.toString() == snagDetails.createdBy._id.toString() || req.user.role == 'Admin') {
                //     if (snagDetails.itemDependency) {
                //         snagDetails.components.forEach(component => {
                //             let allApproved = component.items.find(item => item.status != 'Sent for approval');
                //             if (!allApproved) {
                //                 canDelete = true;
                //             } else {
                //                 canDelete = false;
                //             }
                //         })
                //     } else {
                //         let allApproved = snagDetails.materials.find(mat => mat.status != 'Sent for approval');
                //         if (!allApproved) {
                //             canDelete = true;
                //         } else {
                //             canDelete = false;
                //         }
                //     }
                // }
                snagDetails.approvalTimeout = approvalTimeout;
                snagDetails.deliveryTimeout = deliveryTimeout;
                // snagDetails.canDelete = canDelete;
                snagDetails.project_no = snagDetails.projectNo;
                snagDetails.customerName = snagDetails.customerName;
                delete snagDetails.assignTo;
                approvalTimeout = false;
                deliveryTimeout = false;
                resData.push(snagDetails);
                snagDetails = {};
                callback();
            }, function (err) {
                if (err) throw new Error(err);
                res.status(200).json(resData);
            })
        })
        .catch((err) => {
            res.status(400).json(err.message);
            console.log(err);
        });
});



router.put('/snagDetailsReport', auth, (req, res) => {
    let query = {};
    let resData = [];
    let snagDetails = {};
    let userId = req.user._id;
    let queryArray = [];
    if (req.body.userId) {
        queryArray.push({ $or: [{ 'materials.assignTo': req.body.userId }, { 'components.items.assignTo': req.body.userId }] });
    }
    if (req.body.status) {
        queryArray.push({ status: req.body.status })
    }
    if (req.body.scopeId) {
        queryArray.push({ scopeId: req.body.scopeId })
    }
    if (req.body.createdDate) {
        queryArray.push({
            createdAt: {
                $gte: new Date(req.body.createdDate[0]), $lte: new Date(req.body.createdDate[1])
            }
        })
    }
    query = {
        $and: queryArray
    }
    Snag.find(query)
        .populate('scopeId', 'name')
        .populate('supervisorId', 'name contact_no')
        .populate('createdBy', 'name')
        .populate('materials.unitType', 'name')
        .populate('materials.plyType', 'name')
        .populate({ path: 'materials.assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'components.items.assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'materials.logs.user', select: 'name contact_no' })
        .populate({ path: 'components.items.logs.user', select: 'name contact_no' })
        .then((snags) => {
            if (snags.length == 0) return res.status(400).json('No snag found.');
            let approvalTimeout = false;
            let deliveryTimeout = false;
            let percentageOfItems = 0;
            let percentageOfMaterials = 0;
            let counts = {
                'Sent for approval': 0,
                'Approved': 0,
                'Rejected': 0,
                'Approved': 0,
                'Factory work initiated': 0,
                'Delivered to site': 0
            };
            async.each(snags, function (snag, callback) {
                snagDetails = snag.toJSON();
                if (snagDetails.itemDependency) {
                    if (snagDetails.components.length != 0) {
                        let num = 0;
                        snagDetails.components.forEach(component => {
                            component.items.forEach(item => {
                                counts[item.status] = (counts[item.status] || 0) + 1;
                                num += 1;
                                if (item.status == 'Sent for approval') {
                                    let sentForApproval = item.logs.find(log => log.status == 'Sent for approval');
                                    let timeout = false;
                                    if (sentForApproval)
                                        timeout = snagService.checkTimeout(sentForApproval.date);
                                    if (timeout)
                                        approvalTimeout = true
                                }
                                if (item.status == 'Factory work initiated')
                                    deliveryTimeout = this.checkTimeout(item.expectedDeliveryDate, checkDeliveryTimeout = true);
                            });
                        });
                        percentageOfItems = Math.round(((counts['Rejected'] + counts['Delivered to site']) * 100) / num);
                    }
                } else {
                    snagDetails.materials.forEach(material => {
                        counts[material.status] = (counts[material.status] || 0) + 1;
                        if (material.status == 'Sent for approval') {
                            let sentForApproval = material.logs.find(log => log.status == 'Sent for approval');
                            let timeout = false;
                            if (sentForApproval)
                                timeout = snagService.checkTimeout(sentForApproval.date);
                            if (timeout)
                                approvalTimeout = true
                        }
                        if (material.status == 'Factory work initiated')
                            deliveryTimeout = this.checkTimeout(material.expectedDeliveryDate, checkDeliveryTimeout = true);
                    })
                    percentageOfMaterials = Math.round(((counts['Rejected'] + counts['Delivered to site']) * 100) / (snagDetails.materials.length));
                }
                snagDetails.completionPercent = percentageOfMaterials + percentageOfItems;
                counts = {
                    'Sent for approval': 0,
                    'Approved': 0,
                    'Rejected': 0,
                    'Approved': 0,
                    'Factory work initiated': 0,
                    'Delivered to site': 0
                };
                percentageOfItems = 0;
                percentageOfMaterials = 0;
                snagDetails.status = snagDetails.status;
                snagDetails.approvalTimeout = approvalTimeout;
                snagDetails.deliveryTimeout = deliveryTimeout;
                snagDetails.project_no = snagDetails.projectNo;
                snagDetails.customerName = snagDetails.customerName;
                delete snagDetails.assignTo;
                approvalTimeout = false;
                deliveryTimeout = false;
                resData.push(snagDetails);
                snagDetails = {};
                callback();
            }, function (err) {
                if (err) throw new Error(err);
                res.status(200).json(resData);
            })
        })
        .catch((err) => {
            res.status(400).json(err.message);
            console.log(err);
        });
});


// get details of a snag
router.get('/getDetails', auth, (req, res) => {
    let snagObj = {};
    let userId = req.user._id;
    snagService.getSnagDetails({ _id: req.query.snagId })
        .then((snag) => {
            if (!snag) return res.status(200).json('No snag found.');
            snagObj = snag.toJSON();
            if (snagObj.itemDependency) {
                snagObj.components.forEach(component => {
                    if (req.user.role != 'Admin' && req.user.role != 'Supervisor') {
                        const itemsArray = _.filter(component.items, function (o) { return o.assignTo._id.toString() == userId.toString() });
                        component.items = itemsArray;
                    }
                    component.items.forEach(item => {
                        item.assignedTo = { name: item.assignTo.name, department: item.assignTo.department.name };
                    })
                })
            } else {
                if (req.user.role != 'Admin' && req.user.role != 'Supervisor') {
                    const matsArray = _.filter(snagObj.materials, function (o) { return o.assignTo._id.toString() == userId.toString() });
                    snagObj.materials = matsArray;
                }
                snagObj.materials.forEach(mat => {
                    mat.assignedTo = { name: mat.assignTo.name, department: mat.assignTo.department.name };
                })
            }
            return snagService.takeAction(snagObj, req.user);
        })
        .then((snagDetails) => {
            snagDetails.project_no = snagObj.projectNo;
            snagDetails.customerName = snagObj.customerName;
            res.status(200).json(snagDetails);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json(err.message);
        });
});


//filter api added
router.get('/filteredSnags', auth, (req, res) => {
    let query = {};
    query.projectNo = req.query.projectId;
    if (req.query.status && req.query.status != 'All') {
        query.status = req.query.status;
    }
    if (req.query.scopeId) {
        query.scopeId = req.query.scopeId;
    }
    if (req.query.supervisorid) {
        query.supervisorId = req.query.supervisorid;
    }
    if (req.query.deptId) {
        query.scopeId = getScopesOfDepartment(req.query.deptId);
    }
    Snag.find(query)
        .populate('scopeId', 'name')
        .populate('materials.unitType', 'name')
        .populate('materials.plyType', 'name')
        .populate('materials.finishType', 'name')
        .populate('components.projectComponentId', 'name')
        .populate('components.items.itemId', 'name')
        .populate('supervisorId', 'name')
        .populate({ path: 'assignTo', populate: { path: 'assignTo', select: 'name' } })
        .populate('createdBy', 'name')
        .then((snags) => {
            if (!snags) throw new Error('No snag found');
            res.status(200).json(snags);
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err.message)
        });
});


// take action on materials or items
router.put('/approve/:snagId', auth, (req, res) => {
    let snagDetails = {};
    let rejected = false;
    let approved = false;
    let approvedByDesignManager = false;
    let rejectedByDesignManager = false;
    let setDeliveryDate = false;
    let isDelivered = false;
    let factoryManager = {};
    let actions = [];
    let material = '';
    let item = '';
    let action = {
        status: '',
        comment: '',
        materialId: [],
        itemId: []
    };
    Snag.findById(req.params.snagId)
        .populate('scopeId', 'name')
        .populate('materials.assignTo', 'name contact_no email')
        .populate('components.items.assignTo', 'name contact_no email')
        .populate('createdBy', 'name contact_no email')
        .then((snag) => {
            if (!snag) throw new Error('No snag found.');
            if (snag.scopeId.name === 'Modular' && req.body.materialsId) {
                const requestMaterials = req.body.materialsId;
                requestMaterials.forEach(reqMaterial => {
                    if (reqMaterial.approve && reqMaterial.approve === true) {
                        const snagMaterial = snag.materials.find(material => material._id == reqMaterial.materialId);
                        if (!snagMaterial.code1) {
                            throw new Error('Laminate Code 1 is Mandatory')
                        }
                        else if (!snagMaterial.code2) {
                            throw new Error('Laminate Code 2 is Mandatory')
                        }
                        else if (!snagMaterial.barcode) {
                            throw new Error('Barcode is Mandatory')
                        }
                        else if (!snagMaterial.length) {
                            throw new Error('Length is Mandatory')
                        }
                        else if (!snagMaterial.thickness) {
                            throw new Error('Thickness is Mandatory')
                        }
                        else if (!snagMaterial.breadth) {
                            throw new Error('Breadth is Mandatory')
                        }
                        else if (!snagMaterial.edgeBand1) {
                            throw new Error('Edge Band 1 is Mandatory')
                        }
                        else if (!snagMaterial.edgeBand2) {
                            throw new Error('Edge Band 2 is Mandatory')
                        }
                        else if (!snagMaterial.edgeBand3) {
                            throw new Error('Edge Band 3 is Mandatory')
                        }
                        else if (!snagMaterial.edgeBand4) {
                            throw new Error('Edge Band 4 is Mandatory')
                        }
                    }
                })
            }
            snagDetails = snag;
            if (!req.body.factoryWorkInitiated && !req.body.expectedDeliveryDate) {
                return User.find({ role: 'Manager' })
                    .populate('department', 'name')
                    .select('department')
            }
            return;
        })
        .then((users) => {
            if (users && users.length != 0)
                factoryManager = users.find(user => user.department.name == 'Factory');

            return new Promise((resolve, reject) => {
                let _ids = [];
                _ids = req.body.itemsId || req.body.materialsId;
                async.each(_ids, function (someId, callback) {
                    let changeData = {};
                    if (snagDetails.itemDependency) {
                        if (someId.materialId) {
                            let data = snagDetails.components.find(comp => comp.items.id(someId.materialId));
                            changeData = data.items.id(someId.materialId);
                        } else {
                            let data = snagDetails.components.find(comp => comp.items.id(someId));
                            changeData = data.items.id(someId);
                        }
                        item = changeData._id;
                    } else {
                        if (someId.materialId) {
                            changeData = snagDetails.materials.id(someId.materialId);
                        } else {
                            changeData = snagDetails.materials.id(someId);
                        }
                        material = changeData._id;
                    }

                    // REQUEST APPROVED by IMOS/Finance USER
                    if (someId.approve === true && changeData.status == 'Sent for approval') {
                        action.status = 'REQUEST APPROVED';
                        let log = {
                            date: Date.now(),
                            status: 'Approved',
                            comment: someId.reason,
                            user: req.user._id
                        }
                        snagDetails.status = 'InProgress';
                        changeData.status = 'Approved';
                        if (someId.assignTo) {
                            changeData.assignTo = someId.assignTo;
                            // changeData.assignTo = someId.manager;
                        } else {
                            // changeData.assignTo = factoryManager._id;
                            changeData.assignTo = someId.manager;
                        }
                        if (someId.attachmentLink) {
                            log.attachmentLink = someId.attachmentLink;
                        }
                        changeData.logs.push(log);
                        approved = true;
                    }

                    // REQUEST REJECTED by IMOS USER
                    if (!someId.approve && changeData.status == 'Sent for approval') {
                        action.status = 'REQUEST REJECTED';
                        let log = {
                            date: Date.now(),
                            status: 'Rejected',
                            comment: someId.reason,
                            user: req.user._id
                        };
                        rejected = true;
                        snagDetails.status = 'InProgress';
                        changeData.assignTo = snagDetails.createdBy;
                        changeData.status = 'Rejected';
                        changeData.logs.push(log);
                    }

                    // REQUEST APPROVED by DESIGN MANAGER
                    if (someId.approvedByDesignManager === true && changeData.status == 'Approved') {
                        approvedByDesignManager = someId.approvedByDesignManager;
                        action.status = 'REQUEST APPROVED BY DESIGN MANAGER';
                        let log = {
                            date: Date.now(),
                            status: 'Approved by manager',
                            comment: someId.reason,
                            user: req.user._id
                        }
                        snagDetails.status = 'InProgress';
                        changeData.status = 'Approved by manager';
                        if (someId.assignTo) {
                            changeData.assignTo = someId.assignTo;
                        } else {
                            changeData.assignTo = "5c759aa56845e2094c335e11";
                        }
                        if (someId.attachmentLink) {
                            log.attachmentLink = someId.attachmentLink;
                        }
                        changeData.logs.push(log);
                    }

                    // REQUEST REJECTED by DESIGN MANAGER
                    if (someId.rejectedByDesignManager === true && changeData.status == 'Approved') {
                        rejectedByDesignManager = someId.rejectedByDesignManager;
                        action.status = 'REQUEST REJECTED BY DESIGN MANAGER';
                        let log = {
                            date: Date.now(),
                            status: 'Rejected by manager',
                            comment: someId.reason,
                            user: req.user._id
                        };
                        rejected = true;
                        snagDetails.status = 'InProgress';
                        changeData.assignTo = snagDetails.createdBy;
                        changeData.status = 'Rejected by manager';
                        changeData.logs.push(log);
                    }

                    // FACTORY WORK INITIATED
                    if (req.body.factoryWorkInitiated) {
                        if (changeData.status == 'Factory work initiated' && req.user.role != 'Admin')
                            throw new Error('Factory work initiated already.');
                        action.status = 'FACTORY WORK INITIATED';
                        setDeliveryDate = true;
                        let log = {
                            date: Date.now(),
                            status: 'Factory work initiated',
                            comment: req.body.comment,
                            user: req.user._id
                        }
                        if (someId.attachmentLink) {
                            log.attachmentLink = someId.attachmentLink;
                        }
                        changeData.expectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
                        changeData.status = 'Factory work initiated';
                        changeData.logs.push(log);
                    }

                    // DELIVERED TO SITE
                    if (req.body.deliveredToSite) {
                        action.status = 'REQUEST DELIVERED TO SITE';
                        action.comment = req.body.comment;
                        isDelivered = true;
                        changeData.status = 'Delivered to site';
                        changeData.deliveryDate = Date.now();
                        changeData.isDelivered = true;
                        let log = {
                            date: Date.now(),
                            status: 'Delivered to site',
                            comment: req.body.comment,
                            user: req.user._id
                        }
                        if (someId.attachmentLink) {
                            log.attachmentLink = someId.attachmentLink;
                        }
                        changeData.logs.push(log);
                    }

                    let statusExist = actions.find(o => o.status == action.status);
                    if (statusExist) {
                        if (snagDetails.itemDependency) {
                            statusExist.itemId.push(item);
                        } else {
                            statusExist.materialId.push(material);
                        }
                    } else {
                        if (snagDetails.itemDependency) {
                            action.itemId.push(item);
                        } else {
                            action.materialId.push(material);
                        }
                        actions.push(action);
                    }
                    changeData = {};
                    action = {
                        status: '',
                        comment: '',
                        materialId: [],
                        itemId: []
                    };
                    callback();
                }, function (err) {
                    if (err) reject(err);
                    resolve();
                })
            })
        })
        .then(() => {
            let deliveredItems = {};
            let deliveredMaterials = {};
            if (snagDetails.itemDependency) {
                deliveredItems = snagDetails.components.find(comp => comp.items.find(item => !item.isDelivered && item.status != 'Rejected'));
                if (!deliveredItems) {
                    snagDetails.status = 'Completed';
                }
            } else {
                deliveredMaterials = snagDetails.materials.find(mat => !mat.isDelivered && mat.status != 'Rejected');
                if (!deliveredMaterials) {
                    snagDetails.status = 'Completed';
                }
            }
            return snagDetails.save();
        })
        .then(() => {
            if (process.env.NODE_ENV == 'production') {
                return snagService.sendMessageAndEmail(snagDetails._id, actions, req.user);
            } else {
                return
            }
        })
        .then(() => {
            if (setDeliveryDate) {
                res.status(200).json('Delivery date set successfully.');
            }
            else if (isDelivered) {
                res.status(200).json('Delivered to site successfully.');
            }
            else if (approvedByDesignManager === true) {
                res.status(200).json('Snag moved to factory.');
            }
            else if (rejectedByDesignManager === true || rejected) {
                res.status(400).json('Snag rejected.');
            }
            else if (approved) {
                res.status(200).json('Snag approved successfully.');
            }
            else {
                res.status(400).json('No action is taken.');
            }
        })
        .catch((err) => {
            console.log(err);
            if (err.name == 'ValidationError') {
                let errMsg = '';
                if (err.message.split(',').length > 1) {
                    errMsg = err.message.split(',')[0];
                } else {
                    errMsg = err.message;
                }
                return res.status(400).json(errMsg.split(':')[2]);
            }
            res.status(400).json(err.message);
        });
});


router.put('/snagedit/:id', auth, (req, res) => {
    let query = req.params.id;
    let materials = req.body;
    let options = { new: true };
    let financeManager = {};
    User.find({ role: 'Manager' })
        .populate('department', 'name')
        .select('department')
        .then((users) => {
            if (req.body.vendorQuotationPresent === false) {
                financeManager = users.find(user => user.department.name == 'Finance');
                materials.components.forEach(component => {
                    component.items.forEach(item => {
                        item.assignTo = financeManager._id;
                        item.status = 'Sent for approval';
                        item.logs.push({
                            date: Date.now(),
                            status: 'Sent for approval',
                            comment: req.body.comment,
                            user: req.user._id
                        });
                    });
                });
            }
            return Snag.findByIdAndUpdate(query, materials, options);
        })
        .then(() => {
            res.status(200).json('Successfully edited');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err.message);
        });
});


//attach po
router.put('/attachPO', auth, (req, res) => {
    let snagDetails = {};
    let comp = {};
    Snag.findOne({ _id: req.body.snagId })
        .then((snag) => {
            if (!snag) throw new Error('No snag found.');
            snagDetails = snag;
            if (snagDetails.components) {
                snagDetails.components.forEach((component) => {
                    comp = component.items.id(req.body.itemId);
                    if (comp) {
                        // comp.poAttachment = req.body.poAttachment;
                        let log = {
                            date: Date.now(),
                            status: 'PO Attached',
                            comment: req.body.comment,
                            user: req.user._id,
                            attachmentLink: req.body.poAttachment
                        }
                        comp.logs.push(log);
                    }

                })
            }
            return snagDetails.save();
        })
        .then(() => {
            res.status(200).json('PO attached successfully.');
        })
        .catch((err) => console.log(err));
});



//attach po
router.put('/attachPO', auth, (req, res) => {
    let snagDetails = {};
    let comp = {};
    Snag.findOne({ _id: req.body.snagId })
        .then((snag) => {
            if (!snag) throw new Error('No snag found.');
            snagDetails = snag;
            if (snagDetails.components) {
                snagDetails.components.forEach((component) => {
                    comp = component.items.id(req.body.itemId);
                    if (comp) {
                        // comp.poAttachment = req.body.poAttachment;
                        let log = {
                            date: Date.now(),
                            status: 'PO Attached',
                            comment: req.body.comment,
                            user: req.user._id,
                            attachmentLink: req.body.poAttachment
                        }
                        comp.logs.push(log);
                    }

                })
            }
            return snagDetails.save();
        })
        .then(() => {
            res.status(200).json('PO attached successfully.');
        })
        .catch((err) => console.log(err));
});


// delete sub doc
router.delete('/removeSubDocument', (req, res) => {
    let query = req.query.snagId;
    let subDocId = req.query.subDocId;
    let subDoc = {};
    Snag.findById(query)
        .then((snag) => {
            if (!snag) throw new Error('No snag found');
            if (snag.itemDependency) {
                let item = snag.components.find(comp => comp.items.id(subDocId));
                subDoc = item.items.id(subDocId);
            } else {
                subDoc = snag.materials.id(subDocId);
            }
            subDoc.remove();
            return snag.save();
        })
        .then(() => {
            res.status(200).json('Snag deleted successfully.');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err.message);
        });
});


// delete snag
router.delete('/remove/:id', auth, (req, res) => {
    let query = req.params.id;
    Snag.findById(query)
        .then((snag) => {
            if (!snag) throw new Error('No snag found');
            if (req.user.role == 'Admin') {
                // return snag.remove();
            } else {
                throw new Error(`Can't delete.`)
            }
        })
        .then(() => {
            res.status(200).json('Snag deleted successfully.');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err.message);
        });
});


// Search user which have snag(s)
router.get('/users', auth, (req, res) => {
    query = {
        $and: [{ 'materials.status': { $ne: 'Delivered to site' } }, { 'components.items.status': { $ne: 'Delivered to site' } }]
    };
    Snag.distinct('components.items.assignTo' && 'materials.assignTo', query)
        .then((snagUsers) => {
            return User.find({ _id: { $in: snagUsers } })
                .select('name')
        })
        .then((users) => {
            res.status(200).json(users);
        })
        .catch(err => res.status(400).send(err));
});


router.get('/getAllProcessedSnag', auth, (req, res) => {
    let query = [];
    // if (req.user.role == 'Admin') {
    //     query = [
    //         { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
    //         { $sort: { 'projectNo': 1 } }
    //     ]
    // } else if (req.user.role == 'Supervisor') {
    //     query = [
    //         { $match: { createdBy: req.user._id } },
    //         { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
    //         { $sort: { 'projectNo': 1 } }
    //     ]
    // } else {
    //     query = [
    //         { $match: { $and: [{ status: { $ne: 'Completed' } }, { $or: [{ 'materials.assignTo': req.user._id }, { 'components.items.assignTo': req.user._id }] }] } },
    //         { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
    //         { $sort: { 'projectNo': 1 } }
    //     ]
    // }
    query = [
        { $match: { $and: [{ status: { $ne: 'Completed' } }, { $or: [{ 'materials.logs.assignTo': req.user._id }, { 'components.items.assignTo': req.user._id }] }] } },
        { $group: { _id: '$projectNo', status: { $push: '$status' }, customerName: { $push: '$customerName' } } },
        { $sort: { 'projectNo': 1 } }
    ]
    snagService.getAllSnags(query)
        .then((snags) => {
            res.status(200).json(snags);
        })
        .catch((err) => {
            res.status(400).json(err.message);
            console.log(err);
        });
});



module.exports = router;
