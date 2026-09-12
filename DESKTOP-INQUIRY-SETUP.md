# Desktop inquiry delivery — draft, not ready for release

The desktop form is implemented in catalog.html and catalog-inquiry.js. Phone visitors retain the existing native SMS links. No email or SMS is sent by this draft; its endpoint configuration is intentionally blank until a verified receiver exists.

The existing Door Finder uses a Google Cloud Run service at https://doorfinder-933963197210.us-central1.run.app. Its backend source and deployment credentials are not present in the connected repositories. The existing staff request viewer is norwood-tool/door-requests.html. No assumption has been made that its endpoint already supports catalog inquiries.

## Required integration

Extend the existing backend, once its source is available, to accept action `catalog_inquiry` with `requestId`, `name`, `contact`, `product: {name,url}`, `message`, and the `website` honeypot. Validate field limits and the product URL server-side, reject spam, enforce rate limits, and allow only approved website origins. Do not rely on client-side validation alone.

Persist the inquiry to the existing staff request workflow with name/contact, created timestamp, product description/link and notes. Make catalog inquiries clearly recognizable in the staff viewer. Do not fabricate photo analysis. Confirm the record appears in the staff queue with functioning call/text/email reply links. Add staff notification through the existing notification channel if configured; no such notification mechanism was confirmed during this review.

Use requestId as an idempotency key: repeat requests must return the same receipt without duplicate records or notifications. Return HTTP 2xx with `{ "received": true, "requestId": "<exact submitted id>" }` only after durable saving. Unknown actions and failed writes must return an error, never a success receipt.

Set the script's data-endpoint in catalog.html only after the backend is ready. Verify browser CORS, a controlled test inquiry and staff-side receipt/reply routing, failure/retry behavior, and phone SMS behavior before merging this draft. Customer details must remain inaccessible to public reads. Backend access is required; GitHub Pages alone cannot run this receiver.

## Tests

Run `node --test tests/*.test.cjs`. Current tests simulate receipt responses and prove only the frontend contract; they do not demonstrate live delivery.
