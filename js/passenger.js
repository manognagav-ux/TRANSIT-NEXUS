
/* =========================================
   TRANSIT NEXUS — PASSENGER PORTAL
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const busList = document.getElementById("busList");
    const busMessage = document.getElementById("busMessage");
    const connectionStatus = document.getElementById("connectionStatus");

    const busSearch = document.getElementById("busSearch");
    const searchButton = document.getElementById("searchButton");
    const clearSearch = document.getElementById("clearSearch");

    const reportForm = document.getElementById("reportForm");
    const reportBus = document.getElementById("reportBus");
    const reportStop = document.getElementById("reportStop");
    const reportDescription = document.getElementById("reportDescription");
    const reportButton = document.getElementById("reportButton");
    const reportMessage = document.getElementById("reportMessage");

    let buses = [];
    let stops = [];
    let selectedBus = null;

    if (typeof supabaseClient === "undefined") {
        connectionStatus.textContent = "NOT CONNECTED";
        busMessage.textContent =
            "Supabase client was not found. Check js/supabase.js and script order.";
        return;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function getRoute(bus) {
        const route = Array.isArray(bus.routes)
            ? bus.routes[0]
            : bus.routes;

        if (!route) {
            return "Route details unavailable";
        }

        return `${route.start_point || "Unknown"} → ${route.end_point || "Unknown"}`;
    }

    // Create the selected bus information panel.
    const selectedBusPanel = document.createElement("section");
    selectedBusPanel.id = "selectedBusPanel";
    selectedBusPanel.className = "selected-bus-panel";
    selectedBusPanel.hidden = true;

    busList.insertAdjacentElement("afterend", selectedBusPanel);

    function renderSelectedBus(bus) {
        if (!bus) {
            selectedBusPanel.hidden = true;
            selectedBusPanel.innerHTML = "";
            return;
        }

        selectedBusPanel.hidden = false;

        selectedBusPanel.innerHTML = `
            <div class="selected-bus-heading">
                <div>
                    <span class="eyebrow">SELECTED VEHICLE</span>
                    <h2>BUS ${escapeHTML(bus.bus_number)}</h2>
                </div>
                <span class="selected-tag">SELECTED</span>
            </div>

            <p class="selected-route">
                ${escapeHTML(getRoute(bus))}
            </p>

            <div class="selected-details-grid">
                <div class="selected-detail">
                    <span>Occupancy</span>
                    <strong>${escapeHTML(bus.occupancy || "Unknown")}</strong>
                </div>

                <div class="selected-detail">
                    <span>Service status</span>
                    <strong>${escapeHTML(bus.status || "Unknown")}</strong>
                </div>

                <div class="selected-detail">
                    <span>Last record update</span>
                    <strong>${bus.last_updated
                        ? escapeHTML(new Date(bus.last_updated).toLocaleString())
                        : "Not available"}</strong>
                </div>
            </div>

            <p class="selected-note">
                This information is based on prototype database records
                and does not represent live GPS tracking.
            </p>

            <button type="button" id="reportForSelectedBus">
                REPORT A MISSED CHECK-IN ↗
            </button>
        `;

        document.getElementById("reportForSelectedBus")
            .addEventListener("click", () => {
                reportBus.value = String(bus.id);

                reportForm.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                reportMessage.textContent =
                    `Bus ${bus.bus_number} selected for your report.`;

                reportStop.focus();
            });
    }

    function renderBuses(list) {
        busList.innerHTML = "";

        if (list.length === 0) {
            busMessage.textContent =
                "No matching buses found. Try another bus number or destination.";

            renderSelectedBus(null);
            return;
        }

        busMessage.textContent =
            `Showing ${list.length} available bus record(s). Select a bus to view its details.`;

        list.forEach(bus => {
            const card = document.createElement("article");

            card.className = "bus-card";
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute("aria-label", `Select bus ${bus.bus_number}`);

            if (selectedBus && selectedBus.id === bus.id) {
                card.classList.add("selected");
            }

            card.innerHTML = `
                <div class="bus-card-top">
                    <h3>${escapeHTML(bus.bus_number)}</h3>
                    <span class="select-indicator">
                        ${selectedBus && selectedBus.id === bus.id
                            ? "SELECTED ✓"
                            : "SELECT ↗"}
                    </span>
                </div>

                <p class="bus-route">
                    ${escapeHTML(getRoute(bus))}
                </p>

                <span class="pill">DATABASE RECORD</span>

                <div class="bus-detail">
                    <span>Occupancy</span>
                    <strong>${escapeHTML(bus.occupancy || "Unknown")}</strong>
                </div>

                <div class="bus-detail">
                    <span>Service status</span>
                    <strong>${escapeHTML(bus.status || "Unknown")}</strong>
                </div>
            `;

            function selectThisBus() {
                selectedBus = bus;

                renderBuses(
                    buses.filter(item => {
                        const query = busSearch.value.trim().toLowerCase();

                        return (
                            String(item.bus_number).toLowerCase().includes(query) ||
                            getRoute(item).toLowerCase().includes(query) ||
                            String(item.occupancy || "").toLowerCase().includes(query) ||
                            String(item.status || "").toLowerCase().includes(query)
                        );
                    })
                );

                renderSelectedBus(bus);
                reportBus.value = String(bus.id);

                reportMessage.textContent =
                    `Bus ${bus.bus_number} selected. Choose a stop to submit a report.`;
            }

            card.addEventListener("click", selectThisBus);

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectThisBus();
                }
            });

            busList.appendChild(card);
        });
    }

    function filterBuses() {
        const query = busSearch.value.trim().toLowerCase();

        const filtered = buses.filter(bus => {
            const route = getRoute(bus).toLowerCase();

            return (
                String(bus.bus_number).toLowerCase().includes(query) ||
                route.includes(query) ||
                String(bus.occupancy || "").toLowerCase().includes(query) ||
                String(bus.status || "").toLowerCase().includes(query)
            );
        });

        renderBuses(filtered);
    }

    async function loadBuses() {
        busMessage.textContent = "Loading buses from Supabase...";

        const { data, error } = await supabaseClient
            .from("buses")
            .select(`
                id,
                bus_number,
                occupancy,
                status,
                last_updated,
                routes (
                    route_number,
                    start_point,
                    end_point
                )
            `)
            .order("bus_number");

        if (error) {
            console.error("Bus loading error:", error);

            connectionStatus.textContent = "DATABASE ERROR";
            busMessage.textContent =
                "Could not load buses. Check your Supabase connection and database permissions.";
            return;
        }

        buses = data || [];

        connectionStatus.textContent = "DATABASE CONNECTED";

        renderBuses(buses);
        populateBusOptions();
    }

    async function loadStops() {
        reportStop.innerHTML =
            '<option value="">Loading stops...</option>';

        const { data, error } = await supabaseClient
            .from("stops")
            .select("id, stop_name")
            .order("stop_name");

        if (error) {
            console.error("Stop loading error:", error);

            reportStop.innerHTML =
                '<option value="">Could not load stops</option>';
            return;
        }

        stops = data || [];

        reportStop.innerHTML =
            '<option value="">Choose your bus stop</option>';

        stops.forEach(stop => {
            const option = document.createElement("option");
            option.value = stop.id;
            option.textContent = stop.stop_name;

            reportStop.appendChild(option);
        });
    }

    function populateBusOptions() {
        reportBus.innerHTML =
            '<option value="">Choose a bus</option>';

        buses.forEach(bus => {
            const option = document.createElement("option");

            option.value = bus.id;
            option.textContent = `Bus ${bus.bus_number}`;

            reportBus.appendChild(option);
        });
    }

    searchButton.addEventListener("click", filterBuses);

    busSearch.addEventListener("input", filterBuses);

    clearSearch.addEventListener("click", () => {
        busSearch.value = "";
        renderBuses(buses);
    });

    reportBus.addEventListener("change", () => {
        const bus = buses.find(item => String(item.id) === reportBus.value);

        if (bus) {
            selectedBus = bus;
            renderBuses(buses);
            renderSelectedBus(bus);
        }
    });

    reportForm.addEventListener("submit", async event => {
        event.preventDefault();

        const busId = reportBus.value;
        const stopId = reportStop.value;
        const description = reportDescription.value.trim();

        if (!busId || !stopId) {
            reportMessage.textContent =
                "Please select both a bus and a bus stop.";
            return;
        }

        reportButton.disabled = true;
        reportButton.textContent = "SUBMITTING...";
        reportMessage.textContent = "Sending your report...";

        const { error } = await supabaseClient
            .from("passenger_reports")
            .insert({
                bus_id: Number(busId),
                stop_id: Number(stopId),
                description: description || null
            });

        reportButton.disabled = false;
        reportButton.textContent = "SUBMIT PASSENGER REPORT ↗";

        if (error) {
            console.error("Passenger report error:", error);

            reportMessage.textContent =
                "Report could not be submitted. Please check database permissions and try again.";
            return;
        }

        reportMessage.textContent =
            "Your passenger report was submitted successfully. It is marked as Pending and is not staff-verified.";

        reportForm.reset();
    });

    async function initializePassengerPortal() {
        connectionStatus.textContent = "CONNECTING...";

        await Promise.all([
            loadBuses(),
            loadStops()
        ]);
    }

    initializePassengerPortal();
});
