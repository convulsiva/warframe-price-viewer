use std::{
    fs,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Duration, SecondsFormat, Utc};
use clap::{Parser, Subcommand};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const LEASE_PREFIX: &str = "WFMLEASE1";
const ACTIVATION_PREFIX: &str = "WFMK";
const KEY_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

#[derive(Parser)]
#[command(name = "wfm-license", about = "WFMarketTracker license service")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Serve {
        #[arg(long, default_value = "127.0.0.1:8787")]
        listen: SocketAddr,
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        private_key: PathBuf,
        #[arg(long, default_value_t = 72)]
        lease_hours: i64,
    },
    Keygen {
        #[arg(long)]
        private_key: PathBuf,
        #[arg(long)]
        public_key: PathBuf,
    },
    Create {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        customer: String,
        #[arg(long, conflicts_with = "lifetime")]
        days: Option<i64>,
        #[arg(long)]
        lifetime: bool,
    },
    List {
        #[arg(long)]
        database: PathBuf,
    },
    Revoke {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        id: String,
    },
    ResetDevice {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        id: String,
    },
    Extend {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        id: String,
        #[arg(long, conflicts_with = "lifetime")]
        days: Option<i64>,
        #[arg(long)]
        lifetime: bool,
    },
}

#[derive(Clone)]
struct AppState {
    database: Arc<Mutex<Connection>>,
    signing_key: Arc<SigningKey>,
    lease_hours: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActivateRequest {
    license_key: String,
    device_id: String,
    app_version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RefreshRequest {
    lease_token: String,
    device_id: String,
    app_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LeaseResponse {
    lease_token: String,
    details: LicenseDetails,
    offline_until: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseDetails {
    license_id: String,
    customer: String,
    issued_at: String,
    expires_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct LeasePayload {
    version: u8,
    license_id: String,
    customer: String,
    device_id: String,
    issued_at: String,
    lease_expires_at: String,
    license_expires_at: Option<String>,
}

#[derive(Debug)]
struct LicenseRecord {
    id: String,
    customer: String,
    status: String,
    created_at: String,
    expires_at: Option<String>,
    device_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: &'static str,
}

#[derive(Serialize)]
struct ApiErrorBody {
    code: &'static str,
    message: &'static str,
}

impl ApiError {
    fn bad_request(code: &'static str, message: &'static str) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code,
            message,
        }
    }

    fn forbidden(code: &'static str, message: &'static str) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            code,
            message,
        }
    }

    fn conflict(code: &'static str, message: &'static str) -> Self {
        Self {
            status: StatusCode::CONFLICT,
            code,
            message,
        }
    }

    fn internal() -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            code: "SERVER_ERROR",
            message: "The license service could not complete the request.",
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ApiErrorBody {
                code: self.code,
                message: self.message,
            }),
        )
            .into_response()
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    match cli.command {
        Command::Serve {
            listen,
            database,
            private_key,
            lease_hours,
        } => {
            if lease_hours < 1 {
                return Err("lease-hours must be at least 1".into());
            }
            let connection = open_database(&database)?;
            let signing_key = read_signing_key(&private_key)?;
            let state = AppState {
                database: Arc::new(Mutex::new(connection)),
                signing_key: Arc::new(signing_key),
                lease_hours,
            };
            let app = Router::new()
                .route("/health", get(health))
                .route("/v1/licenses/activate", post(activate))
                .route("/v1/licenses/refresh", post(refresh))
                .with_state(state);
            let listener = tokio::net::TcpListener::bind(listen).await?;
            println!("license service listening on {listen}");
            axum::serve(listener, app)
                .with_graceful_shutdown(shutdown_signal())
                .await?;
        }
        Command::Keygen {
            private_key,
            public_key,
        } => generate_signing_keys(&private_key, &public_key)?,
        Command::Create {
            database,
            customer,
            days,
            lifetime,
        } => create_license(&database, &customer, expiration(days, lifetime)?)?,
        Command::List { database } => list_licenses(&database)?,
        Command::Revoke { database, id } => set_status(&database, &id, "revoked")?,
        Command::ResetDevice { database, id } => reset_device(&database, &id)?,
        Command::Extend {
            database,
            id,
            days,
            lifetime,
        } => extend_license(&database, &id, days, lifetime)?,
    }
    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn activate(
    State(state): State<AppState>,
    Json(request): Json<ActivateRequest>,
) -> Result<Json<LeaseResponse>, ApiError> {
    validate_device_and_version(&request.device_id, &request.app_version)?;
    let key_hash = activation_key_hash(&request.license_key);
    let now = Utc::now();
    let mut database = state.database.lock().map_err(|_| ApiError::internal())?;
    let transaction = database.transaction().map_err(|_| ApiError::internal())?;
    let mut record = license_by_key_hash(&transaction, &key_hash)?
        .ok_or_else(|| ApiError::forbidden("INVALID_KEY", "This license key is not valid."))?;
    ensure_license_available(&record, now)?;

    match record.device_id.as_deref() {
        Some(device_id) if device_id != request.device_id => {
            audit(
                &transaction,
                &record.id,
                "activation_rejected",
                Some(&request.device_id),
            )?;
            transaction.commit().map_err(|_| ApiError::internal())?;
            return Err(ApiError::conflict(
                "ALREADY_ACTIVATED",
                "This license is already activated on another device.",
            ));
        }
        None => {
            transaction
                .execute(
                    "UPDATE licenses SET device_id = ?1, activated_at = ?2, last_seen_at = ?2 WHERE id = ?3",
                    params![request.device_id, timestamp(now), record.id],
                )
                .map_err(|_| ApiError::internal())?;
            record.device_id = Some(request.device_id.clone());
            audit(
                &transaction,
                &record.id,
                "activated",
                Some(&request.device_id),
            )?;
        }
        Some(_) => {
            transaction
                .execute(
                    "UPDATE licenses SET last_seen_at = ?1 WHERE id = ?2",
                    params![timestamp(now), record.id],
                )
                .map_err(|_| ApiError::internal())?;
            audit(
                &transaction,
                &record.id,
                "reactivated",
                Some(&request.device_id),
            )?;
        }
    }

    let response = issue_lease(&state, &record, &request.device_id, now)?;
    transaction.commit().map_err(|_| ApiError::internal())?;
    Ok(Json(response))
}

