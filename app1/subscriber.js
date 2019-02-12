// required node modules
const express = require('express')
const app = express()
const bodyParser=require('body-parser')
const request = require("request")
const cors =require('cors')

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs')
app.listen(5502);

var webSocketServer = require('websocket').server;
var http = require('http');
var server = http.createServer(function(request, response) {});

wsServer = new webSocketServer({
httpServer: server
});

server.listen(1338, function() {
console.log((new Date()) + " Server is listening on port "
+ 1338);
});


var connection;

wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin '
  + request.origin + '.');

  connection = request.accept(null, request.origin);
});
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://10.5.0.5:5500');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
//Get method to show homepage
app.get('/', function (request, response) {
	response.render('subscriber');
	});


var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://10.5.0.7:27017/pub-sub";

MongoClient.connect(url, function(err, db) {
	if (err) throw err;
	var dbo = db.db("pub-sub");    //creating database named pub-sub
	dbo.createCollection("topic_article_data", function(err, res) {
		if (err) throw err;
    	console.log("topic_article_data Collection created!");
		});
	dbo.createCollection("subscriber_topic_data", function(err,res){
		if (err) throw err;
	});

app.post('/',function (request, res){
	dbo.collection("subscriber_topic_data").find({subscriber:request.body.subscriber}).toArray(function(err, result) 
	{
    	if (err) throw err;
    	database_query=result[0];
    	console.log(database_query)
    	if (database_query)
    	{
    		if(database_query.topic.indexOf(request.body.topic) < 0){
    			database_query.topic.push(request.body.topic);
    			dbo.collection('subscriber_topic_data').update({subscriber: request.body.subscriber},{$set :{topic:database_query.topic}});
    		}
    	}
		else
		{
			dbo.collection("subscriber_topic_data").insertOne({subscriber: request.body.subscriber,topic: [request.body.topic] }, function(err,res){
			if (err) throw err;
			});
		}
	})
   })


app.post('/subscriber', function (req, res) {
  var query = {topic:req.body.topic};
  var notifyResponse = { article: req.body.article,topic:req.body.topic};
  dbo.collection("topic_article_data").find(query).toArray(function(err, result) {
      if (err) throw err;
      database_query=result[0];
      if (database_query)
      {
        database_query.article.push(req.body.article)
        dbo.collection('topic_article_data').update({topic:req.body.topic},{$set :{article:database_query.article}});
      }
    else
    {
      dbo.collection("topic_article_data")
      .insertOne({ topic: req.body.topic , article: [req.body.article]}, function(err, res) {
      if (err) throw err;
        })
    }

  })

	dbo.collection("subscriber_topic_data").find({ topic: { "$in" : [req.body.topic]} }).toArray(function(err,result){
      notifyResponse["topicSubscribers"] = result;
      request.post("http://10.5.0.6:4402/notify", { json: notifyResponse },function(){

    });
      connection.sendUTF(JSON.stringify(notifyResponse));
  })
})//close of post/subscriber

app.post('/showsubscriptions',async function (request, response){

  currentSubscriber=request.body.subscriber;
	var topics = await dbo.collection("subscriber_topic_data").aggregate([

  { 
    $match: 
      {
       "subscriber": currentSubscriber 
      }
  },

	{
		$lookup:
       {
         from: "topic_article_data",
         localField: "topic",
         foreignField: "topic",
         as: "topicArticles",
         
       }
   },
   {
      $replaceRoot: 
      { 
      	newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$topic_article_data", 0 ] }, "$$ROOT" ] } 
      }
   },

	]).toArray();
	console.log(topics);
	console.log(topics[0].topicArticles);
	response.end(JSON.stringify(topics));
	});

app.post('/notify', function(request,response){
  connection.sendUTF(JSON.stringify(request.body));
});

	
})//close of mongodb
