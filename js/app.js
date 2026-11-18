
/* =========================================
   TRANSIT NEXUS
   INTERACTIVE JAVASCRIPT
========================================= */


/* =========================================
   1. SAMPLE TRANSPORT DATA
========================================= */

// These are illustrative demo locations.
// They are NOT actual live RTC bus positions.

const busData = [
    {
        id: "218",
        name: "Bus 218",
        route: "Uppal → Secunderabad",
        location: [17.4050, 78.5590],
        occupancy: "Moderate",
        nextStop: "Habsiguda"
    },
    {
        id: "10H",
        name: "Bus 10H",
        route: "ECIL → Secunderabad",
        location: [17.4300, 78.5460],
        occupancy: "Low",
        nextStop: "Tarnaka"
    },
    {
        id: "16A",
        name: "Bus 16A",
        route: "Uppal → Koti",
        location: [17.3890, 78.5020],
        occupancy: "High",
        nextStop: "Ramanthapur"
    }
];


const stopData = [
    {
        name: "Uppal Bus Stop",
        location: [17.4010, 78.5590]
    },
    {
        name: "Habsiguda",
        location: [17.4065, 78.5430]
    },
    {
        name: "Tarnaka",
        location: [17.4280, 78.5380]
    },
    {
        name: "Secunderabad",
        location: [17.4399, 78.4983]
    },
    {
        name: "Ramanthapur",
        location: [17.3910, 78.5340]
    },
    {
        name: "Koti",
        location: [17.3850, 78.4867]
    }
];


/* =========================================
   2. MAP INITIALIZATION
========================================= */

let map = null;

let busMarkers = [];
let stopMarkers = [];
let routeLines = [];

let currentFilter = "all";


function initializeMap() {

    const mapElement = document.getElementById("map");

    // Check whether the map element exists.
    if (!mapElement) {
        console.error("Map element not found.");
        return;
    }

    // Check whether Leaflet loaded.
    if (typeof L === "undefined") {
        mapElement.innerHTML =
            "<p style='padding:20px;color:#222'>Map library could not load. Check your internet connection and refresh.</p>";

        console.error("Leaflet library not loaded.");
        return;
    }

    // Prevent duplicate map initialization.
    if (map !== null) {
        return;
    }

    // Center the map around Hyderabad.
    map = L.map("map").setView(
        [17.4100, 78.5300],
        12
    );

    

// Esri World Street Map tiles — no API key in this endpoint.
L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution:
            "Tiles &copy; Esri — Sources: Esri, HERE, Garmin, USGS, OpenStreetMap contributors"
    }
).addTo(map);



    // Add bus markers.
    addBusMarkers();

    // Add bus stop markers.
    addStopMarkers();

    // Add illustrative route lines.
    addRouteLines();

    // Fit the map to the sample network.
    map.fitBounds(
        L.latLngBounds([
            [17.3800, 78.4800],
            [17.4500, 78.5700]
        ]),
        { padding: [20, 20] }
    );

    // Remove the loading message.
    const loading = document.querySelector(".map-loading");

    if (loading) {
        loading.style.display = "none";
    }

    // Correct map dimensions after rendering.
    setTimeout(() => {
        map.invalidateSize();
    }, 300);

}


/* =========================================
   3. CUSTOM BUS ICON
========================================= */

function createBusIcon() {

    return L.divIcon({

        className: "custom-bus-marker",

        html: `
            <div style="
                width:36px;
                height:36px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#FF7139;
                color:#111319;
                border:3px solid white;
                border-radius:12px;
                font-size:17px;
                font-weight:bold;
                box-shadow:0 4px 12px rgba(0,0,0,0.3);
            ">
                🚌
            </div>
        `,

        iconSize: [36, 36],
        iconAnchor: [18, 18],

        popupAnchor: [0, -18]

    });

}


/* =========================================
   4. CUSTOM BUS STOP ICON
========================================= */

function createStopIcon() {

    return L.divIcon({

        className: "custom-stop-marker",

        html: `
            <div style="
                width:15px;
                height:15px;
                background:#B6F36B;
                border:3px solid #111319;
                border-radius:50%;
                box-shadow:0 0 8px rgba(182,243,107,0.7);
            "></div>
        `,

        iconSize: [15, 15],
        iconAnchor: [7, 7]

    });

}


/* =========================================
   5. ADD BUS MARKERS
========================================= */

function addBusMarkers() {

    busData.forEach(bus => {

        const marker = L.marker(
            bus.location,
            {
                icon: createBusIcon()
            }
        ).addTo(map);

        marker.bindPopup(`
            <div style="font-family:Arial;min-width:180px;">

                <h3 style="color:#FF7139;">
                    ${bus.name}
                </h3>

                <p><b>Route:</b> ${bus.route}</p>

                <p><b>Occupancy:</b> ${bus.occupancy}</p>

                <p><b>Next stop:</b> ${bus.nextStop}</p>

                <p style="font-size:11px;color:#777;">
                    Illustrative demo location
                </p>

            </div>
        `);

        busMarkers.push(marker);

    });

}


/* =========================================
   6. ADD BUS STOP MARKERS
========================================= */

function addStopMarkers() {

    stopData.forEach(stop => {

        const marker = L.marker(
            stop.location,
            {
                icon: createStopIcon()
            }
        ).addTo(map);

        marker.bindPopup(`
            <div style="font-family:Arial;">

                <h3 style="color:#269C54;">
                    ${stop.name}
                </h3>

                <p>Bus stop</p>

            </div>
        `);

        stopMarkers.push(marker);

    });

}


