#!/bin/bash

# backup.sh - Enterprise Task Management System Backup Script
# Version: 1.0.0
# Dependencies:
# - azure-cli v2.50+
# - postgresql-client v14+
# - redis-tools v7.0+

set -euo pipefail
shopt -s nullglob

# Global Constants
readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly LOG_FILE="/var/log/taskmanager/backup_${TIMESTAMP}.log"
readonly LOCK_FILE="/var/run/taskmanager_backup.lock"

# Environment validation
declare -A REQUIRED_VARS=(
    ["BACKUP_ROOT"]="/backup"
    ["POSTGRES_HOST"]="${DB_HOST}"
    ["POSTGRES_DB"]="${DB_NAME}"
    ["POSTGRES_USER"]="${DB_USER}"
    ["POSTGRES_PASSWORD"]="${DB_PASSWORD}"
    ["REDIS_HOST"]="${REDIS_HOST}"
    ["REDIS_PORT"]="${REDIS_PORT}"
    ["AZURE_STORAGE_ACCOUNT"]="${AZURE_STORAGE_ACCOUNT}"
    ["AZURE_STORAGE_KEY"]="${AZURE_STORAGE_KEY}"
    ["BACKUP_CONTAINER"]="${AZURE_STORAGE_CONTAINER}"
    ["ENCRYPTION_KEY"]="${BACKUP_ENCRYPTION_KEY}"
    ["PARALLEL_JOBS"]="4"
    ["COMPRESSION_LEVEL"]="9"
    ["BACKUP_TIMEOUT"]="3600"
    ["RETRY_ATTEMPTS"]="3"
)

# Logging functions
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "${timestamp}|${level}|${SCRIPT_NAME}|${message}" | tee -a "${LOG_FILE}"
}

info() { log "INFO" "$1"; }
warn() { log "WARNING" "$1"; }
error() { log "ERROR" "$1"; }
debug() { log "DEBUG" "$1"; }

# Error handling function
handle_error() {
    local error_message="$1"
    local operation_type="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    error "Error during ${operation_type}: ${error_message}"
    error "Stack trace: $(caller)"
    
    # Capture system state
    debug "System state: $(free -h)"
    debug "Disk space: $(df -h)"
    
    # Cleanup partial backups
    if [[ -d "${BACKUP_ROOT}/partial_${operation_type}" ]]; then
        rm -rf "${BACKUP_ROOT}/partial_${operation_type}"
    fi
    
    # Send alert to monitoring system
    if command -v curl &>/dev/null; then
        curl -X POST "${MONITORING_WEBHOOK}" \
             -H "Content-Type: application/json" \
             -d "{\"level\":\"error\",\"operation\":\"${operation_type}\",\"message\":\"${error_message}\"}" \
             || true
    fi
    
    return 1
}

# Trap signals
trap 'error "Backup interrupted"; cleanup; exit 1' SIGINT SIGTERM

# Setup environment and validate dependencies
setup_environment() {
    info "Starting backup environment setup"
    
    # Verify running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        return 1
    fi
    
    # Validate environment variables
    for var in "${!REQUIRED_VARS[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            return 1
        fi
    done
    
    # Check required tools and versions
    local tools=("az" "pg_dump" "redis-cli")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            error "Required tool $tool is not installed"
            return 1
        fi
    done
    
    # Verify tool versions
    if ! pg_dump --version | grep -q "14."; then
        error "PostgreSQL client version 14+ is required"
        return 1
    fi
    
    # Create backup directories with secure permissions
    mkdir -p "${BACKUP_ROOT}"/{db,redis,files,temp}
    chmod 700 "${BACKUP_ROOT}"/{db,redis,files,temp}
    
    # Authenticate with Azure
    info "Authenticating with Azure Storage"
    if ! az storage container show-permission \
         --account-name "${AZURE_STORAGE_ACCOUNT}" \
         --account-key "${AZURE_STORAGE_KEY}" \
         --name "${BACKUP_CONTAINER}" &>/dev/null; then
        error "Failed to authenticate with Azure Storage"
        return 1
    fi
    
    info "Environment setup completed successfully"
    return 0
}

# Database backup function
backup_database() {
    local backup_type="$1"
    local backup_file="${BACKUP_ROOT}/db/postgres_${backup_type}_${TIMESTAMP}.sql.gz"
    local metadata_file="${backup_file}.meta"
    
    info "Starting PostgreSQL backup: ${backup_type}"
    
    # Check available disk space
    local required_space=$(psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
                          -tAc "SELECT pg_database_size('${POSTGRES_DB}')")
    local available_space=$(df --output=avail "${BACKUP_ROOT}" | tail -n1)
    
    if (( available_space < required_space * 2 )); then
        handle_error "Insufficient disk space for database backup" "database_backup"
        return 1
    fi
    
    # Execute backup with parallel compression
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "${POSTGRES_HOST}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --format=custom \
        --jobs="${PARALLEL_JOBS}" \
        --compress="${COMPRESSION_LEVEL}" \
        --file="${backup_file}" \
        || return 1
    
    # Calculate checksum and encrypt
    sha256sum "${backup_file}" > "${backup_file}.sha256"
    openssl enc -aes-256-cbc -salt -in "${backup_file}" \
            -out "${backup_file}.enc" -pass "pass:${ENCRYPTION_KEY}" \
            || return 1
    
    # Upload to Azure Storage
    az storage blob upload \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${BACKUP_CONTAINER}" \
        --name "db/${backup_type}/${TIMESTAMP}/backup.sql.gz.enc" \
        --file "${backup_file}.enc" \
        --metadata "type=${backup_type}" "timestamp=${TIMESTAMP}" \
        || return 1
    
    info "Database backup completed successfully"
    return 0
}

