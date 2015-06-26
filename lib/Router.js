"use strict";

var bodyParser = require("body-parser");
var catapult = require("node-bandwidth");
var express = require("express");


var Router = function () {
	/*
	*conversations is an object representing current conversations that takes the form:
	*{"aliasNumber1" : {clientNum : "number1", strangerNum : "number2"},
	*	"aliasNumber2" : {clientNum : "number3", strangerNum : "number4"}
	*	...}
	*/
	var conversations = {};
	var e164Regex = /^\+1[0-9]{10,14}$/g;//check for a valid number
	var applicationId = process.env.APPLICATION_ID;
	var userId = process.env.CATAPULT_USER_ID;
	var apiToken = process.env.CATAPULT_API_TOKEN;
	var apiSecret = process.env.CATAPULT_API_SECRET;
	var client = new catapult.Client(userId, apiToken, apiSecret);
	var router = express.Router();
	var self = this;

	this.initialize = function () {
		var promise = new Promise(function (resolve, reject) {
			/*
			*On startup, must populate the conversations object with all of the
			*current conversations going on. Done by getting all numbers associated
			*with this application and parsing the client and stranger numbers from the
			*'name' field in each phoneNumber.
			*/
			catapult.PhoneNumber.list(client, {
			applicationId : applicationId,
			numberState   : "ENABLED" }, function (err, numbers) {
				if (err) {
					reject(err);
				}
				else {
					self.myNumbers = numbers;
					for (var i = 0; i < numbers.length; i += 1){
						if (numbers[i].name){
							conversations[numbers[i].number] = JSON.parse(numbers[i].name);
						}
						else {
							conversations[numbers[i].number] = [ null, null, null ];
						}
					}
					resolve();
				};
			});
		});
		return promise;
	};

	router.use(bodyParser.json());
	router.use("/", express.static("public"));

	/*
	*iterates through the list of PhoneNumber objects to find the one with the matching
	*'number' field.
	*/
	this.getNumber = function (number) {
		for (var i = 0; i < this.myNumbers.length; i += 1){
			if (this.myNumbers[i].number === number){
				return this.myNumbers[i];
			}
		}
		return null;
	}

	/*
	*Catapult post message to search and return a list of numbers matching city and state
	*/
	this.searchNumbers = function (city, state) {
		var promise = new Promise(function (resolve,reject) {
			catapult.AvailableNumber.searchLocal(client, { state : state, city : city }, function (err, numbers) {
				if (err) {
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
	this.orderNumber = function (number) {
		var promise = new Promise(function (resolve, reject) {
			catapult.PhoneNumber.create(client, { number : number, applicationId : applicationId }, function (err, phoneNumber) {
				if (err) {
					reject(err);
				}
				else {
					resolve(phoneNumber);
				}
			});
		});
		return promise;
	}

	this.sendTextFromAlias = function (alias, number, message) {
		var promise = new Promise(function (resolve, reject) {
			catapult.Message.create(client, { from : alias, to : number, text : message }, function (err, message) {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
		return promise;
	}

	/*
	*POSTs to /numbers come from the web interface and contain the fields
	*'text', 'oneLiner', 'city', and 'state'. On receiving a POST to /numbers, the app searches
	*for a new number in the city and state specified, orders it, and sends the client
	*a text from the alias number with instructions.
	*/
	router.post("/numbers", function (req, res) {
		var clientNum = req.body.text;
		var city = req.body.city;
		var state = req.body.state;
		self.searchNumbers(city, state).then(function (numbers) {
			return self.orderNumber(numbers[0].number);
		}).then(function (number) {
			var alias = number.number;
			conversations[alias] = [ clientNum, null, req.body.oneLiner ];
			self.myNumbers.push(number);
			self.getNumber(alias).update({
				name : JSON.stringify(conversations[alias]), applicationId : applicationId }, function (err, result) {});
			var firstMsg = "Thank you for choosing TextMe. Reply with your contact's number (ex. \"+15555555555\"). " +
			"Send \"Get lost\" to erase this number";
			return self.sendTextFromAlias(alias, clientNum, firstMsg);
		}).then(function () {
			res.send();//return 200ok so a timeout doesn't result in multiple requests
		}).catch(function (err) {
			res.status(500).send(err.message);
		});
	});

	/*
	*POSTs to /messages come from sms texts sent by either the client or the stranger.
	*The text from the post message is parsed and sent to either the client or stranger
	*depending on who sent it. If it is the first text in which the stranger number is unknown
	*then stranger number is set to the text field of the sms message and the name field of the alias
	*is updated to include the new stranger number
	*/
	router.post("/messages", function (req, res) {
		var clientNum = conversations[req.body.to][0];
		var strangerNum = conversations[req.body.to][1];
		var text;
		//this only checks if strangerNum is null and that the client isn't deleting the number.
		//it would be better to also check if req.body.text is a valid number
		if (!strangerNum && (req.body.text.toUpperCase() !== "GET LOST") && req.body.from === clientNum) {
			if (req.body.text.match(e164Regex)){
				strangerNum = req.body.text;
				conversations[req.body.to][1] = strangerNum;
				self.getNumber(req.body.to).update({
					name : JSON.stringify(conversations[req.body.to]), applicationId : applicationId }, function (err, result) {});
				text = conversations[req.body.to][2];
				self.sendTextFromAlias(req.body.to, strangerNum, text);
			}
			else {
				var unsuccessfulDelete = "TextMe: Invalid Number Format. Please send number in the form \"+15555555555\"";
				self.sendTextFromAlias(req.body.to, clientNum, unsuccessfulDelete);
			}
		}
		else {
			text = req.body.text;
			if (text.toUpperCase() === "GET LOST" && req.body.from === clientNum){
				self.getNumber(req.body.to).delete(function (err, result) {
					if (err) {
						self.sendTextFromAlias(req.body.to, clientNum, "TextMe: Failed to delete");
					}
					else {
						//Number to use for notifications from the app.
						var successfulDelete = "TextMe: Successfully deleted alias. Thank you for choosing TextMe";
						self.sendTextFromAlias(process.env.TEXTING_APP_NOTIFICATION_NUMBER, clientNum, successfulDelete);
					}
				});
			}
			else {
				self.sendTextFromAlias(req.body.to, req.body.from === clientNum ? strangerNum : clientNum, text);
			}
		}
		res.send();
	});
	this.router = router;
};

module.exports = Router;
