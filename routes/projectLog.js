const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const ProjectLog = require('../models/projectLog');
const Project = require('../models/project');
const User = require('../models/user');

router.get('/assignToUser/:userId', auth, (req, res) => {
    ProjectLog.find({ user: req.params.userId })
        .populate('projectId', 'project_no status')
        .populate('user', 'name')
        .then((details) => {
            if (details.length == 0) return res.status(404).json('No project assigned.');
            res.status(200).send(details);
        })
        .catch((err) => res.status(400).send(err));
});

router.post('/new', (req, res) => {
    details = new ProjectLog(_.pick(req.body, ['projectId', 'stage', 'user']));
    details.save()
        .then(() => {
            console.log('log saved');
        })
        .catch((err) => res.status(400).send(err));
});


router.get('/:projectId', auth, (req, res) => {
    ProjectLog.find({ projectId: req.params.projectId })
        // .select('user projectId stage createdAt s3Location remark')
        .populate({ path: 'user', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({
            path: 'projectId',
            populate: { path: 'customerId ', select: 'name address email contact_no' },
            // populate: { path: 'createdBy', select: 'name' },
            // populate: { path: 'department', select: 'name' },
            // populate: { path: 'team', select: 'name' },
            select: 'project_no status'
        })
        .sort({ 'createdAt': -1 })
        .then((logs) => {
            if (logs.length == 0) return res.statusCode(404).json('No data found.');
            res.status(200).send(logs);
        })
        .catch((err) => res.status(400).send(err));
});


// get all projects which is not in req. user dept. (for manager & admin)
router.get('/anotherdept/:departmentId', auth, (req, res) => {
    if (req.user.role == 'User') return res.status(403).json('Unauthorized');
    let usersArray = [];
    let finalStages = [];
    User.find({ department: req.params.departmentId })
        .then((users) => {
            // console.log(users,"iiiii");
            users.forEach((us) => {
                usersArray.push(us._id);
            })
            return ProjectLog.distinct('projectId', { user: usersArray })
        })
        .then((logs) => {
            return Project.find({ $and: [{ _id: { $in: logs } }, { assignTo: { $nin: usersArray } }] })
                .populate('assignTo', 'name')
                .populate('customerId', 'name')
                .populate('createdBy', 'name')
                .populate('department', 'name');
        })
        .then((projects) => {
            let allDepts = {};
            // console.log(projects,"pro");
            projects.forEach((pro) => {
                if (allDepts.hasOwnProperty(pro.department.name)) {
                    allDepts[pro.department.name].push(pro);
                } else {
                    allDepts[pro.department.name] = [];
                    allDepts[pro.department.name].push(pro);
                }
            })
            // console.log(allDepts,"uuuu");
            let emp = {};
            // console.log(allDepts,"pppppp");
            for (var key in allDepts) {
                emp.stage = key;
                emp.projects = allDepts[key];
                finalStages.push(emp);
                emp = {}
            }
            if (finalStages.length == 0) return res.status(200).json('No projects found.');
            res.status(200).json(finalStages);
        })
        .catch((err) => res.status(400).send(err));
})



router.put('/remindersOfDate', auth, (req, res) => {
    let queryObj = {};
    if (req.body.equalDate) {
        queryObj.reminderDate = { $gte: new Date(req.body.equalDate), $lte: new Date(new Date().setDate(new Date(req.body.equalDate).getDate() + 1)) };
    }
    if (req.body.dateBetween) {
        queryObj.reminderDate = { $gte: new Date(req.body.dateBetween[0]), $lte: new Date(req.body.dateBetween[1]) }
    }
    queryObj.user = req.user._id;
    queryObj.taggedUser = req.user._id;
    ProjectLog.find({ $and: [{ reminderDate: queryObj.reminderDate }, { $or: [{ user: queryObj.user }, { taggedUser: queryObj.taggedUser }] }] })
        .populate('projectId')
        .then((logs) => {
            if (logs.length == 0) return res.status(400).json('No reminder found');
            else {
                return res.status(200).json(logs);
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(400).json('Error occurred');
        })
})



module.exports = router;