# Redis backup function
backup_redis() {
    local backup_file="${BACKUP_ROOT}/redis/redis_${TIMESTAMP}.rdb.gz"
    
    info "Starting Redis backup"
    
    # Trigger SAVE command
    if ! redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" SAVE; then
        handle_error "Failed to trigger Redis SAVE" "redis_backup"
        return 1
    fi
    
    # Copy and compress dump file
    if ! cp /var/lib/redis/dump.rdb "${backup_file%.gz}" || \
       ! pigz -p "${PARALLEL_JOBS}" -${COMPRESSION_LEVEL} "${backup_file%.gz}"; then
        handle_error "Failed to compress Redis backup" "redis_backup"
        return 1
    fi
    
    # Encrypt backup
    openssl enc -aes-256-cbc -salt -in "${backup_file}" \
            -out "${backup_file}.enc" -pass "pass:${ENCRYPTION_KEY}" \
            || return 1
    
    # Upload to Azure
    az storage blob upload \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${BACKUP_CONTAINER}" \
        --name "redis/${TIMESTAMP}/dump.rdb.gz.enc" \
        --file "${backup_file}.enc" \
        --metadata "timestamp=${TIMESTAMP}" \
        || return 1
    
    info "Redis backup completed successfully"
    return 0
}

# File storage backup function
backup_file_storage() {
    local backup_file="${BACKUP_ROOT}/files/storage_${TIMESTAMP}.tar.gz"
    
    info "Starting file storage backup"
    
    # Create incremental backup with deduplication
    tar --create \
        --gzip \
        --preserve-permissions \
        --checkpoint=1000 \
        --checkpoint-action=echo="%T" \
        --file="${backup_file}" \
        /var/lib/taskmanager/files/ \
        || return 1
    
    # Encrypt backup
    openssl enc -aes-256-cbc -salt -in "${backup_file}" \
            -out "${backup_file}.enc" -pass "pass:${ENCRYPTION_KEY}" \
            || return 1
    
    # Upload to Azure with block optimization
    az storage blob upload \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${BACKUP_CONTAINER}" \
        --name "files/${TIMESTAMP}/storage.tar.gz.enc" \
        --file "${backup_file}.enc" \
        --metadata "timestamp=${TIMESTAMP}" \
        --type block \
        --tier Hot \
        || return 1
    
    info "File storage backup completed successfully"
    return 0
}

# Cleanup old backups
cleanup_old_backups() {
    local backup_type="$1"
    local retention_days=30
    
    info "Starting cleanup of old ${backup_type} backups"
    
    # List old backups
    az storage blob list \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${BACKUP_CONTAINER}" \
        --prefix "${backup_type}/" \
        --query "[?properties.creationTime < '$(date -d "-${retention_days} days" -u +%Y-%m-%dT%H:%M:%SZ)'].[name]" \
        --output tsv | while read -r blob; do
        
        # Delete old backup
        az storage blob delete \
            --account-name "${AZURE_STORAGE_ACCOUNT}" \
            --account-key "${AZURE_STORAGE_KEY}" \
            --container-name "${BACKUP_CONTAINER}" \
            --name "${blob}" \
            || warn "Failed to delete old backup: ${blob}"
    done
    
    info "Cleanup completed successfully"
    return 0
}

# Main execution
main() {
    info "Starting backup process"
    
    # Acquire lock
    if ! mkdir "${LOCK_FILE}" 2>/dev/null; then
        error "Another backup process is running"
        exit 1
    fi
    
    # Setup environment
    if ! setup_environment; then
        handle_error "Environment setup failed" "setup"
        exit 1
    fi
    
    # Execute backups
    backup_database "full" || handle_error "Database backup failed" "database"
    backup_redis || handle_error "Redis backup failed" "redis"
    backup_file_storage || handle_error "File storage backup failed" "files"
    
    # Cleanup old backups
    cleanup_old_backups "db" || warn "Database cleanup failed"
    cleanup_old_backups "redis" || warn "Redis cleanup failed"
    cleanup_old_backups "files" || warn "Files cleanup failed"
    
    # Remove lock
    rm -rf "${LOCK_FILE}"
    
    info "Backup process completed successfully"
    return 0
}

# Execute main function
main "$@"