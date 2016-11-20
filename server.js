var mongo = require('mongodb').MongoClient,
	express = require('express'),
	https = require('https'),
	mongoURI = process.env.MONGOLAB_URI,
	key = process.env.Key,
	app = express();
	
function getUrl (str) {
	//currently formatted to get URL from Bing API
	var position = [str.search("&r=") + 3, str.search("&p=")];
	
	return decodeURIComponent(str.slice(position[0], position[1]));
}

console.log("Booted!");

app.get("/imgsearch/*", function (req, res) {
	var path = "/bing/v5.0/images/search?q=" + encodeURIComponent(req.params[0]) + "&count=10";
		
	if (req.query.offset != undefined) {
		path += "&offset=" + encodeURIComponent(req.query.offset);
	}
	
	var options = {
		"hostname": "api.cognitive.microsoft.com",
		"path": path,
		"headers": {
			"Content-Type": "multipart/form-data",
			"Ocp-Apim-Subscription-Key": key
		}
	};
	
	var binging = https.get(options, function(stuff) {
		var importantStuff = [],
			everything = "";
		
		stuff.setEncoding('utf8');
		
		stuff.on("data", function (data) {
			everything += data;
		})
		
		stuff.on("end", function () {
			everything = JSON.parse(everything).value;
			
			for (var i = 0; i < everything.length; i++) {
				importantStuff.push({
					"url": getUrl(everything[i].contentUrl),
					"snippet": everything[i].name,
					"thumbnail": everything[i].thumbnailUrl,
					"context": getUrl(everything[i].hostPageUrl)
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