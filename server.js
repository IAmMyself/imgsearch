var mongo = require('mongodb').MongoClient,
	express = require('express'),
	https = require('https'),
	path = require("path"),
	mongoURI = process.env.MONGOLAB_URI,
	key = process.env.Key,
	app = express();

console.log("Booted!");

app.get("/", function(req, res) {
	res.sendfile(path.join(__dirname, "README.html"));
})

app.get("/imgsearch/*", function (req, res) {
	var path = "/customsearch/v1?q=" + encodeURIComponent(req.params[0]) + "&cx=009859638053662087588%3Apv2gad156us&num=10&searchType=image";
		
	if (req.query.offset != undefined) {
		path += "&start=" + encodeURIComponent(req.query.offset);
	}
	
	path += "&key=" + process.env.Key;
	
	var options = {
		"hostname": "www.googleapis.com",
		"path": path
	};
	
	var binging = https.get(options, function(stuff) {
		var importantStuff = [],
			everything = "";
		
		stuff.setEncoding('utf8');
		
		stuff.on("data", function (data) {
			everything += data;
		})
		
		stuff.on("end", function () {
			everything = JSON.parse(everything).items;
			
			for (var i = 0; i < everything.length; i++) {
				importantStuff.push({
					"url": everything[i].link,
					"snippet": everything[i].title,
					"thumbnail": everything[i].image.thumbnailLink,
					"context": everything[i].image.contextLink
				});
			}
			
			res.send(importantStuff);
			res.end();
		})
	});
	
	binging.on('error', function(e) {
		console.log('ERROR: ' + e.message);
		res.end('ERROR: ' + e.message);
	});
	
	mongo.connect(mongoURI, function (err, db) {
		if (err != undefined) {
			throw err;
		}
		db.collection("l-srchs").insertOne({
			"term": decodeURIComponent(req.params[0]),
			"time": Date.now()
		})
	});
});

app.get("/latest", function (req, res) {
	mongo.connect(mongoURI, function (err, db) {
		if (err != undefined) {
			throw err;
		}
		db.collection("l-srchs").aggregate([
				{ $project: { _id: 0, "time": 1, "term": 1 } },
				{ $sort: { "time": -1 } },
				{ $limit: 10 }
		]).toArray(function (err, data) {
			if (err != undefined) {
				throw err;
			}
			for (var i = 0; i < data.length; i++) {
				data[i].time = new Date(data[i].time);
			}
			
			res.send(data);
			res.end();
		});
	});
});

app.listen(process.env.PORT);