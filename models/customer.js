'use strict';
const mongoose = require('mongoose');
const User = require('../models/user');
const Schema = mongoose.Schema;


const CustomerSchema = new mongoose.Schema({
    customer_no: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
        // trim: true
    },
    email: {
        type: String,
        default: '',
        required: true,
        lowercase: true
    },
    contact_no: {
        type: String,
        required: true,
        // unique: true
    },
    address: {
        type: String,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
});

CustomerSchema.index({
    name: 'text',
    email: 'text'
});
CustomerSchema.plugin(require('mongoose-timestamp'));
CustomerSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const Customer = module.exports = mongoose.model('Customer', CustomerSchema);


Customer.findByEmailAndMobile = function (email, contact_no, customer_no) {
    return Customer.findOne({ email })
        .then((user) => {
            if (user) return Promise.reject('Email already exists.');
            return Customer.findOne({ contact_no })
        })
        .then((user) => {
            if (user) return Promise.reject('Contact no already exists.');
            return Customer.findOne({ customer_no })
        })
        .then((user) => {
            if (user) return Promise.reject('Customer no already exists.');
        });
}

Customer.findCustomerById = function (id) {
    return Customer.findById(id)
        .select('name email contact_no address customer_no')
        .then((customer) => {
            if (customer) return customer;
            reject('Customer not found.');
        });
}


Customer.findCustomerByCredentials = function (contact_no, password) {
    return Customer.findOne({ contact_no })
        .then((customer) => {
            // console.log(customer,"full")
            if (!customer) return Promise.reject('Customer not found.');
            // if (!user.isActive) return Promise.reject('User is deactivated.');
            return User.comparePassword(password, customer.password)
                .then((res) => {
                    // console.log(res,"resss")
                    // return customer.token;
                    // console.log(customer,"fullyyyy",res)
                    return customer;
                })
            // .catch((err) =>console.log(err,"error"));
        });
}

// Customer.comparePassword = function (candidatePassword, password) {
//     return new Promise((resolve, reject) => {
//         bcrypt.compare(candidatePassword, password, (err, isMatch) => {
//             if (isMatch) return resolve(isMatch);
//             reject('Wrong password.');
//         });
//     });
// }