async fn refresh(
    State(state): State<AppState>,
    Json(request): Json<RefreshRequest>,
) -> Result<Json<LeaseResponse>, ApiError> {
    validate_device_and_version(&request.device_id, &request.app_version)?;
    let payload = verify_lease_signature(&request.lease_token, state.signing_key.verifying_key())?;
    if payload.device_id != request.device_id {
        return Err(ApiError::forbidden(
            "DEVICE_MISMATCH",
            "This license belongs to another device.",
        ));
    }

    let now = Utc::now();
    let mut database = state.database.lock().map_err(|_| ApiError::internal())?;
    let transaction = database.transaction().map_err(|_| ApiError::internal())?;
    let record = license_by_id(&transaction, &payload.license_id)?.ok_or_else(|| {
        ApiError::forbidden("INVALID_LICENSE", "This license is no longer available.")
    })?;
    ensure_license_available(&record, now)?;
    if record.device_id.as_deref() != Some(request.device_id.as_str()) {
        return Err(ApiError::forbidden(
            "DEVICE_MISMATCH",
            "This license belongs to another device.",
        ));
    }

    transaction
        .execute(
            "UPDATE licenses SET last_seen_at = ?1 WHERE id = ?2",
            params![timestamp(now), record.id],
        )
        .map_err(|_| ApiError::internal())?;
    audit(
        &transaction,
        &record.id,
        "refreshed",
        Some(&request.device_id),
    )?;
    let response = issue_lease(&state, &record, &request.device_id, now)?;
    transaction.commit().map_err(|_| ApiError::internal())?;
    Ok(Json(response))
}

fn ensure_license_available(record: &LicenseRecord, now: DateTime<Utc>) -> Result<(), ApiError> {
    if record.status != "active" {
        return Err(ApiError::forbidden(
            "LICENSE_REVOKED",
            "This license has been disabled.",
        ));
    }
    if let Some(expires_at) = record.expires_at.as_deref() {
        let expires_at = parse_timestamp(expires_at).map_err(|_| ApiError::internal())?;
        if now >= expires_at {
            return Err(ApiError::forbidden(
                "LICENSE_EXPIRED",
                "This license has expired.",
            ));
        }
    }
    Ok(())
}

