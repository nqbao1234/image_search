let express = require('express');
let app = express();
let request = require('request');

let mongo = require('mongodb').MongoClient;
let db_url = process.env.MONGOLAB_URI; //this needs to be set on heroku
let collection = "images";

//initial connect to the database
let db = null;
mongo.connect(db_url, function(err, db_temp) {
    if (err) throw err;
    db = db_temp;
});

app.set('port', (process.env.PORT || 5000));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('index.ejs');
});



app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
