const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authentication');
const roleService = require('../services/role.service');
const Department = require('../models/department');


router.get('/getCounts', auth, (req, res) => {
    Department.findById(req.user.department)
        .select('name')
        .then((dept) => {
            // return roleService.getCounts(req.user, dept.name);
            if (dept) {
                return roleService.getCounts(req.user, dept.name);
            } else {
                return roleService.getCounts(req.user,null);
            }
        })
        .then((counts) => {
            res.status(200).send(counts);
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });

    // roleService.getCounts(req.user)
    //     .then((count) => {
    //         res.status(200).send(count);
    //     })
    //     .catch((err) => {
    //         console.log(err);
    //         res.status(400).send(err)
    //     });
});


module.exports = router;

