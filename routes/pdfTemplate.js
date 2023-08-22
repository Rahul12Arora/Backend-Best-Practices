const express = require('express');
const router = express.Router();

const PdfTemplate = require('../models/pdfTemplate');


router.post('/new', (req, res) => {
    pdfTemplate = new PdfTemplate(req.body);
    pdfTemplate.save()
        .then(() => {
            res.send('saved');
        })
        .catch((err) => res.send(err));
});


module.exports = router;