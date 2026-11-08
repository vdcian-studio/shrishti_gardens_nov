# Shrishti Gardens — public website (Phase 1 prototype)

Single-page website for Shrishti Gardens, a boutique nature retreat in Kodaikanal, Tamil Nadu.
Plain HTML, CSS and JavaScript — no build step.

## Run locally

From this folder, run one of:

    npx serve -l 5173
    python -m http.server 5173

then open http://localhost:5173. On Windows you can double-click `start-localhost.bat`.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | All page sections (hero, story, suites, amenities, experience, gallery, reviews, location, booking, contact, footer) |
| `styles.css` | All styles |
| `main.js` | Page behaviour: navigation, enquiry pop-up, estimate, UPI payment, status lookup, reviews marquee, weather, video |
| `picker.js` | Date-range calendar and guest selector |
| `qr.js` | QR code encoder (Kazuhiko Arase, MIT) used for the UPI payment QR |
| `assets/` | Logos, favicons, photos and the Experience video |

## Prototype limitations (to be replaced in later phases)

- Enquiries, payments and booking status are stored only in the visitor's browser (`localStorage`). Nothing is sent to a server yet.
- UPI payments are not verified automatically: the team must match each UTR against the bank account. Razorpay is planned for a later phase.
- Guest reviews are clearly labelled sample placeholders until verified reviews are approved.
- Standard Suite still uses a sample photo.