/* =========================================
   7. ADD ROUTE LINES
========================================= */

function addRouteLines() {

    // Route 1: Uppal to Secunderabad.
    const routeOne = [
        [17.4010, 78.5590],
        [17.4065, 78.5430],
        [17.4280, 78.5380],
        [17.4399, 78.4983]
    ];

    // Route 2: Uppal to Koti.
    const routeTwo = [
        [17.4010, 78.5590],
        [17.3910, 78.5340],
        [17.3890, 78.5020],
        [17.3850, 78.4867]
    ];

    const lineOne = L.polyline(
        routeOne,
        {
            color: "#FF7139",
            weight: 5,
            opacity: 0.8
        }
    ).addTo(map);

    const lineTwo = L.polyline(
        routeTwo,
        {
            color: "#A78BFA",
            weight: 5,
            opacity: 0.8,
            dashArray: "8, 9"
        }
    ).addTo(map);

    routeLines.push(lineOne);
    routeLines.push(lineTwo);

}


/* =========================================
   8. MAP FILTERS
========================================= */

function applyMapFilter(filter) {

    currentFilter = filter;

    // Bus markers.
    busMarkers.forEach(marker => {

        if (filter === "all" || filter === "buses") {

            marker.addTo(map);

        } else {

            map.removeLayer(marker);

        }

    });


    // Stop markers.
    stopMarkers.forEach(marker => {

        if (filter === "all" || filter === "stops") {

            marker.addTo(map);

        } else {

            map.removeLayer(marker);

        }

    });


    // Route lines are visible for All and Buses.
    routeLines.forEach(line => {

        if (filter === "all" || filter === "buses") {

            line.addTo(map);

        } else {

            map.removeLayer(line);

        }

    });

}


// Connect buttons to filters.
function initializeFilters() {

    const filterButtons =
        document.querySelectorAll(".filter-button");

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            // Remove active class from all buttons.
            filterButtons.forEach(item => {
                item.classList.remove("active");
            });

            // Highlight selected button.
            button.classList.add("active");

            // Apply selected filter.
            const filter = button.dataset.filter;

            applyMapFilter(filter);

        });

    });

}


/* =========================================
   9. BUS AND STOP SEARCH
========================================= */

function initializeSearch() {

    const searchForm =
        document.getElementById("busSearchForm");

    const searchInput =
        document.getElementById("busSearch");

    const searchMessage =
        document.getElementById("searchMessage");


    if (!searchForm || !searchInput || !searchMessage) {
        return;
    }


    searchForm.addEventListener("submit", event => {

        event.preventDefault();

        const query =
            searchInput.value.trim().toLowerCase();


        if (!query) {

            searchMessage.textContent =
                "Please enter a bus number or destination.";

            return;

        }


        // Search bus number, route and next stop.
        const matchingBuses = busData.filter(bus => {

            return (
                bus.id.toLowerCase().includes(query) ||
                bus.name.toLowerCase().includes(query) ||
                bus.route.toLowerCase().includes(query) ||
                bus.nextStop.toLowerCase().includes(query)
            );

        });


        // Search bus stop name.
        const matchingStops = stopData.filter(stop => {

            return stop.name.toLowerCase().includes(query);

        });


        // No results.
        if (
            matchingBuses.length === 0 &&
            matchingStops.length === 0
        ) {

            searchMessage.textContent =
                "No matching demo bus or stop found. Try another search.";

            return;

        }


        // Make sure matching markers are visible.
        applyMapFilter("all");

        document.querySelectorAll(".filter-button").forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.filter === "all"
            );

        });


        // Build matching coordinates.
        const matchingLocations = [

            ...matchingBuses.map(bus => bus.location),

            ...matchingStops.map(stop => stop.location)

        ];


        // Zoom to search results.
        if (matchingLocations.length === 1) {

            map.setView(matchingLocations[0], 15);

        } else {

            map.fitBounds(
                L.latLngBounds(matchingLocations),
                { padding: [40, 40] }
            );

        }


        // Open matching bus popup.
        if (matchingBuses.length > 0) {

            const busIndex = busData.indexOf(matchingBuses[0]);

            busMarkers[busIndex].openPopup();

        }


        // Open matching stop popup.
        else if (matchingStops.length > 0) {

            const stopIndex = stopData.indexOf(matchingStops[0]);

            stopMarkers[stopIndex].openPopup();

        }


        if (matchingBuses.length > 0) {

            searchMessage.textContent =
                `Found ${matchingBuses.length} matching demo bus(es).`;

        } else {

            searchMessage.textContent =
                `Found ${matchingStops.length} matching bus stop(s).`;

        }

    });

}


/* =========================================
   10. MOBILE NAVIGATION
========================================= */

function initializeMobileMenu() {

    const menuToggle =
        document.getElementById("menuToggle");

    const navLinks =
        document.getElementById("navLinks");


    if (!menuToggle || !navLinks) {
        return;
    }


    menuToggle.addEventListener("click", () => {

        navLinks.classList.toggle("open");

        const isOpen =
            navLinks.classList.contains("open");

        menuToggle.textContent =
            isOpen ? "✕" : "☰";

    });


    // Close menu after clicking a navigation link.
    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("open");

            menuToggle.textContent = "☰";

        });

    });

}


/* =========================================
   11. START THE APPLICATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    initializeFilters();

    initializeSearch();

    initializeMobileMenu();

    console.log("TRANSIT NEXUS initialized successfully!");

});
