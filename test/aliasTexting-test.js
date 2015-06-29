"use strict";

var express = require("express");
var Router = require("../lib/Router");
var supertest = require("supertest");
var nock = require("nock");
var catapult = require("bandwidth");

//nock.recorder.rec();
var app = express();

describe("TextApp", function () {
	var router;
	before(function () {
		router = new Router();
		app.use("/", router.router);
	});
	it("should serve the HTML page", function (done) {
		supertest(app)
			.get("/")
			.expect("Content-Type", /html/)
			.expect(200)
			.end(done);
	});
	after(function () {
		nock.cleanAll();
	});
	describe("should test the initialize function", function () {
		var api;
		before(function () {
			api = nock("https://api.catapult.inetwork.com:443")
				.get("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers?applicationId=a-hvszhcwftsdr6khcn4zl6my&numberState=ENABLED")
				.reply(200, [ { "application" :"https://api.catapult.inetwork.com/v1/users/" +
				"u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
					"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+15123879534",
					"nationalNumber" :"(512) 387-9534",
					"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
					"createdTime" :"2015-06-24T14:01:07Z","city" :"AUSTIN",
					"state" :"TX","price" :"0.25","numberState" :"enabled" },
					{ "application" :"https://api.catapult.inetwork.com/v1/users/" +
					"u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
					"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+19196513853",
					"nationalNumber" :"(919) 651-3853",
					"createdTime" :"2015-06-24T14:01:07Z","city" :"CARY",
					"state" :"NC","price" :"0.25","numberState" :"enabled" },
					{ "application" :"https://api.catapult.inetwork.com/v1/users/" +
					"u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
					"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530",
					"nationalNumber" :"(512) 387-7530",
					"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
					"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN",
					"state" :"TX","price" :"0.25","numberState" :"enabled" } ],
					{ "cache-control"   : "no-cache",
					"content-type"      : "application/json",
					date                : "Wed, 24 Jun 2015 18:41:27 GMT",
					link                : "<https://api.catapult.inetwork.com/v1/users/" +
					"u-37oyq5ser536gujhptoks6y/phoneNumbers?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
					server              : "Jetty(8.1.10.v20130312)",
					"transfer-encoding" : "chunked",
					connection          : "Close" });
		});
		it("should resolve successfully", function (done) {
			router.initialize().then(function () {
				api.isDone().should.equal(true);
				done();
			});
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should handle errors on the initialize function", function () {
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
				.get("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers?applicationId=a-hvszhcwftsdr6khcn4zl6my&numberState=ENABLED")
				.reply(500,
					{ "cache-control"   : "no-cache",
					"content-type"      : "application/json",
					date                : "Wed, 24 Jun 2015 18:41:27 GMT",
					link                : "<https://api.catapult.inetwork.com/v1/users/" +
					"u-37oyq5ser536gujhptoks6y/phoneNumbers?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
					server              : "Jetty(8.1.10.v20130312)",
					"transfer-encoding" : "chunked",
					connection          : "Close" });
		});
		it("should reject with an error", function (done) {
			router.initialize()
			.then(function () {})
			.catch(function (err) {
				err.httpStatus.should.equal(500);
				done();
			});
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should search for numbers", function () {
		var nums;
		before(function (done) {
			nock("https://api.catapult.inetwork.com:443")
				.get("/v1/availableNumbers/local?state=NC&city=Cary")
				.reply(200, [ { "number" :"+19192300062","nationalNumber" :"(919) 230-0062","city" :"CARY","rateCenter" :"CARY",
				"state" :"NC","price" :"0.25" } ],
				{ "cache-control" : "no-cache",
				"content-type"    : "application/json",
				date              : "Mon, 22 Jun 2015 17:38:50 GMT",
				server            : "Jetty(8.1.10.v20130312)",
				"content-length"  : "1281",
				connection        : "Close" });
			router.searchNumbers("Cary", "NC")
				.then(function (numbers) {
					nums = numbers;
					done();
				});
		});
		it("should be an array", function () {
			(nums instanceof Array).should.equal(true);
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should handle failures on searchNumber", function () {
		var nums;
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
			.get("/v1/availableNumbers/local?state=NC&city=Cary")
			.reply(500,
			{ "cache-control" : "no-cache",
			"content-type"    : "application/json",
			date              : "Mon, 22 Jun 2015 17:38:50 GMT",
			server            : "Jetty(8.1.10.v20130312)",
			"content-length"  : "1281",
			connection        : "Close" });
		});
		it("should reject with an error message", function (done) {
			router.searchNumbers("Cary", "NC")
				.then(function (numbers) {
					done("Should not have worked");
				})
				.catch(function (err) {
					err.httpStatus.should.equal(500);
					done();
				});
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should order a number", function () {
		var phone_number;
		before(function (done) {
			var numPayload = { "application" :"https://api.catapult.inetwork.com/v1/users/" +
			"u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
			"id" :"n-o2kocmxfxjvnakyjcg6yssy",
			"number" :"+19195359833","nationalNumber" :"(919) 535-9833",
			"createdTime" :"2015-06-23T13:09:42Z","city" :"CARY",
			"state" :"NC","price" :"0.25","numberState" :"enabled" };

			nock("https://api.catapult.inetwork.com:443")
			.filteringRequestBody(function (body) {
				return "abc";
			})
			.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers", "abc")
			.reply(201, numPayload,
			{ "cache-control"   : "no-cache",
			"content-type"      : "application/json",
			date                : "Tue, 23 Jun 2015 13:09:43 GMT",
			server              : "Jetty(8.1.10.v20130312)",
			"transfer-encoding" : "chunked",
			connection          : "Close",
			location            : "/abc"
			})
			.get("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/abc")
			.reply(200, numPayload,
			{ "cache-control"   : "no-cache",
			"content-type"      : "application/json",
			date                : "Tue, 23 Jun 2015 13:09:43 GMT",
			server              : "Jetty(8.1.10.v20130312)",
			"transfer-encoding" : "chunked",
			connection          : "Close",
			location            : "/abc" });
			router.orderNumber("+19195359833")
				.then(function (number) {
					phone_number = number;
					done();
				});
		});
		it("should have an update function", function () {
			(phone_number.update instanceof Function).should.equal(true);
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should handle failures on orderNumber", function () {
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
			.filteringRequestBody(function (body) {
				return "abc";
			})
			.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers", "abc")
			.reply(500);
		});
		it("should reject with an error message", function (done) {
			router.orderNumber("+19195359833")
				.then(function (number) {
					done("Should not have worked");
				})
				.catch(function (err) {
					err.httpStatus.should.equal(500);
					done();
				});
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should find a matching number from a list of phone numbers", function () {
		it("should return an object with a matching number field", function () {
			var expected_result = { "number" :"+19195359833",
			"nationalNumber" :"(919) 535-9833","city" :"CARY","rateCenter" :"CARY",
			"state" :"NC","price" :"0.25" };
			router.myNumbers = [ expected_result ];
			var phone_number = router.getNumber("+19195359833");
			phone_number.should.equal(expected_result);
		});
		it("should return null if number requested is not present", function () {
			(router.getNumber("+10000000000") === null).should.equal(true);
		});
	});
	describe("should send a text message from alias phone number", function () {

		var message_reply = [ { "application" :"https://api.catapult.inetwork.com/v1/" +
		"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
			"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+15123879534",
			"nationalNumber" :"(512) 387-9534",
			"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
			"createdTime" :"2015-06-24T14:01:07Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
			"numberState" :"enabled" },
			{ "application" :"https://api.catapult.inetwork.com/v1/" +
			"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
			"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
			"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
			"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
			"numberState" :"enabled" } ];

		var headers = { "cache-control" : "no-cache",
		"content-type"                  : "application/json",
		date                            : "Wed, 24 Jun 2015 15:02:50 GMT",
		link                            : "<https://api.catapult.inetwork.com/v1/" +
		"users/u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
		server                          : "Jetty(8.1.10.v20130312)",
		"transfer-encoding"             : "chunked",
		connection                      : "Close",
		location                        : "/abc" };

		var message_payload = { "from" :"+15123879534","to" :"+18283290994","text" :"Test Message" };
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
			.filteringRequestBody(function (body) {
				return "abc";
			})
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
				.reply(201, message_reply, headers)
				.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
				.reply(200, message_payload,
				{ "cache-control"   : "no-cache",
				"content-type"      : "application/json",
				date                : "Tue, 23 Jun 2015 13:09:43 GMT",
				server              : "Jetty(8.1.10.v20130312)",
				"transfer-encoding" : "chunked",
				connection          : "Close",
				location            : "/abc" });
		});
		it("should send the text", function (done) {
			router.sendTextFromAlias("+15123879534", "+18283290994", "Test Message");
			done();
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should fail to send a text message from alias phone number", function () {

		var message_reply = [ { "application" :"https://api.catapult.inetwork.com/v1/" +
		"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
			"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+15123879534",
			"nationalNumber" :"(512) 387-9534",
			"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
			"createdTime" :"2015-06-24T14:01:07Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
			"numberState" :"enabled" },
			{ "application" :"https://api.catapult.inetwork.com/v1/users/" +
			"u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
			"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
			"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
			"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
			"numberState" :"enabled" } ];

		var headers = { "cache-control" : "no-cache",
		"content-type"                  : "application/json",
		date                            : "Wed, 24 Jun 2015 15:02:50 GMT",
		link                            : "<https://api.catapult.inetwork.com/v1/" +
		"users/u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
		server                          : "Jetty(8.1.10.v20130312)",
		"transfer-encoding"             : "chunked",
		connection                      : "Close",
		location                        : "/abc" };

		var message_payload = { "from" :"+15123879534","to" :"+18283290994","text" :"Test Message" };
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
			.filteringRequestBody(function (body) {
				return "abc";
			})
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
				.reply(500, headers);
		});
		it("should fail to send the text", function (done) {
			router.sendTextFromAlias("+15123879534", "+18283290994", "Test Message")
				.then(function (done) {
					done("should not work");
				})
				.catch(function (err) {
					err.httpStatus.should.equal(500);
				});
			done();
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should search, order, and text a number", function () {
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
				.get("/v1/availableNumbers/local?state=NC&city=Cary")
				.reply(200, [ { "number" :"+19192300062","nationalNumber" :"(919) 230-0062","city" :"CARY","rateCenter" :"CARY",
				"state" :"NC","price" :"0.25" } ],
				{ "cache-control" : "no-cache",
				"content-type"    : "application/json",
				date              : "Mon, 22 Jun 2015 17:38:50 GMT",
				server            : "Jetty(8.1.10.v20130312)",
				"content-length"  : "1281",
				connection        : "Close" });

			nock("https://api.catapult.inetwork.com:443")
				.get("/v1/availableNumbers/local?state=NC&city=Cary")
				.reply(200, [ { "number" :"+19192300062","nationalNumber" :"(919) 230-0062","city" :"CARY","rateCenter" :"CARY",
				"state" :"NC","price" :"0.25" } ],
				{ "cache-control" : "no-cache",
				"content-type"    : "application/json",
				date              : "Mon, 22 Jun 2015 17:38:50 GMT",
				server            : "Jetty(8.1.10.v20130312)",
				"content-length"  : "1281",
				connection        : "Close" });

			var numPayload = { "application" :"https://api.catapult.inetwork.com/v1/" +
			"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
			"id" :"n-o2kocmxfxjvnakyjcg6yssy",
			"number" :"+19192300062","nationalNumber" :"(919) 230-0062",
			"createdTime" :"2015-06-23T13:09:42Z","city" :"CARY",
			"state" :"NC","price" :"0.25","numberState" :"enabled" };

			nock("https://api.catapult.inetwork.com:443")
				.filteringRequestBody(function (body) {
					return "abc";
				})
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers", "abc")
				.reply(201, numPayload,
				{ "cache-control"   : "no-cache",
				"content-type"      : "application/json",
				date                : "Tue, 23 Jun 2015 13:09:43 GMT",
				server              : "Jetty(8.1.10.v20130312)",
				"transfer-encoding" : "chunked",
				connection          : "Close",
				location            : "/abc"
				})
				.get("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/abc")
				.reply(200, numPayload,
				{ "cache-control"   : "no-cache",
				"content-type"      : "application/json",
				date                : "Tue, 23 Jun 2015 13:09:43 GMT",
				server              : "Jetty(8.1.10.v20130312)",
				"transfer-encoding" : "chunked",
				connection          : "Close",
				location            : "/abc" });

			nock("https://api.catapult.inetwork.com:443")
				.filteringRequestBody(function (body) {
					return "abc";
				})
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers", "abc")
				.reply(201, numPayload,
				{ "cache-control"   : "no-cache",
				"content-type"      : "application/json",
				date                : "Tue, 23 Jun 2015 13:09:43 GMT",
				server              : "Jetty(8.1.10.v20130312)",
				"transfer-encoding" : "chunked",
				connection          : "Close",
				location            : "/abc"
				})
				.get("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/abc")
				.reply(200, numPayload,
				{ "cache-control"   : "no-cache",
				"content-type"      : "application/json",
				date                : "Tue, 23 Jun 2015 13:09:43 GMT",
				server              : "Jetty(8.1.10.v20130312)",
				"transfer-encoding" : "chunked",
				connection          : "Close",
				location            : "/abc" });

			var updatePayload = { "name" :"[\"+18283290994\",null," +
			"\"Hey, how are you?\"]","applicationId" :"a-hvszhcwftsdr6khcn4zl6my" };
			nock("https://api.catapult.inetwork.com:443")
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/n-o2kocmxfxjvnakyjcg6yssy", updatePayload)
				.reply(200, "", { "cache-control" : "no-cache",
				date                              : "Thu, 25 Jun 2015 14:28:14 GMT",
				server                            : "Jetty(8.1.10.v20130312)",
				"content-length"                  : "0",
				connection                        : "Close" });

			var updatePayload2 = { "name" :"[\"+18283290994\",null," +
			"\"Hey\"]","applicationId" :"a-hvszhcwftsdr6khcn4zl6my" };
			nock("https://api.catapult.inetwork.com:443")
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/n-o2kocmxfxjvnakyjcg6yssy", updatePayload2)
				.reply(200, "", { "cache-control" : "no-cache",
				date                              : "Thu, 25 Jun 2015 14:28:14 GMT",
				server                            : "Jetty(8.1.10.v20130312)",
				"content-length"                  : "0",
				connection                        : "Close" });

			var message_reply = [ { "application" :"https://api.catapult.inetwork.com/" +
			"v1/users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+19192300062","nationalNumber" :"(919) 230-0062",
				"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
				"createdTime" :"2015-06-24T14:01:07Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
				"numberState" :"enabled" },
				{ "application" :"https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
				"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
				"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
				"numberState" :"enabled" } ];

			var headers = { "cache-control" : "no-cache",
				"content-type"                 : "application/json",
				date                           : "Wed, 24 Jun 2015 15:02:50 GMT",
				link                           : "<https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
				server                         : "Jetty(8.1.10.v20130312)",
				"transfer-encoding"            : "chunked",
				connection                     : "Close",
				location                       : "/abc" };

			var message_payload = { "from" :"+15123879534","to" :"+18283290994","text" :"Test Message" };

			nock("https://api.catapult.inetwork.com:443")
				.filteringRequestBody(function (body) {
					return "abc";
				})
					.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
					.reply(201, message_reply, headers)
					.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
					.reply(200, message_payload,
					{ "cache-control"   : "no-cache",
					"content-type"      : "application/json",
					date                : "Tue, 23 Jun 2015 13:09:43 GMT",
					server              : "Jetty(8.1.10.v20130312)",
					"transfer-encoding" : "chunked",
					connection          : "Close",
					location            : "/abc" });

			nock("https://api.catapult.inetwork.com:443")
				.filteringRequestBody(function (body) {
					return "abc";
				})
					.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
					.reply(201, message_reply, headers)
					.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
					.reply(200, message_payload,
					{ "cache-control"   : "no-cache",
					"content-type"      : "application/json",
					date                : "Tue, 23 Jun 2015 13:09:43 GMT",
					server              : "Jetty(8.1.10.v20130312)",
					"transfer-encoding" : "chunked",
					connection          : "Close",
					location            : "/abc" });
		});
		it("should retrieve and order a number from catapult, then send a text from that number", function (done) {
			var postPayload = {
				"text"     :"+18283290994",
				"city"     :"Cary",
				"state"    :"NC",
				"oneLiner" :"Hey, how are you?"
			};
			supertest(app)
				.post("/numbers")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		it("should use Cary, NC if the user doesn't specify a city, state, or oneLiner", function (done) {
			var postPayload = {
				"text" : "+18283290994"
			};
			supertest(app)
				.post("/numbers")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should catch an error when posting to /numbers", function () {
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
			.get("/v1/availableNumbers/local?state=NC&city=Cary")
			.reply(500,
			{ "cache-control" : "no-cache",
			"content-type"    : "application/json",
			date              : "Mon, 22 Jun 2015 17:38:50 GMT",
			server            : "Jetty(8.1.10.v20130312)",
			"content-length"  : "1281",
			connection        : "Close" });
		});
		it("should catch err at search numbers", function (done) {
			var postPayload = {
				"text"     :"+18283290994",
				"city"     :"Cary",
				"state"    :"NC",
				"oneLiner" :"Hey, how are you?"
			};
			supertest(app)
				.post("/numbers")
				.send(postPayload)
				.expect(500)
				.end(done);
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should handle the first post request to /messages", function () {
		before(function () {
			var updatePayload = { "name" :"[\"+18283290994\"," +
			"\"+10000000000\",\"Hey, how are you?\"]","applicationId" :"a-hvszhcwftsdr6khcn4zl6my" };
			nock("https://api.catapult.inetwork.com:443")
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/n-o2kocmxfxjvnakyjcg6yssy", updatePayload)
				.reply(200, "", { "cache-control" : "no-cache",
				date                              : "Thu, 25 Jun 2015 14:28:14 GMT",
				server                            : "Jetty(8.1.10.v20130312)",
				"content-length"                  : "0",
				connection                        : "Close" });

			var updatePayload2 = { "name" :"[\"+18283290994\"," +
			"\"+10000000000\",\"Hey\"]","applicationId" :"a-hvszhcwftsdr6khcn4zl6my" };
			nock("https://api.catapult.inetwork.com:443")
				.post("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/n-o2kocmxfxjvnakyjcg6yssy", updatePayload2)
				.reply(200, "", { "cache-control" : "no-cache",
				date                              : "Thu, 25 Jun 2015 14:28:14 GMT",
				server                            : "Jetty(8.1.10.v20130312)",
				"content-length"                  : "0",
				connection                        : "Close" });

			var message_reply = [ { "application" :"https://api.catapult.inetwork.com/v1/" +
			"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+19192300062","nationalNumber" :"(919) 230-0062",
				"name" :"[\"+18283290994\",\"+10000000000\",\"Hey, how are you?\"]",
				"createdTime" :"2015-06-24T14:01:07Z","city" :"CARY","state" :"NC","price" :"0.25",
				"numberState" :"enabled" },
				{ "application" :"https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
				"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
				"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
				"numberState" :"enabled" } ];

			var headers = { "cache-control" : "no-cache",
				"content-type"                 : "application/json",
				date                           : "Wed, 24 Jun 2015 15:02:50 GMT",
				link                           : "<https://api.catapult.inetwork.com/v1/users/" +
				"u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
				server                         : "Jetty(8.1.10.v20130312)",
				"transfer-encoding"            : "chunked",
				connection                     : "Close",
				location                       : "/abc" };

			var message_payload = { "from" :"+19192300062","to" :"+10000000000","text" :"Hey, how are you?" };

			nock("https://api.catapult.inetwork.com:443")
				.filteringRequestBody(function (body) {
					return "abc";
				})
					.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
					.reply(201, message_reply, headers)
					.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
					.reply(200, message_payload,
					{ "cache-control"   : "no-cache",
					"content-type"      : "application/json",
					date                : "Tue, 23 Jun 2015 13:09:43 GMT",
					server              : "Jetty(8.1.10.v20130312)",
					"transfer-encoding" : "chunked",
					connection          : "Close",
					location            : "/abc" });

			var message2_reply = [ { "application" :"https://api.catapult.inetwork.com/v1/" +
			"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+19192300062","nationalNumber" :"(919) 230-0062",
				"name" :"[\"+18283290994\",null,\"Hey, how are you?\"]",
				"createdTime" :"2015-06-24T14:01:07Z","city" :"CARY","state" :"NC","price" :"0.25",
				"numberState" :"enabled" },
				{ "application" :"https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
				"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
				"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
				"numberState" :"enabled" } ];

			var headers2 = { "cache-control" : "no-cache",
				"content-type"                  : "application/json",
				date                            : "Wed, 24 Jun 2015 15:02:50 GMT",
				link                            : "<https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
				server                          : "Jetty(8.1.10.v20130312)",
				"transfer-encoding"             : "chunked",
				connection                      : "Close",
				location                        : "/abc" };

			var message2_payload = { "from" :"+19192300062","to" :"+18283290994","text" :"TextMe: " +
			"Invalid Number Format. Please send number in the form \"+15555555555\"" };

			nock("https://api.catapult.inetwork.com:443")
					.filteringRequestBody(function (body) {
						return "abc";
					})
						.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
						.reply(201, message2_reply, headers2)
						.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
						.reply(200, message2_payload,
						{ "cache-control"   : "no-cache",
						"content-type"      : "application/json",
						date                : "Tue, 23 Jun 2015 13:09:43 GMT",
						server              : "Jetty(8.1.10.v20130312)",
						"transfer-encoding" : "chunked",
						connection          : "Close",
						location            : "/abc" });
		});
		it("should handle invalid input on first text", function (done) {
			var postPayload = {
				"text" :"Hey there",
				"to"   :"+19192300062",
				"from" :"+18283290994"
			};
			supertest(app)
				.post("/messages")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		it("should send the first text to the stranger and update strangerNum", function (done) {
			var postPayload = {
				"text" :"+10000000000",
				"to"   :"+19192300062",
				"from" :"+18283290994"
			};
			supertest(app)
				.post("/messages")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		after(function () {
			nock.cleanAll();
		});
	});
	describe("should handle later post requests to /messages", function () {
		before(function () {
			nock("https://api.catapult.inetwork.com:443")
				.delete("/v1/users/u-37oyq5ser536gujhptoks6y/phoneNumbers/n-o2kocmxfxjvnakyjcg6yssy")
				.reply(200, "", { "cache-control" : "no-cache",
				date                              : "Thu, 25 Jun 2015 14:28:14 GMT",
				server                            : "Jetty(8.1.10.v20130312)",
				"content-length"                  : "0",
				connection                        : "Close" });

			var message_reply = [ { "application" :"https://api.catapult.inetwork.com/" +
			"v1/users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+19192300062","nationalNumber" :"(919) 230-0062",
				"name" :"[\"+18283290994\",\"+10000000000\",\"Hey, how are you?\"]",
				"createdTime" :"2015-06-24T14:01:07Z","city" :"CARY","state" :"NC","price" :"0.25",
				"numberState" :"enabled" },
				{ "application" :"https://api.catapult.inetwork.com/v1/users/" +
				"u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
				"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
				"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
				"numberState" :"enabled" } ];

			var headers = { "cache-control" : "no-cache",
				"content-type"                 : "application/json",
				date                           : "Wed, 24 Jun 2015 15:02:50 GMT",
				link                           : "<https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
				server                         : "Jetty(8.1.10.v20130312)",
				"transfer-encoding"            : "chunked",
				connection                     : "Close",
				location                       : "/abc" };

			var message_payload = { "from" :"+19196513778","to" :"+18283290994","text" :"TextMe: " +
			"Successfully deleted alias. Thank you for choosing TextMe" };

			nock("https://api.catapult.inetwork.com:443")
				.filteringRequestBody(function (body) {
					return "abc";
				})
					.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
					.reply(201, message_reply, headers)
					.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
					.reply(200, message_payload,
					{ "cache-control"   : "no-cache",
					"content-type"      : "application/json",
					date                : "Tue, 23 Jun 2015 13:09:43 GMT",
					server              : "Jetty(8.1.10.v20130312)",
					"transfer-encoding" : "chunked",
					connection          : "Close",
					location            : "/abc" });

			var message2_reply = [ { "application" :"https://api.catapult.inetwork.com/v1/" +
			"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-kins5yioy3ih4e7le4uuexa","number" :"+19192300062","nationalNumber" :"(919) 230-0062",
				"name" :"[\"+18283290994\",\"+10000000000\",\"Hey, how are you?\"]",
				"createdTime" :"2015-06-24T14:01:07Z","city" :"CARY","state" :"NC","price" :"0.25",
				"numberState" :"enabled" },
				{ "application" :"https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/applications/a-hvszhcwftsdr6khcn4zl6my",
				"id" :"n-omcrk3jsuwwj4loovnzspyi","number" :"+15123877530","nationalNumber" :"(512) 387-7530",
				"name" :"[\"+18283290994\",null,\"Hey, it was nice meeting you tonight\"]",
				"createdTime" :"2015-06-24T13:58:42Z","city" :"AUSTIN","state" :"TX","price" :"0.25",
				"numberState" :"enabled" } ];

			var headers2 = { "cache-control" : "no-cache",
				"content-type"                  : "application/json",
				date                            : "Wed, 24 Jun 2015 15:02:50 GMT",
				link                            : "<https://api.catapult.inetwork.com/v1/" +
				"users/u-37oyq5ser536gujhptoks6y/messages?applicationId=a-hvszhcwftsdr6khcn4zl6my&page=0&size=25>; rel='first'",
				server                          : "Jetty(8.1.10.v20130312)",
				"transfer-encoding"             : "chunked",
				connection                      : "Close",
				location                        : "/abc" };

			var message2_payload = { "from" :"+19192300062","to" :"+18283290994","text" :"Hey Josh" };

			nock("https://api.catapult.inetwork.com:443")
					.filteringRequestBody(function (body) {
						return "abc";
					})
						.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
						.reply(201, message2_reply, headers2)
						.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
						.reply(200, message2_payload,
						{ "cache-control"   : "no-cache",
						"content-type"      : "application/json",
						date                : "Tue, 23 Jun 2015 13:09:43 GMT",
						server              : "Jetty(8.1.10.v20130312)",
						"transfer-encoding" : "chunked",
						connection          : "Close",
						location            : "/abc" });

			var message3_payload = { "from" :"+19192300062","to" :"+10000000000","text" :"Hey stranger" };

			nock("https://api.catapult.inetwork.com:443")
					.filteringRequestBody(function (body) {
						return "abc";
					})
						.post("/v1/users/u-37oyq5ser536gujhptoks6y/messages", "abc")
						.reply(201, message2_reply, headers2)
						.get("/v1/users/u-37oyq5ser536gujhptoks6y/messages/abc")
						.reply(200, message3_payload,
						{ "cache-control"   : "no-cache",
						"content-type"      : "application/json",
						date                : "Tue, 23 Jun 2015 13:09:43 GMT",
						server              : "Jetty(8.1.10.v20130312)",
						"transfer-encoding" : "chunked",
						connection          : "Close",
						location            : "/abc" });
		});
		it("should send a text to the client from the stranger", function (done) {
			var postPayload = {
				"text" :"Hey Josh",
				"to"   :"+19192300062",
				"from" :"+10000000000"
			};
			supertest(app)
				.post("/messages")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		it("should send a text to the stranger from the client", function (done) {
			var postPayload = {
				"text" :"Hey stranger",
				"to"   :"+19192300062",
				"from" :"+18283290994"
			};
			supertest(app)
				.post("/messages")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		it("should delete the alias number", function (done) {
			var postPayload = {
				"text" :"GET LOST",
				"to"   :"+19192300062",
				"from" :"+18283290994"
			};
			supertest(app)
				.post("/messages")
				.send(postPayload)
				.expect(200)
				.end(done);
		});
		after(function () {
			nock.cleanAll();
		});
	});
});

describe("TextApp", function () {
	it("should ensure the program doesn't crash if no callback to router constructer is given", function () {
		var router = new Router();
		router.should.be.ok;
	});
});
