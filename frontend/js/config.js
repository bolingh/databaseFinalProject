/*
 * To change the Users API endpoint, edit this file.
 *
 * /users refers to the /users path on the same website hosting the current page.
 * For example, if the page is opened at http://localhost:8080/index.html,
 * the application will fetch data from http://localhost:8080/users.
 * This configuration does not automatically create a backend;
 * the backend must still provide data at the specified endpoint.
 *
 * If the frontend and backend are hosted separately, usersUrl can be
 * changed to the full URL of the provided API endpoint.
 * If they use different origins or ports, the backend must allow
 * cross-origin requests from the frontend (CORS).
 *
 * requestTimeoutMs specifies the request timeout in milliseconds.
 * A value of 10000 means 10 seconds.
 * If the request exceeds this limit, a timeout message will be displayed,
 * and the user can click "Reload" to try again.
 *
 * The window object makes this configuration accessible to main.js,
 * while Object.freeze() prevents accidental modifications at runtime.
 * To update the configuration, edit and save this file,
 * then refresh the webpage.
 */
window.MINI_THSR_CONFIG = Object.freeze({
  usersUrl: "/users",
  requestTimeoutMs: 10000
});