fn issue_lease(
    state: &AppState,
    record: &LicenseRecord,
    device_id: &str,
    now: DateTime<Utc>,
) -> Result<LeaseResponse, ApiError> {
    let desired_expiration = now + Duration::hours(state.lease_hours);
    let lease_expiration = match record.expires_at.as_deref() {
        Some(value) => {
            desired_expiration.min(parse_timestamp(value).map_err(|_| ApiError::internal())?)
        }
        None => desired_expiration,
    };
    let payload = LeasePayload {
        version: 1,
        license_id: record.id.clone(),
        customer: record.customer.clone(),
        device_id: device_id.to_string(),
        issued_at: timestamp(now),
        lease_expires_at: timestamp(lease_expiration),
        license_expires_at: record.expires_at.clone(),
    };
    let payload_json = serde_json::to_vec(&payload).map_err(|_| ApiError::internal())?;
    let encoded_payload = general_purpose::URL_SAFE_NO_PAD.encode(payload_json);
    let signed_message = format!("{LEASE_PREFIX}.{encoded_payload}");
    let signature = state.signing_key.sign(signed_message.as_bytes());
    let lease_token = format!(
        "{signed_message}.{}",
        general_purpose::URL_SAFE_NO_PAD.encode(signature.to_bytes())
    );

    Ok(LeaseResponse {
        lease_token,
        details: LicenseDetails {
            license_id: record.id.clone(),
            customer: record.customer.clone(),
            issued_at: record.created_at.clone(),
            expires_at: record.expires_at.clone(),
        },
        offline_until: payload.lease_expires_at,
    })
}

fn verify_lease_signature(token: &str, public_key: VerifyingKey) -> Result<LeasePayload, ApiError> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 || parts[0] != LEASE_PREFIX {
        return Err(ApiError::bad_request(
            "INVALID_LEASE",
            "The stored license session is invalid.",
        ));
    }
    let signature_bytes = general_purpose::URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|_| {
            ApiError::bad_request("INVALID_LEASE", "The stored license session is invalid.")
        })?;
    let signature = Signature::from_slice(&signature_bytes).map_err(|_| {
        ApiError::bad_request("INVALID_LEASE", "The stored license session is invalid.")
    })?;
    public_key
        .verify(
            format!("{LEASE_PREFIX}.{}", parts[1]).as_bytes(),
            &signature,
        )
        .map_err(|_| {
            ApiError::forbidden("INVALID_LEASE", "The stored license session is invalid.")
        })?;
    let payload = general_purpose::URL_SAFE_NO_PAD
        .decode(parts[1])
        .ok()
        .and_then(|bytes| serde_json::from_slice::<LeasePayload>(&bytes).ok())
        .ok_or_else(|| {
            ApiError::bad_request("INVALID_LEASE", "The stored license session is invalid.")
        })?;
    if payload.version != 1 {
        return Err(ApiError::bad_request(
            "INVALID_LEASE",
            "The stored license session is invalid.",
        ));
    }
    Ok(payload)
}

fn validate_device_and_version(device_id: &str, app_version: &str) -> Result<(), ApiError> {
    if device_id.len() != 64 || !device_id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(ApiError::bad_request(
            "INVALID_DEVICE",
            "The device identifier is invalid.",
        ));
    }
    if app_version.is_empty() || app_version.len() > 32 {
        return Err(ApiError::bad_request(
            "INVALID_VERSION",
            "The application version is invalid.",
        ));
    }
    Ok(())
}

fn open_database(path: &Path) -> Result<Connection, Box<dyn std::error::Error>> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let connection = Connection::open(path)?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY,
            key_hash TEXT NOT NULL UNIQUE,
            key_suffix TEXT NOT NULL,
            customer TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
            created_at TEXT NOT NULL,
            expires_at TEXT,
            device_id TEXT,
            activated_at TEXT,
            last_seen_at TEXT
        );
        CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            device_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (license_id) REFERENCES licenses(id)
        );
        CREATE INDEX IF NOT EXISTS audit_events_license_id ON audit_events(license_id, created_at);",
    )?;
    Ok(connection)
}

fn license_by_key_hash(
    transaction: &Transaction<'_>,
    key_hash: &str,
) -> Result<Option<LicenseRecord>, ApiError> {
    query_license(
        transaction,
        "SELECT id, customer, status, created_at, expires_at, device_id FROM licenses WHERE key_hash = ?1",
        key_hash,
    )
}

