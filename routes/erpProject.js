const express = require('express');
const router = express.Router();
const Lead = require("../models/lead");
const Project = require("../models/project");
const constants = require('../utils/constants');

router.get("/imosproject", async (req, res) => {
    try {
        const getImosProject = await Project.find({ stauts: constants.ProjectStatus.imos }).sort({updatedAt: -1}).lean();
        res.status(200).send(getImosProject);
    } catch (error) {
        res.status(400).send(error.message)
    }
});


module.exports = router;