require('dotenv').config()
const express = require('express');                
const cors = require('cors');
const bodyparser = require('body-parser');
const passport = require('passport');
const nocache = require('nocache');
const fileUpload = require('express-fileupload');


const app = express();


const port = process.env.PORT || 5003;

// Checking application environment
// console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`NODE_ENV: ${app.get('env')}`);

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

//Adding middleware

app.use(cors());
app.use(bodyparser.json({ limit: '50mb', extended: true }));
// bodyParser = {
//     json: { limit: '50mb', extended: true },
//     urlencoded: { limit: '50mb', extended: true }
// }
// app.use(bodyParser);
app.use(nocache());
app.use(express.static(__dirname + '/dist/quotationTool/'));
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());

require('./config/passport')(passport);
require('./startup/routes')(app);
require('./startup/db')();

if (process.env.NODE_ENV == 'production') {
    require('./startup/prod')(app);
}

app.listen(port, () => {
    console.log('Server started at port ' + port);
});