fn license_by_id(
    transaction: &Transaction<'_>,
    id: &str,
) -> Result<Option<LicenseRecord>, ApiError> {
    query_license(
        transaction,
        "SELECT id, customer, status, created_at, expires_at, device_id FROM licenses WHERE id = ?1",
        id,
    )
}

fn query_license(
    transaction: &Transaction<'_>,
    query: &str,
    value: &str,
) -> Result<Option<LicenseRecord>, ApiError> {
    transaction
        .query_row(query, [value], |row| {
            Ok(LicenseRecord {
                id: row.get(0)?,
                customer: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                expires_at: row.get(4)?,
                device_id: row.get(5)?,
            })
        })
        .optional()
        .map_err(|_| ApiError::internal())
}

fn audit(
    transaction: &Transaction<'_>,
    license_id: &str,
    event_type: &str,
    device_id: Option<&str>,
) -> Result<(), ApiError> {
    transaction
        .execute(
            "INSERT INTO audit_events (license_id, event_type, device_id, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![license_id, event_type, device_id, timestamp(Utc::now())],
        )
        .map_err(|_| ApiError::internal())?;
    Ok(())
}

fn generate_signing_keys(
    private_path: &Path,
    public_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    if private_path.exists() || public_path.exists() {
        return Err("refusing to overwrite an existing signing key".into());
    }
    let signing_key = SigningKey::generate(&mut OsRng);
    if let Some(parent) = private_path.parent() {
        fs::create_dir_all(parent)?;
    }
    if let Some(parent) = public_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(
        private_path,
        general_purpose::STANDARD.encode(signing_key.to_bytes()),
    )?;
    fs::write(
        public_path,
        general_purpose::STANDARD.encode(signing_key.verifying_key().to_bytes()),
    )?;
    set_private_permissions(private_path)?;
    println!("created signing keys");
    Ok(())
}

#[cfg(unix)]
fn set_private_permissions(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
}

#[cfg(not(unix))]
fn set_private_permissions(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

fn read_signing_key(path: &Path) -> Result<SigningKey, Box<dyn std::error::Error>> {
    let bytes = general_purpose::STANDARD.decode(fs::read_to_string(path)?.trim())?;
    let bytes: [u8; 32] = bytes.try_into().map_err(|_| "invalid signing key length")?;
    Ok(SigningKey::from_bytes(&bytes))
}

fn create_license(
    database_path: &Path,
    customer: &str,
    expires_at: Option<DateTime<Utc>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let customer = customer.trim();
    if customer.is_empty() {
        return Err("customer cannot be empty".into());
    }
    let database = open_database(database_path)?;
    let id = format!("LIC-{}", random_characters(12).to_ascii_lowercase());
    let raw = random_characters(20);
    let activation_key = format!(
        "{ACTIVATION_PREFIX}-{}-{}-{}-{}-{}",
        &raw[0..4],
        &raw[4..8],
        &raw[8..12],
        &raw[12..16],
        &raw[16..20]
    );
    database.execute(
        "INSERT INTO licenses (id, key_hash, key_suffix, customer, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            activation_key_hash(&activation_key),
            &activation_key[activation_key.len() - 4..],
            customer,
            timestamp(Utc::now()),
            expires_at.map(timestamp)
        ],
    )?;
    println!("License ID: {id}");
    println!("Customer: {customer}");
    println!("Activation key (shown once): {activation_key}");
    Ok(())
}

fn list_licenses(database_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let database = open_database(database_path)?;
    let mut statement = database.prepare(
        "SELECT id, customer, status, key_suffix, created_at, expires_at, device_id, last_seen_at
         FROM licenses ORDER BY created_at DESC",
    )?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7)?,
        ))
    })?;
    println!("ID\tSTATUS\tKEY\tCUSTOMER\tEXPIRES\tDEVICE\tLAST SEEN");
    for row in rows {
        let (id, customer, status, suffix, _created, expires, device, last_seen) = row?;
        println!(
            "{id}\t{status}\t***{suffix}\t{customer}\t{}\t{}\t{}",
            expires.as_deref().unwrap_or("lifetime"),
            device
                .as_deref()
                .map(|value| &value[..12])
                .unwrap_or("unused"),
            last_seen.as_deref().unwrap_or("never")
        );
    }
    Ok(())
}

