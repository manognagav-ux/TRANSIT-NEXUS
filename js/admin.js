
/* =========================================
   TRANSIT NEXUS — ADMIN PORTAL
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const connectionStatus = document.getElementById("connectionStatus");
    const dashboardMessage = document.getElementById("dashboardMessage");
    const refreshButton = document.getElementById("refreshButton");

    const totalBuses = document.getElementById("totalBuses");
    const totalRoutes = document.getElementById("totalRoutes");
    const totalStops = document.getElementById("totalStops");
    const totalCheckins = document.getElementById("totalCheckins");
    const totalReports = document.getElementById("totalReports");

    const busTable = document.getElementById("busTable");
    const busMessage = document.getElementById("busMessage");

    const checkinList = document.getElementById("checkinList");
    const checkinMessage = document.getElementById("checkinMessage");

    const reportList = document.getElementById("reportList");
    const reportMessage = document.getElementById("reportMessage");
    const reportFilter = document.getElementById("reportFilter");

    let reports = [];

    if (typeof supabaseClient === "undefined") {
        connectionStatus.textContent = "NOT CONNECTED";
        dashboardMessage.textContent =
            "Supabase client was not found. Check js/supabase.js.";
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

    function formatDate(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? "Not available"
            : date.toLocaleString();
    }

    async function loadDashboard() {

        dashboardMessage.textContent =
            "Fetching records from Supabase...";

        connectionStatus.textContent = "CONNECTING...";
        refreshButton.disabled = true;

        try {

            const [
                busesResult,
                routesResult,
                stopsResult,
                checkinsResult,
                reportsResult
            ] = await Promise.all([

                supabaseClient
                    .from("buses")
                    .select("id, bus_number, route_id, occupancy, status, last_updated")
                    .order("bus_number"),

                supabaseClient
                    .from("routes")
                    .select("id, route_number, start_point, end_point, is_active"),

                supabaseClient
                    .from("stops")
                    .select("id, stop_name"),

                supabaseClient
                    .from("staff_checkins")
                    .select("id, bus_id, stop_id, checked_in_at, occupancy, notes", {
    count: "exact"
})
                    .order("checked_in_at", { ascending: false })
                    .limit(50),

                supabaseClient
                    .from("passenger_reports")
                    .select("id, bus_id, stop_id, reported_at, report_type, confirmation_count, description, status")
                    .order("reported_at", { ascending: false })
            ]);

            const errors = [
                busesResult.error,
                routesResult.error,
                stopsResult.error,
                checkinsResult.error,
                reportsResult.error
            ].filter(Boolean);

            if (errors.length) {
                console.error("Admin dashboard errors:", errors);

                connectionStatus.textContent = "DATABASE ERROR";
                dashboardMessage.textContent =
                    "Some records could not be loaded. Check Supabase table permissions and browser console.";

                return;
            }

            const buses = busesResult.data || [];
            const routes = routesResult.data || [];
            const stops = stopsResult.data || [];
            const checkins = checkinsResult.data || [];

            reports = reportsResult.data || [];

            // Update dashboard statistics.

            totalBuses.textContent = buses.length;

            totalRoutes.textContent =
                routes.filter(route => route.is_active === true).length;

            totalStops.textContent = stops.length;

            totalCheckins.textContent = checkinsResult.count ??
                "—";

            // The report query returns all matching rows.
            totalReports.textContent = reports.length;

            // Display bus directory.
            renderBuses(buses, routes);

            // Display recent staff check-ins.
            renderCheckins(checkins, buses, stops);

            // Display passenger reports.
            renderReports();

            connectionStatus.textContent = "DATABASE CONNECTED";

            dashboardMessage.textContent =
                "Network information successfully loaded from Supabase.";

        } catch (error) {

            console.error("Admin dashboard error:", error);

            connectionStatus.textContent = "CONNECTION ERROR";

            dashboardMessage.textContent =
                "An unexpected error occurred while loading the dashboard.";

        } finally {

            refreshButton.disabled = false;

        }
    }

    function renderBuses(buses, routes) {

        busTable.innerHTML = "";

        if (!buses.length) {
            busMessage.textContent = "No bus records found.";
            busTable.innerHTML =
                '<tr><td colspan="5">No buses available.</td></tr>';
            return;
        }

        busMessage.textContent =
            `${buses.length} bus record(s) found.`;

        buses.forEach(bus => {

            const route = routes.find(
                item => item.id === bus.route_id
            );

            const routeName = route
                ? `${route.start_point} → ${route.end_point}`
                : "Route unavailable";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td><strong>${escapeHTML(bus.bus_number)}</strong></td>
                <td>${escapeHTML(routeName)}</td>
                <td>${escapeHTML(bus.occupancy || "Unknown")}</td>
                <td>${escapeHTML(bus.status || "Unknown")}</td>
                <td>${escapeHTML(formatDate(bus.last_updated))}</td>
            `;

            busTable.appendChild(row);
        });
    }

    function renderCheckins(checkins, buses, stops) {

        checkinList.innerHTML = "";

        if (!checkins.length) {
            checkinMessage.textContent =
                "No staff check-ins have been recorded yet.";
            return;
        }

        checkinMessage.textContent =
            `Showing ${checkins.length} recent staff check-in record(s).`;

        checkins.forEach(record => {

            const bus = buses.find(
                item => item.id === record.bus_id
            );

            const stop = stops.find(
                item => item.id === record.stop_id
            );

            const card = document.createElement("article");
            card.className = "record-card";

            card.innerHTML = `
                <div class="record-top">
                    <h3>Bus ${escapeHTML(bus?.bus_number || "Unknown")}</h3>
                    <span class="record-time">
                        ${escapeHTML(formatDate(record.checked_in_at))}
                    </span>
                </div>

                <p>
                    Stop: ${escapeHTML(stop?.stop_name || "Unknown")}
                </p>

                <p>
                    Occupancy: ${escapeHTML(record.occupancy || "Not recorded")}
                </p>

                ${record.notes
                    ? `<p>Notes: ${escapeHTML(record.notes)}</p>`
                    : ""}

                <span class="record-tag">STAFF CHECK-IN</span>
            `;

            checkinList.appendChild(card);
        });
    }

    function renderReports() {

        reportList.innerHTML = "";

        const filter = reportFilter.value;

        let filteredReports = reports;

        if (filter === "pending") {
            filteredReports = reports.filter(
                report => String(report.status || "")
                    .toLowerCase() === "pending"
            );
        }

        if (filter === "other") {
            filteredReports = reports.filter(
                report => String(report.status || "")
                    .toLowerCase() !== "pending"
            );
        }

        if (!filteredReports.length) {
            reportMessage.textContent =
                "No reports match the selected filter.";
            return;
        }

        reportMessage.textContent =
            `Showing ${filteredReports.length} passenger report(s).`;

        filteredReports.forEach(report => {

            const card = document.createElement("article");
            card.className = "record-card";

            card.innerHTML = `
                <div class="record-top">
                    <h3>Passenger Report #${escapeHTML(report.id)}</h3>

                    <span class="record-time">
                        ${escapeHTML(formatDate(report.reported_at))}
                    </span>
                </div>

                <p>
                    Report type:
                    ${escapeHTML(report.report_type || "Not specified")}
                </p>

                <p>
                    Status:
                    ${escapeHTML(report.status || "Not specified")}
                </p>

                <p>
                    Confirmations:
                    ${escapeHTML(report.confirmation_count ?? 0)}
                </p>

                <p>
                    Description:
                    ${escapeHTML(report.description || "No additional information")}
                </p>

                <span class="record-tag">
                    PASSENGER-SUBMITTED
                </span>
            `;

            reportList.appendChild(card);
        });
    }

    refreshButton.addEventListener("click", loadDashboard);

    reportFilter.addEventListener("change", renderReports);

    loadDashboard();

});
