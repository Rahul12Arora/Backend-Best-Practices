const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');

const auth = require('../middlewares/authentication');
// const customerAuth = require('../middlewares/authentication').customerAuth;
const Customer = require('../models/customer');
const ProjectLog = require('../models/projectLog');
const Project = require('../models/project');
const User = require('../models/user');
const Department = require('../models/department');
const usersService = require('../services/users.service');
const Lead = require('../models/lead');
const customerService = require('../services/customer.service');
const Quotation = require('../models/quotation');


// Create a customer
router.post('/new', auth, (req, res) => {
    let newCustomerNo = 0;
    Customer.find().sort({ customer_no: -1 }).limit(1)
        // .select('customer_no -_id')
        .then((customers) => {
            // console.log(typeof (customers[0].customer_no), "customers");
            if (customers.length != 0) {
                // newCustomerNo = Math.max.apply(Math, customers.map(function (o) { return o.customer_no; })) + 1;
                // console.log(newCustomerNo, 'kkkkkkkkkkkkk')
                newCustomerNo = customers[0].customer_no + 1;
            } else {
                newCustomerNo = 1;
                // console.log(newCustomerNo, 'newCustomerNo 2');
            }
            Promise.resolve();
        })
    if (req.user.role != 'Admin') {
        usersService.getUserDepartment(req.user.department)
            .then((department) => {
                if (department != 'Sales') return Promise.reject('Only sales or admin can create customer.');
            })
            .catch((err) => res.status(400).send(err));
    }
    Customer.findByEmailAndMobile(req.body.email, req.body.contact_no, req.body.customer_no)
        .then(() => {
            // console.log(newCustomerNo, 'newCustomerNo 3');
            if (newCustomerNo == 0) {
                throw new Error('Customer not created.Please try again');
            }
            customer = new Customer({
                customer_no: newCustomerNo,
                name: req.body.name,
                email: req.body.email,
                contact_no: req.body.contact_no,
                address: req.body.address,
                createdBy: req.user._id
            });
            return customer.save();
        })
        .then((customer) => {
            // console.log("inside tghis", customer);
            return Lead.findByIdAndUpdate(req.body.leadId, { $set: { leadStatus: 'Customer Created', customerId: customer._id, customer_no: customer.customer_no } }, { upsert: true });
        })
        .then((lead) => {
            // console.log(lead, "lead");
            res.status(200).json("Customer created successfully");
        })
        // .then(()=> res.status(200).send("Customer created successfully"))
        .catch((err) => {
            console.log(err, "err");
            res.status(400).json(err);
        })
    // .then(() => res.status(200).send(_.pick(customer, ['name', 'email', 'contact_no', 'address'])))
    // .catch((err) => res.status(400).send(err));
});


// Get all customer
router.get('/all', auth, (req, res) => {
    // projectService.getActiveProjects(req.user)
    // Customer.find({})
    //     .select('name email contact_no address customer_no')
    //     .sort({ 'name': 1 })
    //     .then((projects) => {
    //         res.status(200).send(projects);
    //     })
    // .catch(err => res.status(400).send(err));
    customerService.getActiveCustomers(req.user)
        .then((customers) => {
            if (customers.length == 0) return res.status(400).json('No customers found.');
            res.status(200).send(customers);
        })
        .catch((err) => res.status(400).send(err));
});

// // Search customer
router.get('/search/:text', auth, (req, res) => {
    //     if (req.user.role == 'Admin') {
    totalCustomer = [];
    Customer.find({ $text: { $search: req.params.text } })
        .select('name email customer_no')
        .then((customers) => {
            if (customers.length == 0) return res.status(200).json('No customer found');
            totalCustomer = customers;
            return usersService.getAllCustomers(req.user);
        })
        .then((customers) => {
            let results = [];
            async.each(totalCustomer, function (oneCustomer) {
                const result = _.find(customers, function (customer) { return customer.email == oneCustomer.email });
                if (result != undefined) results.push(result);
            });
            res.status(200).json(results);
        })
        .catch(err => res.status(400).send(err));
    //     } else if (req.user.role == 'Manager') {
    //         return usersService.getAllCustomers(req.user)
    //             .then((customer) => {
    //                 res.status(200).send(customer);
    //             })
    //             .catch(err => res.status(400).send(err));
    //     } else {
    //         res.status(200).send('customers');
    //     }

});



// Search customer
router.get('/search', auth, (req, res) => {
    if (req.user.role == 'Admin') {
        Customer.find()
            .select('name email')
            .then((customers) => {
                if (customers.length == 0) return res.status(200).send('No customer found');
                res.status(200).send(customers);
            })
            .catch(err => res.status(400).send(err));
    } else if (req.user.role == 'Manager') {
        usersService.getAllCustomers(req.user)
            .then((customer) => {
                res.status(200).send(customer);
            })
            .catch(err => res.status(400).send(err));
    } else {
        ProjectLog.find({ user: req.user._id })
            .select('projectId')
            .populate({ path: 'projectId', populate: { path: 'customerId', select: 'name email' }, select: '-_id' })
            .then((logs) => {
                if (logs.length == 0) return res.status(404).json('No customer found.');
                res.status(200).send(logs);
            })
            .catch(err => res.status(400).send(err));
    }

});


