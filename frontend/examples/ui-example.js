/* Presentation-only data for previewing unfinished frontend screens.
 * This file never calls an API and must not be used as assignment logic.
 */
(function () {
  "use strict";

  const stations = Object.freeze([
    Object.freeze({ station_id: "TPE", name: "Taipei" }),
    Object.freeze({ station_id: "TXG", name: "Taichung" }),
    Object.freeze({ station_id: "ZUY", name: "Zuoying" })
  ]);

  const schedules = Object.freeze([
    Object.freeze({ train_no: "0601", departure_time: "06:30", arrival_time: "08:20", remain_seats: 18 }),
    Object.freeze({ train_no: "0603", departure_time: "07:00", arrival_time: "08:55", remain_seats: 7 })
  ]);

  function setText(id, text, error) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("is-error", Boolean(error));
  }

  const searchButton = document.getElementById("load-search-example");
  if (searchButton) {
    searchButton.addEventListener("click", function () {
      const params = new URLSearchParams({
        date: "2026-12-07",
        from_station_id: "TPE",
        to_station_id: "ZUY"
      });
      window.MiniTHSR.renderStations(stations);
      document.getElementById("travel-date").value = params.get("date");
      document.getElementById("from-station").value = params.get("from_station_id");
      document.getElementById("to-station").value = params.get("to_station_id");
      window.MiniTHSR.renderSchedules(schedules, params);
      setText("search-message", "Frontend example loaded. No stations or schedules API was called.");
    });
  }

}());
