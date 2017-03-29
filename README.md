# uwcalendar-web

A Node.js app for managing any web requests from the mobile app.

## Build Process

Run `npm install` from the root directory to install `bin/www` and the required `node_modules`.

### Notes

- When creating the `/details` folder, make sure that the quarter details start date is exactly the first date, whereas the end is buffered by one day. Kinda like the `lo` inclusive, `hi` exclusive.
