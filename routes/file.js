const express = require('express');
const router = express.Router();

const Quotation = require('../models/quotation');
const S3 = require('../services/s3.service');
const aws = require('../config/aws');


router.post('/upload', function (req, res) {
    let bucketName = aws.quotation.BUCKET_NAME;
    if (req.query.type == 'po') {
        bucketName = aws.po.BUCKET_NAME;
    }
    else if (req.query.type == 'attachment') {
        bucketName = aws.attachment.BUCKET_NAME;
    }
    else if (req.query.type == 'images') {
        bucketName = aws.quotation_images.BUCKET_NAME;

    }
    else if (req.query.type == 'vendorDocs') {
        bucketName = `${aws.vendor_docs.BUCKET_NAME}/Vendors`;
    }
    else if (req.query.type == 'designKickOffDocs')
    {
        bucketName = aws.designKickOffCustomer_docs.BUCKET_NAME
    }

    return S3.uploadToS3(req, bucketName)
        .then((file_location) => {
            if (req.query.type == 'attachment' || req.query.type == 'images' || req.query.type == 'vendorDocs' || req.query.type == 'designKickOffDocs') {
                res.status(200).json(file_location);
                return;
            }
            res.send(file_location);
            return file_location;
        })
        .catch((err) => { 
            res.status(500).send(err) 
        });
});


router.get('/download/:id', (req, res) => {
    Quotation.findById(req.params.id)
        .select('s3Location -_id')
        .then((quotation) => {
            if (!quotation) return res.status(404).json('No quotation found.');
            res.status(200).send(quotation.s3Location);
        })
        .catch((err) => res.status(500).send(err));
});


module.exports = router;

