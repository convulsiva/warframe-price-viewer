# WFMarketTracker licensing

## Private key

The private signing key is stored outside the repository:

```text
~/.wfmarkettracker/license-private-key.pem
```

Create it once with:

```bash
npm run license:setup
```

Back up this file in an encrypted password manager or encrypted external drive. Never commit it, upload it to GitHub, send it to a customer, or include it in a release. Losing it means you cannot generate licenses accepted by this application build.

The matching public key is stored in `src-tauri/license-public-key.txt`. It is safe to include in the application.

## Generate licenses

Interactive mode:

```bash
npm run license:generate
```

The command asks for the customer and a duration in days. Leave the duration empty to create a lifetime license.

Lifetime license:

```bash
npm run license:generate -- --customer "customer@example.com" --lifetime
```

License valid for 30 days from generation:

```bash
npm run license:generate -- --customer "customer@example.com" --days 30
```

License valid until the end of a specific UTC date:

```bash
npm run license:generate -- --customer "customer@example.com" --expires 2026-12-31
```

Optional custom license ID:

```bash
npm run license:generate -- --customer "customer@example.com" --days 30 --id WFM-CUSTOMER-001
```

Send only the generated `WFM1...` license string to the customer.

## Application behavior

- The application validates the stored license at startup.
- A valid license is checked again every 60 seconds, when the window regains focus, and when it becomes visible.
- An expired or invalid license immediately locks the main interface.
- The license is stored locally after successful activation.
- A customer can replace a license from Settings or from the locked activation screen.
- Lifetime licenses have no expiration date.

This is offline licensing. Issued licenses cannot be remotely revoked, and the application uses the computer's system clock when checking expiration.
