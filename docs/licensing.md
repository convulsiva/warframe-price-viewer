# WFMarketTracker licensing

WFMarketTracker uses one-device server activation. An activation key can be redeemed on one computer. The server returns an Ed25519-signed lease that keeps the application available offline for up to 72 hours.

## Server

The production license API is available at:

```text
https://46.101.251.26
```

The service runs as `wfmarkettracker-license.service`. Its SQLite database and private signing key are stored in `/var/lib/wfmarkettracker` and are readable only by the service account. The private signing key must never be copied into the repository or an application build.

Connect to the server:

```bash
ssh -i ~/.ssh/wfmarkettracker_server_ed25519 root@46.101.251.26
```

## Create a license

Thirty days:

```bash
wfm-license create \
  --database /var/lib/wfmarkettracker/licenses.sqlite3 \
  --customer "customer@example.com" \
  --days 30
```

Lifetime:

```bash
wfm-license create \
  --database /var/lib/wfmarkettracker/licenses.sqlite3 \
  --customer "customer@example.com" \
  --lifetime
```

The activation key is displayed once. Send the `WFMK-...` value to the customer. The database stores only its SHA-256 hash, so a lost activation key cannot be recovered.

## Manage licenses

List licenses:

```bash
wfm-license list --database /var/lib/wfmarkettracker/licenses.sqlite3
```

Extend an existing license by 30 days:

```bash
wfm-license extend --database /var/lib/wfmarkettracker/licenses.sqlite3 --id LIC-XXXXXXXXXXXX --days 30
```

Convert a license to lifetime:

```bash
wfm-license extend --database /var/lib/wfmarkettracker/licenses.sqlite3 --id LIC-XXXXXXXXXXXX --lifetime
```

Revoke a license:

```bash
wfm-license revoke --database /var/lib/wfmarkettracker/licenses.sqlite3 --id LIC-XXXXXXXXXXXX
```

Release its device binding before moving it to a replacement computer:

```bash
wfm-license reset-device --database /var/lib/wfmarkettracker/licenses.sqlite3 --id LIC-XXXXXXXXXXXX
```

Resetting a device does not reveal or replace the original activation key. Generate a new license if the customer no longer has that key.

## Application behavior

- Activation binds the key to a privacy-preserving hash derived from the computer identity.
- Reusing the key on the same computer is allowed after reinstalling the application.
- Reusing it on another computer is rejected until the owner resets the device binding.
- The application checks the signed lease locally at every startup.
- It contacts the server at startup, every six hours, and after returning to the application.
- A temporary server or internet outage does not interrupt an unexpired 72-hour offline lease.
- Revoked and expired licenses lock when the next online check succeeds, or when the current offline lease expires.
- Application updates keep the stored lease.

## Operations

Check the service:

```bash
systemctl status wfmarkettracker-license
curl https://46.101.251.26/health
```

View recent logs:

```bash
journalctl -u wfmarkettracker-license --since today
```

The short-lived IP certificate is renewed automatically by Certbot. When a domain becomes available, replace the IP URL and certificate configuration before releasing the corresponding client update.
