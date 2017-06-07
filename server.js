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

//---define functions and variables---
let results = [];//array containing the results returned by the search engine

function process_returned_api(body){
    for(var i = 0; i < body.items.length; i++) {
        let temp_obj = { 
            url: body.items[i].link,
            snippet: body.items[i].snippet,
            context: body.items[i].image.contextLink,
            thumbnail: body.items[i].image.thumbnailLink
        };
        results.push(temp_obj);
    }
    console.log("added " + body.items.length);
    return results.length;
}

function record_search_term(search_term) {
    let current_time = new Date().toISOString();
    let doc = {term: search_term,
               when: current_time};
    db.collection(collection).insert(doc, function(err) {
        if (err) throw err;
        console.log("inserted:\n" + JSON.stringify(doc));
    });

}
//---manage routes---
app.get('/', function(req, res) {
    app.locals.api1_str = req.protocol + '://' + req.get('host') + '/api/imagesearch/funny cats?offset=10';
    app.locals.api2_str = req.protocol + '://' + req.get('host') + '/api/latest/imagesearch';
    res.render('index.ejs');
});

app.get('/api/imagesearch/:search_term', function (req, res) {

    // let api_key = "AIzaSyCPlMgKFC0GX3rwPWB0QAey7RaOa-utPIo";
    // let engine_id = "006811343498659658024:gy0ixlper_o";
    let api_key = "AIzaSyCactui5yGvKQcQ7fpPG0UmAmyEu1ILBJw";
    let engine_id = "006811343498659658024:efd0a_t02tc";

    let search_term = req.params.search_term;
    record_search_term(search_term);

    let num_results = req.query.offset || 10; //set no. of results returned to 10 if the user do not enter a query (e.g., ?offset=10)
    let num_res_per_query = 10; //no. of results returned per query
    let num_queries = Math.floor(num_results/num_res_per_query); //no. of queries made
    let num_res_last_query = num_results % num_res_per_query; //no. of results returned by last query
    if (num_res_last_query != 0){
        num_queries += 1; //make another query
    }
    let start_idx = 1; //select the order of the results returned

    //making queries
    for(var i = 1; i <= num_queries; i++) {
        let num_temp = 5;
        if (i == num_queries && num_res_last_query != 0) {//last query
            num_temp = num_res_last_query; 
        } else {
            num_temp = num_res_per_query;
        }
        console.log("num_temp " + num_temp);
        let req_link = "https://www.googleapis.com/customsearch/v1?key=" + api_key +
            "&cx=" + engine_id +
            "&q=" + search_term +
            "&num=" + num_temp +
            "&start=" + start_idx +
            "&searchType=image";
        console.log("start index " + start_idx);
        request(req_link, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let temp_num_results = process_returned_api(JSON.parse(body));
                if (temp_num_results == num_results){
                    res.end(JSON.stringify(results));//send the results and end the response
                    console.log("sent " + results.length + " and reset");
                    results = []; //reset the variable for the next search
                }
            }
        });
        start_idx += num_temp; //update stat_idx for subsequent queries
    }

    //set a time-out to wait for the results to arrive
    setTimeout(function(){ 
        res.end(JSON.stringify({error: "This takes too long to process your request, please try reducing the offset variable"}));
        console.log(results);
    }, 3000);
});


app.get('/api/latest/imagesearch/', function (req, res) {
    let num_records = 10; //the number of records returned
    db.collection(collection)
        .find({},{_id:0}) //do not return id
        .sort({$natural:-1}) //descending according to added time
        .limit(num_records)
        .toArray(function(err, documents) {
            if (err) throw err;
            res.end(JSON.stringify(documents));
            console.log("returned " + documents.length + " records");
        });
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
