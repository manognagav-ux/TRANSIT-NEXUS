
/* =========================================
   TRANSIT NEXUS — CONDUCTOR PORTAL
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const connectionStatus = document.getElementById("connectionStatus");
    const busSelect = document.getElementById("busSelect");
    const busMessage = document.getElementById("busMessage");

    const tripPanel = document.getElementById("tripPanel");
    const startPoint = document.getElementById("startPoint");
    const endPoint = document.getElementById("endPoint");
    const selectedBusNumber = document.getElementById("selectedBusNumber");
    const routeNumber = document.getElementById("routeNumber");
    const busStatus = document.getElementById("busStatus");

    const stopSelect = document.getElementById("stopSelect");
    const occupancySelect = document.getElementById("occupancySelect");
    const checkinNotes = document.getElementById("checkinNotes");
    const checkinForm = document.getElementById("checkinForm");
    const checkinButton = document.getElementById("checkinButton");
    const checkinMessage = document.getElementById("checkinMessage");

    const historyMessage = document.getElementById("historyMessage");
    const historyList = document.getElementById("historyList");

    let buses = [];
    let stops = [];
    let selectedBus = null;

    if (typeof supabaseClient === "undefined") {
        connectionStatus.textContent = "NOT CONNECTED";
        busMessage.textContent =
            "Supabase client is unavailable. Check js/supabase.js.";
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
        return buses.find(item => item.id === bus.id)?.route || null;
    }

    async function loadBuses() {
        busMessage.textContent = "Loading buses...";

        const { data, error } = await supabaseClient
            .from("buses")
            .select("id, bus_number, route_id, occupancy, status, last_updated")
            .order("bus_number");

        if (error) {
            console.error("Conductor bus loading error:", error);
            connectionStatus.textContent = "DATABASE ERROR";
            busMessage.textContent = "Could not load buses.";
            return;
        }

        buses = data || [];

        const routeIds = [...new Set(
            buses.map(bus => bus.route_id).filter(id => id != null)
        )];

        let routes = [];

        if (routeIds.length > 0) {
            const { data: routeData, error: routeError } =
                await supabaseClient
                    .from("routes")
                    .select("id, route_number, start_point, end_point")
                    .in("id", routeIds);

            if (routeError) {
                console.error("Route loading error:", routeError);
            } else {
                routes = routeData || [];
            }
        }

        buses = buses.map(bus => ({
            ...bus,
            route: routes.find(route => route.id === bus.route_id) || null
        }));

        busSelect.innerHTML = '<option value="">Choose your bus</option>';

        buses.forEach(bus => {
            const option = document.createElement("option");
            option.value = bus.id;
            option.textContent = `Bus ${bus.bus_number}`;
            busSelect.appendChild(option);
        });

        connectionStatus.textContent = "DATABASE CONNECTED";
        busMessage.textContent = buses.length
            ? `${buses.length} bus record(s) available. Select your bus to begin.`
            : "No buses found in the database.";
    }

    async function loadStops() {
        stopSelect.innerHTML = '<option value="">Loading stops...</option>';

        const { data, error } = await supabaseClient
            .from("stops")
            .select("id, stop_name")
            .order("stop_name");

        if (error) {
            console.error("Conductor stop loading error:", error);
            stopSelect.innerHTML =
                '<option value="">Could not load stops</option>';
            return;
        }

        stops = data || [];

        stopSelect.innerHTML =
            '<option value="">Choose the current stop</option>';

        stops.forEach(stop => {
            const option = document.createElement("option");
            option.value = stop.id;
            option.textContent = stop.stop_name;
            stopSelect.appendChild(option);
        });
    }

    function showBus(bus) {
        selectedBus = bus;

        if (!bus) {
            tripPanel.hidden = true;
            historyList.innerHTML = "";
            historyMessage.textContent =
                "Select a bus to view its check-in history.";
            return;
        }

        tripPanel.hidden = false;

        const route = getRoute(bus);

        startPoint.textContent = route?.start_point || "Unavailable";
        endPoint.textContent = route?.end_point || "Unavailable";
        selectedBusNumber.textContent = bus.bus_number;
        routeNumber.textContent = route?.route_number || "Unavailable";
        busStatus.textContent = bus.status || "Unknown";

        checkinMessage.textContent = "";
        loadHistory(bus.id);
    }

    async function loadHistory(busId) {
        historyMessage.textContent = "Loading check-in history...";
        historyList.innerHTML = "";

        const { data, error } = await supabaseClient
            .from("staff_checkins")
            .select("id, bus_id, stop_id, checked_in_at, occupancy, notes")
            .eq("bus_id", busId)
            .order("checked_in_at", { ascending: false })
            .limit(30);

        if (error) {
            console.error("Check-in history error:", error);
            historyMessage.textContent =
                "Could not load check-in history.";
            return;
        }

        const records = data || [];

        if (!records.length) {
            historyMessage.textContent =
                "No check-ins recorded for this bus yet.";
            return;
        }

        const stopIds = [...new Set(
            records.map(record => record.stop_id).filter(id => id != null)
        )];

        let stopNames = [];

        if (stopIds.length) {
            const { data: stopData, error: stopError } =
                await supabaseClient
                    .from("stops")
                    .select("id, stop_name")
                    .in("id", stopIds);

            if (!stopError) {
                stopNames = stopData || [];
            }
        }

        historyMessage.textContent =
            `${records.length} recent check-in record(s).`;

        records.forEach(record => {
            const stop = stopNames.find(item => item.id === record.stop_id);
            const card = document.createElement("article");
            card.className = "history-card";

            const time = record.checked_in_at
                ? new Date(record.checked_in_at).toLocaleString()
                : "Time unavailable";

            card.innerHTML = `
                <div class="history-card-top">
                    <h3>${escapeHTML(stop?.stop_name || "Unknown stop")}</h3>
                    <span class="history-time">${escapeHTML(time)}</span>
                </div>

                <p>
                    Occupancy:
                    ${escapeHTML(record.occupancy || "Not recorded")}
                </p>

                ${record.notes
                    ? `<p>Notes: ${escapeHTML(record.notes)}</p>`
                    : ""}

                <span class="history-pill">STAFF CHECK-IN</span>
            `;

            historyList.appendChild(card);
        });
    }

    busSelect.addEventListener("change", () => {
        const bus = buses.find(item => String(item.id) === busSelect.value);
        showBus(bus || null);
    });

    checkinForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!selectedBus) {
            checkinMessage.textContent = "Please select a bus first.";
            return;
        }

        const stopId = stopSelect.value;

        if (!stopId) {
            checkinMessage.textContent = "Please select a stop.";
            return;
        }

        checkinButton.disabled = true;
        checkinButton.textContent = "RECORDING...";

        checkinMessage.textContent = "Submitting check-in...";

        const { error } = await supabaseClient
            .from("staff_checkins")
            .insert({
                bus_id: selectedBus.id,
                stop_id: Number(stopId),
                occupancy: occupancySelect.value || null,
                notes: checkinNotes.value.trim() || null
            });

        checkinButton.disabled = false;
        checkinButton.textContent = "RECORD STOP CHECK-IN ↗";

        if (error) {
            console.error("Check-in submission error:", error);

            checkinMessage.textContent =
                "Check-in could not be saved. Check database permissions.";
            return;
        }

        checkinMessage.textContent =
            "Stop check-in recorded successfully.";

        checkinForm.reset();

        await loadHistory(selectedBus.id);
    });

    async function initialize() {
        connectionStatus.textContent = "CONNECTING...";

        await Promise.all([
            loadBuses(),
            loadStops()
        ]);
    }

    initialize();
});
