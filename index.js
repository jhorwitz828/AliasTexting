var express = require("express");
var body_parser = require("body-parser");
var catapult = require("node-bandwidth");
var app = express();

/*
*conversations is an object representing current conversations that takes the form:
*{"aliasNumber1" : {clientNum : "number1", strangerNum : "number2"},
*	"aliasNumber2" : {clientNum : "number3", strangerNum : "number4"}
*	...}
*/
var conversations = {};
var myNumbers; //a list of every phoneNumber object associated with the app
var e164Regex = /^\+1[0-9]{10,14}$/g;//check for a valid number
var applicationId = process.env.APPLICATION_ID;
var userId = process.env.CATAPULT_USER_ID;
var apiToken = process.env.CATAPULT_API_TOKEN;
var apiSecret = process.env.CATAPULT_API_SECRET;
var client = new catapult.Client(userId, apiToken, apiSecret);

/*
*On startup, must populate the conversations object with all of the
*current conversations going on. Done by getting all numbers associated
*with this application and parsing the client and stranger numbers from the
*'name' field in each phoneNumber.
*/
catapult.PhoneNumber.list(client, { applicationId : applicationId, numberState : "ENABLED" }, function (err, numbers) {
	myNumbers = numbers;
	for (var i = 0; i < numbers.length; i++){
		if(numbers[i].name){
			conversations[numbers[i].number] = JSON.parse(numbers[i].name);
		}
		else{
			conversations[numbers[i].number] = [ null, null, null ];
		}
	}
});

app.use(body_parser.json());
app.use("/", express.static("public"));

/*
*POSTs to /numbers come from the web interface and contain the fields
*'text', 'oneLiner', 'city', and 'state'. On receiving a POST to /numbers, the app searches
*for a new number in the city and state specified, orders it, and sends the client
*a text from the alias number with instructions.
*/
app.post("/numbers", function (req, res) {
	var clientNum = req.body.text;
	var city = req.body.city;
	var state = req.body.state;
	searchNumbers(city, state).then(function (numbers) {
		console.log("number search finished!");
		return orderNumber(numbers[0].number);
	}).then(function (number) {
		console.log("Number ordered");
		var alias = number.number;
		conversations[alias] = [ clientNum, null, req.body.oneLiner ];
		myNumbers.push(number);
		getNumber(alias).update({ name : JSON.stringify(conversations[alias]), applicationId : applicationId }, function(err, result) {});
		var firstMsg = "Thank you for choosing TextMe. Text your suitor's number back to this number (ex. \"+15555555555\"). Send \"GET LOST\" to erase this number";
		return sendTextFromAlias(alias, clientNum, firstMsg);
	}).then(function () {
		res.send();//return 200ok so a timeout doesn't result in multiple requests
	}).catch(function (err) {
		console.log(err.message);
		res.send(err.message).status(500);
	});
});

/*
*iterates through the list of PhoneNumber objects to find the one with the matching
*'number' field.
*/
function getNumber(number){
	for (var item of myNumbers){
		if (item.number == number){
			return item;
		}
	}
	return null;
}

/*
*Catapult post message to search and return a list of numbers matching city and state
*/
function searchNumbers(city, state){
	var promise = new Promise(function (resolve,reject) {
		catapult.AvailableNumber.searchLocal(client, { state : state, city : city }, function (err, numbers) {
			if (err) {
				console.log("failed at number search");
				reject(err);
			}
			else {
				resolve(numbers);
			}
		});
	});
	return promise;
}

/*
*Catapult call to buy a phone number and set the applicationId to this app
*/
function orderNumber(number) {
	var promise = new Promise(function (resolve, reject) {
		catapult.PhoneNumber.create(client, { number : number, applicationId : applicationId }, function (err, phoneNumber) {
			if (err) {
				console.log("failed at number order");
				reject(err);
			}
			else {
				resolve(phoneNumber);
			}
		});
	});
	return promise;
}

function sendTextFromAlias(to, number, message) {
	var promise = new Promise(function (resolve, reject) {
		catapult.Message.create(client, { from : to, to : number, text : message }, function (err, message) {
			if (err) {
				console.log("failed at text send");
				reject(err);
			}
			else {
				console.log("Message sent.");
				resolve();
			}
		});
	});
	return promise;
}

/*
*POSTs to /messages come from sms texts sent by either the client or the stranger.
*The text from the post message is parsed and sent to either the client or stranger
*depending on who sent it. If it is the first text in which the stranger number is unknown
*then stranger number is set to the text field of the sms message and the name field of the alias
*is updated to include the new stranger number
*/
app.post("/messages", function (req, res) {
	console.log("Got post message");
	var clientNum = conversations[req.body.to][0];
	var strangerNum = conversations[req.body.to][1];
	var text;
	//this only checks if strangerNum is null and that the client isn't deleting the number.
	//it would be better to also check if req.body.text is a valid number
	if (!strangerNum && (req.body.text.toUpperCase() !== "GET LOST")) {
		if(req.body.text.match(e164Regex)){
			strangerNum = req.body.text;
			conversations[req.body.to][1] = strangerNum;
			getNumber(req.body.to).update({ name : JSON.stringify(conversations[req.body.to]), applicationId : applicationId }, function(err, result){});
			text = conversations[req.body.to][2];
			sendTextFromAlias(req.body.to, req.body.from === clientNum ? strangerNum : clientNum, text);
		}
		else{
			sendTextFromAlias(req.body.to, clientNum, "TextMe: Invalid Number Format. Please send number in the form \"+15555555555\"");
		}
	}
	else {
		text = req.body.text;
		if(text.toUpperCase() === "GET LOST" && req.body.from === clientNum){
			getNumber(req.body.to).delete(function (err, result){
				if(err){
					sendTextFromAlias(req.body.to, clientNum, "TextMe: Failed to delete");
				}
				else{
					//Number to use for notifications from the app.
					sendTextFromAlias(process.env.TEXTING_APP_NOTIFICATION_NUMBER, clientNum, "TextMe: Successfully deleted alias. Thank you for choosing TextMe");
				}
			});
		}
		else{
			sendTextFromAlias(req.body.to, req.body.from === clientNum ? strangerNum : clientNum, text);
		}
	}
	res.send();
});

//the app is locally hosted at port 8081, or set to an environmental variable by the host
var server = app.listen(process.env.PORT || 8081, function () {

	var host = server.address().address;
	var port = server.address().port;

	console.log("Example app listening at http://%s:%s", host, port);

});

module.exports = app;
