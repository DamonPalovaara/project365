var IMAGE_OFFSET = 200;
var IMAGE_WIDTH = 3000;
var IMAGE_HEIGHT = 1594
// Size of map in degrees of latitude and longitude
var MAP_HEIGHT = 2.33;
var MAP_WIDTH = 6.56;
// Top left lat/lon of map
var MAP_LAT = 47.52;
var MAP_LON = -90.38;

var image = new Image();
image.src = "img/up_coords.png";

var socket = io();

Vue.createApp({
    data() {
        return {
            locations: {}
        }
    },
    methods: {
        init_canvas() {
            this.canvas = document.getElementById("canvas");
            this.ctx = canvas.getContext("2d");

            let app = this;
            this.canvas.addEventListener("click", (event) => {
                app.handleClick(event.clientX, event.clientY);
            })
        },
        handleClick(x, y) {
            let boundingBox = this.canvas.getBoundingClientRect();
            let canvas_x = x - boundingBox.left;
            let canvas_y = y - boundingBox.top;

            // Where click was at on image from (0,0) to (1,1)
            console.log(this.canvasToMap(canvas_x, canvas_y));
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
        mapToCanvas(lon, lat) {
            let x = (((lon - MAP_LON) * this.width) / MAP_WIDTH) + this.xOffset;
            let y = (((MAP_LAT - lat) * this.height) / MAP_HEIGHT) + this.yOffset;
            return {
                x: x,
                y: y
            }
        },
        draw() {
            // Not needed but I'm lazy
            requestAnimationFrame(this.draw);

            // Handles the window being resized
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Background fill
            this.ctx.fillStyle = "#ffffff";
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
        drawLocations() {
            let locationIter = Object.values(this.locations);
            locationIter.forEach(location => {
                let lat = location.location.latitude;
                let lon = location.location.longitude;
                let coordinates = this.mapToCanvas(lon, lat);
                this.ctx.fillStyle = "#ffff00";
                this.ctx.fillRect(coordinates.x, coordinates.y, 20, 20);
                console.log(coordinates);
            });
        },
        updateCurrent(data) {
            this.locations[data.location.name] = data;
        }
    },
    computed: {},
    mounted() {
        init_socket_io(this);
        this.init_canvas();
        this.draw();
    }
}).mount('#app');

// Socket listeners
function init_socket_io(app) {
    socket.on("current", (data) => {
        app.updateCurrent(data);
    });

    socket.on("forecast", (data) => {
        //console.log(data);
    });

    socket.on("astronomy", (data) => {
        //console.log(data);
    });
}