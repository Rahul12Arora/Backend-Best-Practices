const express = require('express')
const router = express.Router()
const Location = require('../models/location')

router.post('/', async (req, res) => {
  try {
    req.body.orgId = req.user.orgId
    const location = new Location(req.body)
    await location.save()
    return res.status(200).json('Location added successfully')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.get('/', async (req, res) => {
  try {
    const location = await Location.find({})
    if (location.length === 0) return res.status(404).json({ message: 'No Location data found' })
    return res.status(200).json(location)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/:id', async (req, res) => {
  try {
    await Location.findByIdAndUpdate(req.params.id, { $set: req.body })
    return res.status(200).json('Location Updated')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id)
    return res.status(200).json('Location Deleted')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})
module.exports = router