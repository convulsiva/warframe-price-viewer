# WFMarketTracker License Server

Private activation service for one-device licenses. Public HTTP endpoints only activate and refresh signed 72-hour offline leases. License administration is performed through the server CLI over SSH.

The database stores SHA-256 hashes of activation keys. A newly created activation key is printed once and cannot be recovered from the database.

## Local development

```bash
cargo run --manifest-path license-server/Cargo.toml -- keygen \
  --private-key /tmp/wfm-license-private.key \
  --public-key /tmp/wfm-license-public.key

cargo run --manifest-path license-server/Cargo.toml -- create \
  --database /tmp/wfm-licenses.sqlite3 \
  --customer "customer@example.com" \
  --days 30

cargo run --manifest-path license-server/Cargo.toml -- serve \
  --database /tmp/wfm-licenses.sqlite3 \
  --private-key /tmp/wfm-license-private.key
```

Never commit the database or private signing key.
