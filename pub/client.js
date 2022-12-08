var IMAGE_OFFSET = 200;
var IMAGE_WIDTH = 3000;
var IMAGE_HEIGHT = 1594
// Size of map in degrees of latitude and longitude
var MAP_HEIGHT = 2.33;
var MAP_WIDTH = 6.56;
// Top left lat/lon of map
var MAP_LAT = 47.52;
var MAP_LON = -90.38;
// Distance away from point to have data become visible
var HOVER_DISTANCE = 15;
var HOURS_AHEAD = 3;

// Colors
var LOCATION_COLOR = "#001a9c";
var LOCATION_FONT_COLOR = "#ffffff";
var FONT = "24px fira-code";

var image = new Image();
image.src = "img/up_map.png";

var socket = io();

Vue.createApp({
    data() {
        return {
            locations: {},
            mouse: { x: 0, y: 0 },
            date: new Date(),
        }
    },
    methods: {
        init_canvas() {
            this.canvas = document.getElementById("canvas");
            this.ctx = canvas.getContext("2d");

            let app = this;
            this.canvas.addEventListener("click", (event) => {
                app.handleClick(event.clientX, event.clientY);
            });

            addEventListener('mousemove', (event) => {
                app.handleMouseMove(event.clientX, event.clientY);
            });
        },
        handleClick(x, y) {
            let boundingBox = this.canvas.getBoundingClientRect();
            let canvas_x = x - boundingBox.left;
            let canvas_y = y - boundingBox.top;

            console.log(this.canvasToMap(canvas_x, canvas_y));
        },
        handleMouseMove(x, y) {
            this.mouse.x = x;
            this.mouse.y = y;
        },
        // Map canvas coordinates to map longitude/latitude
        canvasToMap(x, y) {
            // Where click was at on image from (0,0) to (1,1)
            let image_x = (x - this.xOffset) / this.width;
            let image_y = (y - this.yOffset) / this.height;

            let lon = MAP_LON + (image_x * MAP_WIDTH);
            let lat = MAP_LAT - (image_y * MAP_HEIGHT);
            return {
                lat: lat,
                lon: lon
            }
        },
        mapToCanvas(lat, lon) {
            let x = (((lon - MAP_LON) * this.width) / MAP_WIDTH) + this.xOffset;
            let y = (((MAP_LAT - lat) * this.height) / MAP_HEIGHT) + this.yOffset;
            return {
                x: x,
                y: y
            }
        },
        update() {
            requestAnimationFrame(this.update);

            this.date = new Date();
            this.updateLocations();
            this.draw();
        },
        updateLocations() {
            let locationIter = Object.entries(this.locations);
            locationIter.forEach(location => {
                this.ctx.fillStyle = "#ffff00";
                let coordinates = this.mapToCanvas(location[1].latitude, location[1].longitude);
                let x = location[1].coordinates = coordinates;
            });
        },
        draw() {
            // Handles the window being resized
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Background fill
            this.ctx.fillStyle = "#00ffff";
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);

            this.drawMap();
            this.drawLocations();
        },
        drawMap() {
            this.xOffset = 0;
            this.yOffset = IMAGE_OFFSET;
            let mapWidth = canvas.width;
            let mapHeight = canvas.height - this.yOffset;

            this.width = mapWidth;
            this.height = IMAGE_HEIGHT * (mapWidth / IMAGE_WIDTH);

            if (this.height > mapHeight) {
                this.height = mapHeight;
                this.width = IMAGE_WIDTH * (mapHeight / IMAGE_HEIGHT);
                this.xOffset = (mapWidth - this.width) / 2;
            }

            this.ctx.drawImage(
                image,
                // Location of the grab
                0, 0,
                // How big of a grab
                IMAGE_WIDTH, IMAGE_HEIGHT,
                // Where to crop
                this.xOffset, this.yOffset,
                // Size of placement
                this.width, this.height
            );
        },
        drawTop() {

        },
        drawLocations() {
            let locationIter = Object.entries(this.locations);
            let drawLast = null;
            locationIter.forEach(location => {
                this.ctx.fillStyle = LOCATION_COLOR;

                let x = location[1].coordinates.x;
                let y = location[1].coordinates.y;

                if (circleCollision(this.mouse.x, this.mouse.y, x, y, HOVER_DISTANCE)) {
                    drawLast = location;
                }
                else {
                    this.ctx.fillRect(x - 10, y - 10, 20, 20);
                }
            });
            // Hackish solution but whatever
            if (drawLast != null) {
                let x = drawLast[1].coordinates.x;
                let y = drawLast[1].coordinates.y;
                this.ctx.fillRect(x - 200, y, 200, 100);

                this.ctx.font = FONT;
                this.ctx.fillStyle = LOCATION_FONT_COLOR;
                this.ctx.fillText(drawLast[0], x - 190, y + 28);

                for (i = 0; i < HOURS_AHEAD; i++) {
                    let cloudCover = drawLast[1].hourly[i];
                    this.ctx.fillStyle = cloudCoverToColor(cloudCover);
                    this.ctx.fillRect(x - 190 + i * 30, y + 38, 20, 20);
                }

                this.ctx.fillStyle = LOCATION_FONT_COLOR;
                this.ctx.fillText(drawLast[1].temp + "°F", x - 190, y + 85);
            }
        },
        updateCurrent(data) {
            let name = data.location.name;

            // This is hacky and probably inefficient but it works 
            if (this.locations[name] == null) {
                this.locations[name] = new Object;
            }

            let coordinates = this.mapToCanvas(data.location.latitude, data.location.longitude);

            this.locations[name].latitude = data.location.latitude;
            this.locations[name].longitude = data.location.longitude;
            this.locations[name].coordinates = coordinates;
            this.locations[name].cloudCover = data.current.cloud;
            this.locations[name].temp = data.current.temp_f;
        },
        updateForecast(data) {
            let name = data.location.name;

            if (this.locations[name] == null) {
                this.locations[name] = new Object;
            }
            if (this.locations[name].hourly == null) {
                this.locations[name].hourly = new Array(HOURS_AHEAD);
            }

            let hour = this.date.getHours();
            for (i = 0; i < HOURS_AHEAD; i++) {
                this.locations[name].hourly[i] = data.forecast.forecastday[0].hour[hour + i].cloud;
            }
        }
    },
    computed: {},
    mounted() {
        init_socket_io(this);
        this.init_canvas();
        this.update();
    }
}).mount('#app');

// Socket listeners
function init_socket_io(app) {
    socket.on("current", (data) => {
        app.updateCurrent(data);
    });

    socket.on("forecast", (data) => {
        app.updateForecast(data);

    });

    socket.on("astronomy", (data) => {
        //console.log(data);
    });
}

// Returns true if the point <ax, ay> is within r distance of <bx, by>
function circleCollision(ax, ay, bx, by, r) {
    let dx = ax - bx;
    let dy = ay - by;
    if (((dx * dx) + (dy * dy)) < r * r) {
        return true;
    }
    return false;
}

var goodColor = { r: 0, g: 255, b: 0 };
var badColor = { r: 255, g: 0, b: 0 };
function cloudCoverToColor(cover) {

    let color = 1 - (cover / 100);
    let r = Math.floor(((goodColor.r - badColor.r) * color) + badColor.r);
    let g = Math.floor(((goodColor.g - badColor.g) * color) + badColor.g);
    let b = Math.floor(((goodColor.b - badColor.b) * color) + badColor.b);

    return "rgb(" + r + "," + g + "," + b + ")";
}