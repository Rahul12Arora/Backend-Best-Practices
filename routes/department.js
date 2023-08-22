const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authentication');
const Department = require('../models/department');
const User = require('../models/user');

// Create new department
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(400).send('Only admin can create department.');
    Department.findOne({ name: req.body.name })
        .then((department) => {
            if (department) return res.status(400).send('Department already exist.');
            department = new Department({
                name: req.body.name,
                stages: req.body.stages
            });
            return department.save();
        })
        .then((department) => {
            res.status(200).send(department);
        })
        .catch((err) => res.status(400).send(err));
});

// Get all project comp. masters
router.get('/all', auth, (req, res) => {
    Department.find()
        .populate('teams','name')
        .populate('users', 'name role')
        .then((departments) => {
            res.status(200).send(departments);
        })
        .catch((err) => res.status(400).send(err));
});


// Edit a department
router.put('/edit/:id', (req, res) => {
    Department.findByIdAndUpdate(req.params.id, { $set: { stages: req.body.stages, name: req.body.name } }, { new: true })
        .then((department) => {
            if (!department) return res.status(400).send('Not updated.');
            res.status(200).send(department);
        })
        .catch((err) => res.status(400).send(err));
});

router.get('/supervisors', auth, (req, res) => {
    User.find({ role: 'Supervisor' })
        .select('name')
        .then((supervisors) => {
            if (!supervisors) return res.status(400).send('Not found.');
            res.status(200).json(supervisors);
        })
        .catch((err) => res.status(400).send(err));
})


//push users to department
router.get('/fetchUsersOfDept', (req, res) => {
    let usersDetails = [];
    User.find()
        .select('department')
        .then((users) => {
            usersDetails = users;
            return Department.find();
        })
        .then((departments) => {
            departments.forEach(dept => {
                usersDetails.forEach(user => {
                    if (user.department && dept._id.toString() == user.department.toString()) {
                        dept.users.push(user._id);
                    }
                });
                dept.save();
            });
        })
        .then(() => {
            // console.log('done');
            res.status(200).send('done');
        })
        .catch((err) => res.status(400).send(err.message));
})



router.get('/allusersOfDepartment/:deptId',(req,res)=>{
    let deptId = req.params.deptId;
    User.find({department : deptId})
        .select('name')
        .then((users)=>{
            if(users.length==0) return res.status(404).json('No user found.');
            return res.status(200).json(users);
        })
        .catch((err) => res.status(400).send(err.message));
})


module.exports = router;