// Get a single customer details
router.get('/:id', auth, (req, res) => {
    Customer.findCustomerById(req.params.id)
        .then((customer) => {
            res.status(200).send(customer);
        })
        .catch(err => res.status(400).send(err));
});


// Edit customer
router.put('/edit/:id', auth, (req, res) => {
   // if (req.user.roles.find(role => role.name !== 'Admin')) return res.status(403).json('Only admin can edit customer details.');
    let query = req.params.id;
    let update = req.body;
    let options = { new: true };
    Customer.findByIdAndUpdate(query, update, options)
        .then((customer) => {
            if (!customer) return res.status(404).json('Customer not found.');
            res.status(200).send(customer);
        })
        .catch(err => res.status(400).send(err));
});


// delete customer
router.delete('/remove/:id', auth, (req, res) => {
    Customer.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).send('Customer deleted.');
        })
        .catch((err) => res.status(400).send(err));
});


router.post('/adddepartments', (req, res) => {
    Project.find({})
        .then((pro) => {
            pro.forEach((pr) => {
                // console.log(pr);
                User.find({ _id: pr.assignTo })
                    .select('department')
                    .then((us) => {
                        // console.log(us, "1");
                        // Department.find({_id : us[0].department})
                        //     // .select('stages')
                        //     .then((deps)=>{
                        //         console.log(deps[0],"2");
                        //         Project.update({_id : pr._id},{$set : {stage : deps[0].stages[0]}})
                        //                 .then((pr)=>{
                        //             console.log(pr);
                        //         })

                        //     })
                        Project.update({ _id: pr._id }, { $set: { department: us[0].department } }, { multi: true })
                            .then((pr) => {
                                // console.log(pr);
                            })
                    })
            })


        })
})

router.post('/addstages', (req, res) => {
    Project.find({ stage: 'Initial' })
        .then((pro) => {
            pro.forEach((pr) => {
                // console.log(pr);
                User.find({ _id: pr.assignTo })
                    .select('department')
                    .then((us) => {
                        // console.log(us, "1");
                        Department.find({ _id: us[0].department })
                            // .select('stages')
                            .then((deps) => {
                                // console.log(deps[0], "2");
                                Project.update({ _id: pr._id }, { $set: { stage: deps[0].stages[0] } })
                                    .then((pr) => {
                                        // console.log(pr);
                                    })

                            })
                        // Project.update({_id : pr._id},{$set : {department : us[0].department}},{multi : true})
                        //     .then((pr)=>{
                        //         console.log(pr);
                        //     })
                    })
            })


        })
})


router.get('/checkCustomer/:id', (req, res) => {
    Customer.find({ contact_no: req.params.id })
        .then((customer) => {
            if (customer.length == 0) return res.status(404).json('Customer not found.');
            res.status(200).json('Customer exists as ' + customer[0].name);
        })
        .catch((err) => res.status(400).send(err));

})



router.post('/login', (req, res) => {
    // console.log(req.body,"body");
    Customer.findCustomerByCredentials(req.body.contact_no, req.body.password)
        .then((cust) => {
            // console.log(cust,">>>>");
            return User.generateToken(_.pick(cust, ['_id', 'name', 'email', 'customer_no', 'contact_no']));
            // res.status(200).json(token);
        })
        .then((token) => {
            res.status(200).json(token);
        })
        .catch((err) => {
            res.status(400).send(err)
        });
});

router.get('/getProjects/details', auth, (req, res) => {
    // console.log("req",req.user);
    Project.find({ customerId: req.user._id, isConverted: true })
        .select('project_no totalCustomerOutflow status stage factoryProjectNo closedBy contractSignedBy')
        .populate('customerId', 'address name')
        .populate('supervisors', 'name contact_no')
        .populate('closedBy', 'name contact_no')
        .populate('contractSignedBy', 'name contact_no')
        .lean()
        .then((projs) => {
            if (projs.length == 0) return res.status(400).json('Project not found.');
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
            // res.status(200).json(projects);
        })
        .then((projects) => {
            res.status(200).json(projects);
        })
        .catch((err)=>{
            console.log(err);
            res.status(400).send('Failed');
        })
        // .catch((err) => res.status(400).send(err));
})


router.put('/changePassword/:id', auth, (req, res) => {
    // console.log(req.body, ">>>>>")
    Customer.findById(req.params.id)
        .then((customer) => {
            return User.comparePassword(req.body.password, customer.password);
        })
        .then(() => {
            return User.encryptPassword(req.body.new_password);
        })
        .then((data) => {
            return Customer.updateOne({ _id: req.params.id }, { $set: { password: data.hash } });
        })
        .then(() => {
            res.status(200).json('Password changed successfully.');
        })
        .catch((err) => res.status(400).send(err));
});





module.exports = router;
