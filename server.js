// Constants
var PORT = 80;
var API_KEY = "1cf3b20e62864f01a08230003220612";
var API_CURRENT = "http://api.weatherapi.com/v1/current.json?key=";
var API_FORECAST = "http://api.weatherapi.com/v1/forecast.json?key=";
var API_ASTRONOMY = "http://api.weatherapi.com/v1/astronomy.json?key=";
var API_POSTFIX = "&aqi=no"

// Libraries
var favicon = require("serve-favicon");
var express = require("express");
var socketIO = require("socket.io");
var http = require("http");
var toml = require("toml");
var fs = require("fs");
const { response } = require("express");

// Server init
var app = express();
var server = http.Server(app);
var io = socketIO(server);
app.use(express.static("pub"));
app.use(favicon(__dirname + "/pub/img/favicon.ico"));

// Connection handler
io.on("connection", (socket) => {
    console.log("New connection!");

    fetch_data(socket);

    socket.on("disconnect", () => {
        console.log("Lost connection");
    })
});

function fetch_data(socket) {
    0
    let text = fs.readFileSync("pub/locations.toml", "utf-8");
    let parsed = toml.parse(text);
    let locations = Object.values(parsed["locations"]);

    locations.forEach(location => {

        let addressPostFix = API_KEY + "&q=" + location.latitude + "," + location.longitude + API_POSTFIX;

        let current = API_CURRENT + addressPostFix;
        let forecast = API_FORECAST + addressPostFix;
        let astronomy = API_ASTRONOMY + addressPostFix;


        fetch(current)
            .then(response => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    console.log("Bad API response!");
                }
            })
            .then(json => {
                json["location"] = location;
                socket.emit("current", json);
            });

        fetch(forecast)
            .then(response => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    console.log("Bad API response!");
                }
            })
            .then(json => {
                json["location"] = location;
                socket.emit("forecast", json);
            });

        fetch(astronomy)
            .then(response => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    console.log("Bad API response!");
                }
            })
            .then(json => {
                json["location"] = location;
                socket.emit("astronomy", json);
            });
    });
}

// Start server
server.listen(PORT, function () {
    console.log("Server is listening on port " + PORT);
});