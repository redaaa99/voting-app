var port = process.env.PORT || 8000;
var db = "mongodb://localhost:27017/free-code-camp-voting"
var router = require('./routes/api');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var app = express();


// Mongoose connection events

mongoose.connect(db, function(err) {
    if(err) {
        throw new Error(err)
    }
});

mongoose.connection.on('connected', function() {
    console.log('Successfully connected to ' + db);
});
mongoose.connection.on('disconnected', function() {
    console.log('Successfully disconnected from' + db);
});
mongoose.connection.on('error', function() {
    console.log('Error connecting to ' + db);
});

// Node process event to fire upon manual shutdown of application

process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        console.log('Mongoose default connection disconnected through application termination');
        process.exit(0)
    });
});

// Node process event to fire on forced termination of application

process.on('exit', function(code) {
    console.log('Node process closed with a code of ' + code)
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(morgan('short'))
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/public'));
app.use('/api', router);
app.get("*", function(request, response) {
    response.sendFile(__dirname + '/public/index.html');
});

app.listen(port, function() {
    console.log('Listening on port ' + port);
});