fn set_status(
    database_path: &Path,
    id: &str,
    status: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let database = open_database(database_path)?;
    let changed = database.execute(
        "UPDATE licenses SET status = ?1 WHERE id = ?2",
        params![status, id],
    )?;
    require_changed(changed, id)?;
    println!("{id} is now {status}");
    Ok(())
}

fn reset_device(database_path: &Path, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let database = open_database(database_path)?;
    let changed = database.execute(
        "UPDATE licenses SET device_id = NULL, activated_at = NULL, last_seen_at = NULL WHERE id = ?1",
        [id],
    )?;
    require_changed(changed, id)?;
    println!("device binding reset for {id}");
    Ok(())
}

fn extend_license(
    database_path: &Path,
    id: &str,
    days: Option<i64>,
    lifetime: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    if !lifetime && days.is_none() {
        return Err("use --days or --lifetime".into());
    }
    let database = open_database(database_path)?;
    let current_expiration: Option<Option<String>> = database
        .query_row(
            "SELECT expires_at FROM licenses WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .optional()?;
    let current_expiration =
        current_expiration.ok_or_else(|| format!("license not found: {id}"))?;
    let next_expiration = if lifetime {
        None
    } else {
        let days = days.ok_or("use --days or --lifetime")?;
        if days < 1 {
            return Err("days must be at least 1".into());
        }
        let base = current_expiration
            .as_deref()
            .map(parse_timestamp)
            .transpose()?
            .filter(|value| *value > Utc::now())
            .unwrap_or_else(Utc::now);
        Some(timestamp(base + Duration::days(days)))
    };
    database.execute(
        "UPDATE licenses SET expires_at = ?1, status = 'active' WHERE id = ?2",
        params![next_expiration, id],
    )?;
    println!("updated expiration for {id}");
    Ok(())
}

fn expiration(
    days: Option<i64>,
    lifetime: bool,
) -> Result<Option<DateTime<Utc>>, Box<dyn std::error::Error>> {
    if lifetime {
        return Ok(None);
    }
    let days = days.ok_or("use --days or --lifetime")?;
    if days < 1 {
        return Err("days must be at least 1".into());
    }
    Ok(Some(Utc::now() + Duration::days(days)))
}

fn require_changed(changed: usize, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    if changed == 0 {
        return Err(format!("license not found: {id}").into());
    }
    Ok(())
}

fn activation_key_hash(value: &str) -> String {
    let normalized = value.trim().to_ascii_uppercase();
    format!("{:x}", Sha256::digest(normalized.as_bytes()))
}

fn random_characters(length: usize) -> String {
    let mut bytes = vec![0_u8; length];
    OsRng.fill_bytes(&mut bytes);
    bytes
        .into_iter()
        .map(|byte| KEY_ALPHABET[(byte as usize) % KEY_ALPHABET.len()] as char)
        .collect()
}

fn timestamp(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn parse_timestamp(value: &str) -> Result<DateTime<Utc>, chrono::ParseError> {
    DateTime::parse_from_rfc3339(value).map(|value| value.with_timezone(&Utc))
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn activation_keys_are_normalized_before_hashing() {
        assert_eq!(
            activation_key_hash(" wfmk-abcd "),
            activation_key_hash("WFMK-ABCD")
        );
    }

    #[test]
    fn signed_leases_reject_modification() {
        let signing_key = SigningKey::generate(&mut OsRng);
        let payload = LeasePayload {
            version: 1,
            license_id: "LIC-test".into(),
            customer: "Test".into(),
            device_id: "a".repeat(64),
            issued_at: timestamp(Utc::now()),
            lease_expires_at: timestamp(Utc::now() + Duration::hours(72)),
            license_expires_at: None,
        };
        let encoded =
            general_purpose::URL_SAFE_NO_PAD.encode(serde_json::to_vec(&payload).unwrap());
        let message = format!("{LEASE_PREFIX}.{encoded}");
        let signature = signing_key.sign(message.as_bytes());
        let token = format!(
            "{message}.{}",
            general_purpose::URL_SAFE_NO_PAD.encode(signature.to_bytes())
        );
        assert!(verify_lease_signature(&token, signing_key.verifying_key()).is_ok());
        assert!(verify_lease_signature(&format!("{token}x"), signing_key.verifying_key()).is_err());
    }
}
