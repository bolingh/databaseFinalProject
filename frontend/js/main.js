/*
 * This script is shared by all four pages. HTML defines fields and buttons; this file handles their behavior.
 *
 * Start with loadUsers(): it fetches users from the backend and fills the top-right dropdown.
 * Then review saveCurrentUser(): it remembers the selected ID across page navigation.
 *
 * GET /users, POST /bookings, and booking-details GET /bookings make actual requests.
 * The backend must implement these endpoints. Train search, booking overview, and cancellation remain TODO.
 * TODO marks code that must be implemented later; comments are not executable.
 * Functions starting with render display data; examples/ui-example.js supplies clearly marked previews.
 * redirectToBookingDetails() opens the details page with the ID returned by a successful booking.
 */
// Keep variables in a local scope to avoid naming collisions with other scripts.
// This function executes immediately; the final }()); invokes it.
(function () {
  // Enable strict mode to catch errors such as assignments to undeclared variables.
  "use strict";

  // Storage key for the selected user; all four pages share this key.
  const USER_STORAGE_KEY = "mini_thsr_current_user_id";
  // Nginx forwards this same-origin endpoint to the backend. It supports POST and GET.
  const BOOKINGS_URL = "/bookings";
  // Read settings from config.js, which must be loaded before this script.
  const config = window.MINI_THSR_CONFIG;
  // getElementById() finds an HTML element by its id, such as the user dropdown.
  const userSelect = document.getElementById("current-user");
  const reloadButton = document.getElementById("reload-users");
  // data-page identifies the page; location.search contains the URL query string after ?.
  const page = document.body.dataset.page;
  const query = new URLSearchParams(window.location.search);
  // Use const for bindings that are not reassigned and let for bindings that may change.
  // These variables track the current user, retrieved users, request state, and displayed data.
  // users = [] is just the initial empty array, not a hard-coded user list.
  let currentUserId = "";
  let users = [];
  let storageAvailable = true;
  let usersRequestNumber = 0;
  let usersController = null;
  let selectedTrip = null;
  let displayedBooking = null;
  let bookingPending = false;
  let detailRequestNumber = 0;
  let detailController = null;

  // Display "No data available" consistently when a field has no value.
  // Zero seats and false are valid values, not missing data.
  function displayValue(value) {
    return value === undefined || value === null || value === "" ? "No data available" : String(value);
  }

  // Place feedback in the specified element, such as a request to select a user.
  // id identifies an HTML element; isError applies an additional error-text style when true.
  // Because this script is shared, return if the element does not exist on this page.
  function setMessage(id, message, isError) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", Boolean(isError));
  }

  // Retrieve the previously selected user ID.
  // localStorage is browser storage accessible to other pages on the same origin.
  // Return an empty string if none exists; record storage access failures for later feedback.
  function readStoredUser() {
    try {
      storageAvailable = true;
      return window.localStorage.getItem(USER_STORAGE_KEY) || "";
    } catch (error) {
      storageAvailable = false;
      return "";
    }
  }

  // Store the current user_id in the browser for use on other pages.
  // Remove the saved ID when the placeholder is selected, so the old user is not restored.
  // Only the ID is stored; the user list is fetched from the backend on every page load.
  function saveCurrentUser() {
    try {
      if (currentUserId) window.localStorage.setItem(USER_STORAGE_KEY, currentUserId);
      else window.localStorage.removeItem(USER_STORAGE_KEY);
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
    }
  }

  // Update the feedback next to the dropdown.
  // Handle unavailable browser storage, an empty user list, no selection, and a valid selection.
  function currentUserMessage() {
    if (!storageAvailable) {
      setMessage("user-message", "The browser cannot save your selection. Select a user again after changing pages.", true);
      return;
    }
    setMessage("user-message", users.length === 0 ? "No users are available." :
      (currentUserId ? "User selected. Your selection will be preserved across pages." : "Select a user first."));
  }

  // Reset the dropdown to its "Select a user" placeholder.
  // An empty value means no selection. Reset before reloading or after failure.
  function resetUserOptions() {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Select a user";
    userSelect.replaceChildren(option);
  }

  // Fetch users on page load and whenever Reload is clicked.
  // An API is a backend endpoint; GET /users retrieves user data here.
  // Reset the display, await the response, validate it, add options, and restore the selection.
  // async/await waits for asynchronous data instead of assuming it arrives immediately.
  async function loadUsers() {
    // Increment the request counter so an older response cannot overwrite a newer one.
    const requestNumber = ++usersRequestNumber;
    // Abort an earlier pending request using AbortController.
    if (usersController) usersController.abort();
    usersController = new AbortController();
    const controller = usersController;
    // Remember the current or stored ID before reloading, then restore it only if still valid.
    const rememberedId = currentUserId || readStoredUser();
    currentUserId = "";
    users = [];
    resetUserOptions();
    userSelect.disabled = true;
    reloadButton.disabled = true;
    setMessage("user-message", "Loading users…");
    invalidateUserViews();
    // Abort after the configured timeout to avoid displaying the loading state indefinitely.
    const timeout = window.setTimeout(function () { controller.abort(); }, config.requestTimeoutMs);

    try {
      // The actual backend request. config.usersUrl defaults to /users on the same origin.
      // GET retrieves data; Accept requests JSON; no-store avoids reusing a cached user list.
      // signal connects the request to cancellation and timeout handling.
      const response = await fetch(config.usersUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      // Even if the server responds, HTTP errors such as 404 or 500 must be handled below.
      if (!response.ok) throw new Error("Users API returned HTTP " + response.status + ".");
      // Parse the JSON response into JavaScript data.
      const data = await response.json();
      // Use Set to track IDs; each user must have a unique nonempty string ID and name.
      // Reject the entire response if any ID or name is blank or the structure is invalid.
      const seenIds = new Set();
      if (!Array.isArray(data) || !data.every(function (user) {
        if (!user || typeof user.user_id !== "string" || !user.user_id.trim() ||
          typeof user.name !== "string" || !user.name.trim() || seenIds.has(user.user_id)) return false;
        seenIds.add(user.user_id);
        return true;
      })) throw new Error("The Users API response has an invalid format.");
      if (requestNumber !== usersRequestNumber) return;
      users = data;
      // forEach iterates over users and creates an option for each one.
      data.forEach(function (user) {
        const option = document.createElement("option");
        // The value contains the user ID; textContent contains the displayed name.
        // textContent treats names as plain text, not executable HTML.
        option.value = user.user_id;
        option.textContent = user.name;
        userSelect.appendChild(option);
      });
      // Restore a saved ID only if it is still in the new list; otherwise clear the selection.
      currentUserId = seenIds.has(rememberedId) ? rememberedId : "";
      userSelect.value = currentUserId;
      userSelect.disabled = data.length === 0;
      saveCurrentUser();
      currentUserMessage();
      prepareDetailLookup();
    // On failure, clear and disable the dropdown rather than providing fake users.
    // Network, HTTP, JSON parsing, and timeout failures are handled here.
    } catch (error) {
      if (requestNumber !== usersRequestNumber) return;

      currentUserId = "";
      users = [];
      resetUserOptions();
      userSelect.disabled = true;
      const reason = error.name === "AbortError" ? "The request timed out." :
        (error instanceof SyntaxError ? "The response is not valid JSON." : error.message);
      setMessage("user-message", "Unable to load users. " + reason + " Check the server connection and reload.", true);
    // Always clear the timer and re-enable Reload after the request finishes.
    } finally {
      window.clearTimeout(timeout);
      if (requestNumber === usersRequestNumber) reloadButton.disabled = false;
    }
  }

  // Get the currently selected user ID.
  // Future booking, lookup, and cancellation calls must use this ID, not a hard-coded ID.
  function getCurrentUserId() { return currentUserId; }

  // Clear the previous user's booking display after switching users or reloading.
  // For example, do not leave user A's bookings visible after switching to user B.
  // This only clears displayed content; it does not delete bookings from the database.
  function invalidateUserViews() {
    // Invalidate pending detail requests so a previous user's response cannot reappear.
    ++detailRequestNumber;
    if (detailController) detailController.abort();
    detailController = null;
    displayedBooking = null;
    const list = document.getElementById("booking-list");
    if (list) emptyTable(list, 7, "No data available");
    document.querySelectorAll("[data-booking]").forEach(function (element) {
      element.textContent = "No data available";
    });
    const cancel = document.getElementById("cancel-booking");
    if (cancel) cancel.disabled = true;
    ["booking-message", "bookings-message", "detail-message"].forEach(function (id) { setMessage(id, ""); });
  }

  // The change event fires when the user selects a different dropdown option.
  userSelect.addEventListener("change", function () {
    currentUserId = userSelect.value;
    saveCurrentUser();
    invalidateUserViews();
    currentUserMessage();
    prepareDetailLookup();
  });
  // Attach loadUsers to the Reload button's click event.
  reloadButton.addEventListener("click", loadUsers);

  // Synchronize the selection and clear stale views if another same-origin tab changes it.
  window.addEventListener("storage", function (event) {
    if (event.key !== USER_STORAGE_KEY && event.key !== null) return;
    const id = readStoredUser();
    currentUserId = users.some(function (user) { return user.user_id === id; }) ? id : "";
    userSelect.value = currentUserId;
    invalidateUserViews();
    currentUserMessage();
    prepareDetailLookup();
  });

  // Insert a placeholder row into an empty table.
  // tbody contains table rows; columnCount specifies the width, and colSpan spans all columns.
  // The schedules table has five columns, while the bookings table has seven.
  function emptyTable(tbody, columnCount, message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = columnCount;
    cell.className = "empty-cell";
    cell.textContent = message;
    row.appendChild(cell);
    tbody.replaceChildren(row);
  }

  // Append a cell to a row and populate it.
  // tr defines a row and td a cell; displayValue() handles missing values.
  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = displayValue(value);
    row.appendChild(cell);
    return cell;
  }

  // Populate both station dropdowns from the backend station list.
  // Display station.name and use station.station_id as the option value.
  // This function is not called yet; the dropdowns currently show only placeholders.
  function renderStations(stations) {
    if (!Array.isArray(stations)) throw new TypeError("The stations response must be an array.");
    ["from-station", "to-station"].forEach(function (id) {
      const select = document.getElementById(id);
      if (!select) return;
      const prompt = document.createElement("option");
      prompt.value = "";
      prompt.textContent = "Select a station";
      select.replaceChildren(prompt);
      stations.forEach(function (station) {
        const option = document.createElement("option");
        option.value = station.station_id;
        option.textContent = station.name;
        select.appendChild(option);
      });
    });
  }

  // Collect the date, origin, destination, and two optional time limits.
  // URLSearchParams builds query parameters and encodes special characters such as spaces.
  // Omit blank optional times to indicate there is no corresponding time limit.
  function collectSearch() {
    const form = document.getElementById("search-form");
    if (!form) return null;
    const params = new URLSearchParams();
    ["date", "from_station_id", "to_station_id", "departure_time_from", "departure_time_to"].forEach(function (name) {
      const value = form.elements.namedItem(name).value;
      if (value !== "") params.set(name, value);
    });
    return params;
  }

  // Build a booking-page URL containing the selected train information.
  // schedule contains one train service; searchParams contains the searched date and stations.
  // The booking page reads these URL parameters and restores the user from localStorage.
  // Keep train numbers as strings to preserve any leading zeros.
  function bookingUrl(schedule, searchParams) {
    const params = new URLSearchParams();
    params.set("train_no", schedule.train_no);
    params.set("date", schedule.date || searchParams.get("date") || "");
    ["from_station_id", "to_station_id"].forEach(function (key) { params.set(key, searchParams.get(key) || ""); });
    ["departure_time", "arrival_time"].forEach(function (key) {
      if (schedule[key] !== undefined && schedule[key] !== null) params.set(key, schedule[key]);
    });
    return "booking.html?" + params.toString();
  }

  // Render each schedule as a row with a booking link.
  // Only display received data; do not generate trains or query the database here.
  // Call this function after the future GET /schedules request succeeds.
  // Include trains with zero remaining seats in the results.
  function renderSchedules(schedules, searchParams) {
    const tbody = document.getElementById("schedule-list");
    if (!tbody) return;
    tbody.replaceChildren();
    if (schedules.length === 0) { emptyTable(tbody, 5, "No matching trains found."); return; }
    schedules.forEach(function (schedule) {
      const row = document.createElement("tr");
      ["train_no", "departure_time", "arrival_time", "remain_seats"].forEach(function (key) { addCell(row, schedule[key]); });
      const link = document.createElement("a");
      link.className = "button button-small";
      link.textContent = "Book This Train";
      link.href = bookingUrl(schedule, searchParams);
      link.setAttribute("aria-label", "Book tickets for train " + schedule.train_no);
      const cell = document.createElement("td");
      cell.appendChild(link);
      row.appendChild(cell);
      tbody.appendChild(row);

    });
  }

  // Initialize train-search interactions; return on pages without search-form.
  // Station APIs are not connected, so a real train search cannot currently run.
  // After integration, reject identical stations or an earliest time later than the latest time.
  function initializeSearch() {
    const form = document.getElementById("search-form");
    if (!form) return;

    // Validate both the calendar date and the assignment's operating period.
    // A native date input submits YYYY-MM-DD even when its visible order follows the browser locale.
    function isValidTravelDate(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(value + "T00:00:00Z");
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value &&
        value >= "2026-12-01" && value <= "2027-01-31";
    }

    // Load stations before allowing a search. The backend response supplies both
    // dropdown values and labels; no station data is hard-coded in the frontend.
    fetch("/stations", {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store"
    }).then(function (response) {
      if (!response.ok) throw new Error("Stations API returned HTTP " + response.status + ".");
      return response.json();
    }).then(function (stations) {
      if (!Array.isArray(stations) || !stations.every(function (station) {
        return station && typeof station.station_id === "string" &&
          station.station_id.trim() && typeof station.name === "string" && station.name.trim();
      })) throw new Error("The Stations API response has an invalid format.");
      renderStations(stations);
      setMessage("search-message", "Select stations and search for trains.");
    }).catch(function (error) {
      setMessage("search-message", error.name === "AbortError" ? "Station request timed out." :
        "Unable to load stations: " + error.message, true);
    });
    form.querySelector('button[type="submit"]').addEventListener("click", function () {
      if (!form.elements.from_station_id.value || !form.elements.to_station_id.value) {
        setMessage("search-message", "Station data has not been loaded. Train search is unavailable.");
      }
    });
    // submit fires when the form is submitted. The browser first validates required fields,
    // and may display built-in validation feedback before this handler executes.
    form.addEventListener("submit", function (event) {
      // Prevent default navigation so JavaScript handles form submission.
      event.preventDefault();
      const params = collectSearch();
      if (!isValidTravelDate(params.get("date"))) {
        setMessage("search-message", "Enter a valid date from 2026-12-01 through 2027-01-31 using YYYY-MM-DD.", true); return;
      }
      if (params.get("from_station_id") === params.get("to_station_id")) {
        setMessage("search-message", "Departure and arrival stations must be different.", true); return;
      }
      const from = params.get("departure_time_from");
      const to = params.get("departure_time_to");
      if (from && to && from > to) {
        setMessage("search-message", "The earliest departure time cannot be later than the latest departure time.", true); return;
      }

      // Request schedules with the normalized form values. The response is
      // rendered as received; bookingUrl() carries the selected trip forward.
      setMessage("search-message", "Searching trains…");
      fetch("/schedules?" + params.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.error || "Schedules API returned HTTP " + response.status + ".");
          return data;
        });
      }).then(function (schedules) {
        if (!Array.isArray(schedules)) throw new Error("The Schedules API response has an invalid format.");
        renderSchedules(schedules, params);
        setMessage("search-message", schedules.length ? "Train search completed." : "No matching trains found.");
      }).catch(function (error) {
        setMessage("search-message", "Unable to search trains: " + error.message, true);
      });
    });
  }

  // Read train number, date, stations, and times from the booking-page URL.
  // query.get() reads a parameter; a missing parameter becomes an empty string and displays a placeholder.
  // data-trip maps each HTML element to the field it should display.
  // URL parameters can be edited; the backend must validate them again and must not trust them.
  function initializeTrip() {
    if (page !== "booking") return;
    selectedTrip = {};
    ["train_no", "date", "from_station_id", "to_station_id", "departure_time", "arrival_time"].forEach(function (key) {
      selectedTrip[key] = query.get(key) || "";
    });
    document.querySelectorAll("[data-trip]").forEach(function (element) {
      element.textContent = displayValue(selectedTrip[element.dataset.trip]);
    });
    if (selectedTrip.train_no && selectedTrip.date && selectedTrip.from_station_id && selectedTrip.to_station_id) {
      setMessage("trip-message", "Selected train details loaded. Seat availability must be confirmed when booking.");
    }

  }

  // Toggle seat options according to ticket count; this does not allocate any seats.
  // One ticket: allow a preference but clear and disable adjacent seating.
  // Two to five tickets: clear and disable preference; adjacent seating is optional and unchecked by default.
  // Keep the adjacency selection when switching among 2–5 tickets; disable both options for invalid counts.
  function updateSeatOptions() {
    const count = Number(document.getElementById("seat-count").value);
    const preference = document.getElementById("preference");
    const adjacent = document.getElementById("adjacent");
    const single = Number.isInteger(count) && count === 1;
    const multiple = Number.isInteger(count) && count >= 2 && count <= 5;
    preference.disabled = !single;
    if (!single) preference.value = "";
    adjacent.disabled = !multiple;
    if (!multiple) adjacent.checked = false;
  }

  // Collect the booking request from the current user, trip, and seat options.
  // For one ticket, an empty preference becomes null; other strings are passed to backend validation unchanged.
  // For multiple tickets, preference is null; for one ticket, adjacent is false.
  // This version stores adjacent seating in the Boolean adjacent field of the frontend draft.
  // The backend must support this existing adjacent extension and validate all inputs.
  function collectBookingRequest() {
    const count = Number(document.getElementById("seat-count").value);
    const preference = document.getElementById("preference").value;
    const multiple = Number.isInteger(count) && count >= 2 && count <= 5;
    return {
      user_id: getCurrentUserId(),
      train_no: selectedTrip.train_no,
      date: selectedTrip.date,
      from_station_id: selectedTrip.from_station_id,
      to_station_id: selectedTrip.to_station_id,
      seat_count: count,
      preference: count === 1 && preference.trim() !== "" ? preference : null,
      adjacent: multiple && document.getElementById("adjacent").checked
    };
  }

  // Initialize the booking page, display selected train details, and handle confirmation.
  // Ticket count determines enabled seat options; users choose adjacency for multiple tickets.
  // HTML validates a count of 1–5; JavaScript also checks user selection and train data.
  // Only a successful POST /bookings response can trigger navigation.
  function initializeBooking() {
    const form = document.getElementById("booking-form");
    if (!form) return;
    initializeTrip();
    updateSeatOptions();
    document.getElementById("seat-count").addEventListener("input", updateSeatOptions);
    const submitButton = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (bookingPending || !form.reportValidity()) return;
      if (!currentUserId) { setMessage("booking-message", "Select a user first.", true); return; }
      if (!selectedTrip.train_no || !selectedTrip.date || !selectedTrip.from_station_id || !selectedTrip.to_station_id) {
        setMessage("booking-message", "Select a train from the search results first.", true); return;
      }
      const request = collectBookingRequest();
      bookingPending = true;
      submitButton.disabled = true;
      setMessage("booking-message", "Submitting booking…");
      try {
        const booking = await requestBookingsJson(BOOKINGS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!booking || typeof booking.booking_id !== "string" || !booking.booking_id.trim() ||
            booking.user_id !== request.user_id || booking.error) {
          throw new Error("The booking response has an invalid booking ID or user.");
        }
        // Do not open user A's details if the dropdown changed to user B while waiting.
        if (currentUserId !== request.user_id) {
          setMessage("booking-message", "Booking succeeded for user " + request.user_id +
            ". Booking ID: " + booking.booking_id + ". Select this user before looking up the booking. Do not submit it again.");
          return;
        }
        redirectToBookingDetails(booking);
      } catch (error) {
        const reason = error.name === "AbortError" ? "The request timed out." : error.message;
        // With a lost response, the server may have committed. Never retry automatically.
        const reminder = error.httpStatus ? "" : " The booking outcome could not be confirmed. Check your bookings before submitting again.";
        setMessage("booking-message", "Unable to complete booking. " + reason + reminder, true);
      } finally {
        bookingPending = false;
        submitButton.disabled = false;
      }
    });
  }

  // Read JSON, preserve backend error.code/message, and always release the timeout.
  // A missing endpoint may return HTML; report its HTTP status without treating it as success.
  async function requestBookingsJson(url, options, controller) {
    controller = controller || new AbortController();
    const timeout = window.setTimeout(function () { controller.abort(); }, config.requestTimeoutMs);
    try {
      const response = await fetch(url, Object.assign({}, options, {
        headers: Object.assign({ "Accept": "application/json" }, options.headers || {}),
        cache: "no-store",
        signal: controller.signal
      }));
      let data;
      try { data = await response.json(); }
      catch (error) {
        if (error.name === "AbortError") throw error;
        const invalid = new Error(response.ok ? "The Booking API response is not valid JSON." :
          "Booking API returned HTTP " + response.status + ".");
        if (!response.ok) invalid.httpStatus = response.status;
        throw invalid;
      }
      if (!response.ok) {
        const backendError = data && data.error;
        const code = backendError && typeof backendError.code === "string" ? backendError.code : "";
        const message = backendError && typeof backendError.message === "string" ? backendError.message : "";
        const failure = new Error((code ? code + ": " : "") + (message || "Booking API returned HTTP " + response.status + "."));
        failure.httpStatus = response.status;
        throw failure;
      }
      return data;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Create a booking-details URL containing booking_id.
  // URLSearchParams encodes special characters so the booking ID does not corrupt the URL.
  function detailUrl(bookingId) {
    const params = new URLSearchParams({ booking_id: bookingId });
    return "booking-detail.html?" + params.toString();
  }

  // Navigate using a backend-issued ID. Details are fetched from the backend on the next page.
  function redirectToBookingDetails(booking) {
    if (!booking || typeof booking.booking_id !== "string" || !booking.booking_id.trim() ||
        !currentUserId || booking.user_id !== currentUserId) {
      setMessage("booking-message", "The booking response has no valid ID for the current user.", true);
      return false;
    }
    window.location.assign(detailUrl(booking.booking_id));
    return true;
  }

  // Convert backend booking status values into readable English labels.
  // confirmed and cancelled have display labels; other values are shown unchanged.
  // This changes presentation only, not the backend booking status.
  function statusLabel(value) {
    if (value === "confirmed") return "Confirmed";
    if (value === "cancelled") return "Cancelled";
    return displayValue(value);
  }

  // Render bookings on the overview page, including cancelled bookings.
  // Check user_id to avoid displaying a previous user's response after the selection changes.
  // Display even a single booking in the table; display a message for an empty list.
  // Both the booking ID and View Details link use detailUrl().
  function renderBookings(bookings) {
    const tbody = document.getElementById("booking-list");
    if (!tbody) return;

    const owned = bookings.filter(function (booking) { return currentUserId && booking.user_id === currentUserId; });
    tbody.replaceChildren();
    if (owned.length === 0) { emptyTable(tbody, 7, "No matching bookings found."); return; }
    owned.forEach(function (booking) {
      const row = document.createElement("tr");
      const idCell = document.createElement("td");
      const idLink = document.createElement("a");
      idLink.href = detailUrl(booking.booking_id);
      idLink.textContent = booking.booking_id;
      idCell.appendChild(idLink);
      row.appendChild(idCell);
      ["train_no", "date", "from_station_id", "to_station_id"].forEach(function (key) { addCell(row, booking[key]); });
      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = "status" + (booking.status === "cancelled" ? " status-cancelled" : "");
      status.textContent = statusLabel(booking.status);
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      const cell = document.createElement("td");
      const link = document.createElement("a");
      link.href = detailUrl(booking.booking_id);
      link.className = "button button-secondary button-small";
      link.textContent = "View Details";
      link.setAttribute("aria-label", "View details for booking " + booking.booking_id + "");
      cell.appendChild(link);
      row.appendChild(cell);
      tbody.appendChild(row);
    });

  }

  // Collect booking search parameters.
  // Always include current user_id; omit a blank booking ID to search all bookings.
  // trim() removes surrounding whitespace, such as an accidental leading space.
  function collectBookingsQuery() {
    const params = new URLSearchParams({ user_id: getCurrentUserId() });
    const id = document.getElementById("booking-id").value.trim();
    if (id) params.set("booking_id", id);
    return params;
  }

  // Initialize booking overview search, checking user selection on submission.
  // For now, only collect parameters and display a notice; no backend lookup is performed.
  function initializeBookings() {
    const form = document.getElementById("bookings-form");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!currentUserId) { setMessage("bookings-message", "Select a user first.", true); return; }
      const params = collectBookingsQuery();

      // TODO: Call GET /bookings with params, including the current user_id.
      // A blank ID searches all bookings, including cancelled ones; otherwise search one ID for this user.
      // Pass any returned array, including a single result or [], to renderBookings(response).
      // Do not show a stale response if the user changes while the request is pending.
      // The void statement below preserves the parameters without issuing a request.
      void params;
      setMessage("bookings-message", "Booking search is not available yet.");
    });
  }

  // Format booking fields for the details page.
  // Show "No preference" for null preference and "Not applicable" for null outcomes.
  // seats is an array; join all seat_id values, not just the first one.
  function bookingFieldValue(booking, key) {
    const value = booking[key];
    if (key === "status") return statusLabel(value);
    if (key === "preference" && value === null) return "No preference";
    if (key === "preference_met" || key === "adjacent_met") {
      if (value === null) return "Not applicable";
      if (value === true) return "Fulfilled";
      if (value === false) return "Not fulfilled";
    }
    if (key === "seats" && Array.isArray(value)) {
      return value.length ? value.map(function (seat) { return seat.seat_id; }).join(", ") : "No seats";
    }
    return displayValue(value);
  }

  // After a lookup, find the record matching the current user_id and URL booking_id.
  // The API returns an array even for one booking, so use find() to locate it.
  // Clear the details if not found; disable cancellation for a cancelled booking.
  function renderBookingDetails(bookings) {
    const bookingId = query.get("booking_id") || "";
    const booking = bookings.find(function (item) { return currentUserId && item.user_id === currentUserId && item.booking_id === bookingId; });
    if (!booking) {
      invalidateUserViews();
      setMessage("detail-message", "No booking matches the current user and booking ID.");
      return;
    }
    displayedBooking = booking;
    document.querySelectorAll("[data-booking]").forEach(function (element) {
      element.textContent = bookingFieldValue(booking, element.dataset.booking);
    });
    document.getElementById("cancel-booking").disabled = booking.status === "cancelled";
    setMessage("detail-message", booking.status === "cancelled" ? "This booking has been cancelled. Previously assigned seats remain visible for reference." : "");
  }

  // Prepare details lookup using the booking ID and current user.
  // If the ID is missing, ask for a selection from the overview; otherwise require a user.
  // Always fetch current backend data, including after refresh or opening the URL in another tab.
  async function prepareDetailLookup() {
    if (page !== "detail") return;
    invalidateUserViews();
    const bookingId = query.get("booking_id") || "";
    if (!bookingId) { setMessage("detail-message", "Select a booking from the Booking Overview page."); return; }
    if (!currentUserId) { setMessage("detail-message", "Select a user first."); return; }

    const userId = currentUserId;
    const requestNumber = detailRequestNumber;
    const controller = new AbortController();
    detailController = controller;
    const params = new URLSearchParams({ user_id: userId, booking_id: bookingId });
    setMessage("detail-message", "Loading booking details…");
    try {
      // The PDF specifies an array, even for a single ID; no match is HTTP 200 with [].
      const bookings = await requestBookingsJson(BOOKINGS_URL + "?" + params.toString(), { method: "GET" }, controller);
      if (requestNumber !== detailRequestNumber || userId !== currentUserId) return;
      if (!Array.isArray(bookings) || !bookings.every(function (booking) {
        return booking && typeof booking.booking_id === "string" && typeof booking.user_id === "string" &&
          Number.isInteger(booking.seat_count) && booking.seat_count >= 1 && booking.seat_count <= 5 &&
          Array.isArray(booking.seats) && booking.seats.length === booking.seat_count &&
          booking.seats.every(function (seat) { return seat && typeof seat.seat_id === "string" && seat.seat_id.trim(); });
      })) throw new Error("The Booking API response has an invalid format.");
      renderBookingDetails(bookings);
    } catch (error) {
      if (requestNumber !== detailRequestNumber || userId !== currentUserId) return;
      const reason = error.name === "AbortError" ? "The request timed out." : error.message;
      setMessage("detail-message", "Unable to load booking details. " + reason, true);
    } finally {
      if (detailController === controller) detailController = null;
    }
  }

  // Initialize the cancellation button. The Back link is handled directly by HTML.
  // Cancellation requires the current user_id and booking_id from the URL.
  // This only displays an unavailable notice and does not change booking status.
  function initializeDetail() {
    const cancel = document.getElementById("cancel-booking");
    if (!cancel) return;
    cancel.disabled = true;
    prepareDetailLookup();
    cancel.addEventListener("click", function () {
      if (!currentUserId) { setMessage("detail-message", "Select a user first.", true); return; }
      const bookingId = query.get("booking_id") || "";
      if (!bookingId) { setMessage("detail-message", "Select a booking from the Booking Overview page.", true); return; }

      // TODO: POST /bookings/{booking_id}/cancel, encoding the path ID with encodeURIComponent.
      // Send JSON { user_id: getCurrentUserId() } to cancel the entire booking and all its tickets.
      // On success, call renderBookingDetails([response]) to show the updated backend status.
      // Do not mark the booking cancelled optimistically; display backend errors such as ALREADY_CANCELLED.
      // The void statement below does not alter or cancel a booking.
      void displayedBooking;
      setMessage("detail-message", "Cancellation is not available yet. The booking status has not changed.");
    });
  }

  // Expose these utilities through window.MiniTHSR for future API integration.
  // For example, renderBookings() updates the table but does not fetch data itself.
  // Object.freeze() prevents accidental changes to this utility registry at runtime.
  window.MiniTHSR = Object.freeze({
    getCurrentUserId: getCurrentUserId,
    loadUsers: loadUsers,
    renderStations: renderStations,
    collectSearch: collectSearch,
    renderSchedules: renderSchedules,
    bookingUrl: bookingUrl,
    collectBookingRequest: collectBookingRequest,
    redirectToBookingDetails: redirectToBookingDetails,
    collectBookingsQuery: collectBookingsQuery,
    renderBookings: renderBookings,
    detailUrl: detailUrl,
    renderBookingDetails: renderBookingDetails
  });

  // Initialize all four pages after DOM setup, then load users.
  // Each initialize function returns immediately if its elements are absent on the current page.
  initializeSearch();
  initializeBooking();
  initializeBookings();
  initializeDetail();
  loadUsers();
}());
