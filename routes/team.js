const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authentication');
const Department = require('../models/department');
const User = require('../models/user');
const Team = require('../models/team');


router.post('/new', (req, res) => {
    // if (req.user.role != 'Admin') return res.status(400).send('Only admin can create team.');
    Team.findOne({ name: req.body.name })
        .then((team) => {
            if (team) return res.status(400).send('Team already exist.');
            team = new Team({
                name: req.body.name,
                departmentId: req.body.departmentId
            });
            return team.save();
        })
        .then((team) => {
            var query = { _id: team.departmentId };
            var data = { $push: { "teams": team._id } }
            if (team) {
                return Department.update(query, data, { multi: false });
            }
        })
        .then((dept) => {
            res.status(200).json("successfully created");
        })
        .catch((err) => res.status(400).send(err));
});



router.get('/all', (req, res) => {
    Team.find({})
        .populate('departmentId', 'name')
        .populate('users', 'name')
        .then((teams) => {
            if (teams.length == 0) return res.status(400).json('No teams found.');
            res.status(200).send(teams);
        })
        .catch((err) => res.status(400).send(err));

})


// Deactivate a user
router.put('/deactivate/:id', auth, (req, res) => {
    Team.findById(req.params.id)
        .select('isActive')
        .then((team) => {
            if (team && team.isActive) {
                team.isActive = false;
            } else {
                team.isActive = true;
            }
            return team.save();
        })
        // .then(() => {
        //     return Department.update({ teams: req.params.id }, { $pull: { teams: req.params.id } });
        // })
        .then(() => {
            res.status(200).json('Team Updated Successfully');
        })
        .catch((err) => res.status(400).send(err));
});


// router.get('/getTeamsofDept/:id', (req, res) => {
//     let deptId = req.params.id;
//     Team.find({ departmentId: deptId })
//         .select('name')
//         .then((teams) => {
//             console.log(teams, "team");
//             res.status(200).send(teams);
//         })
//         .catch((err) => res.status(400).send(err));


// })

router.get('/getTeamofUser/:id',async(req,res)=>{
    try{
        let teamId = req.params.id
    let teams = await Team.findById(teamId)
    .populate({ path: 'users', populate: { path: 'roles', select: 'name _id' }, select:'name' })
    res.status(200).send(teams)
    }catch(err){
        res.status(400).send(err)
    }
})

module.exports = router;
