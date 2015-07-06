"use strict";

var express = require("express");
var Router = require("./lib/Router");
var app = express();

var router = new Router();
app.use("/", router.router);

router.initialize().then(function () {});

//the app is locally hosted at port 8081, or set to an environmental variable by the host
var server = app.listen(process.env.PORT || 8081, function () {

	var host = server.address().address;
	var port = server.address().port;

	console.log("Example app listening at http://%s:%s", host, port);

});
