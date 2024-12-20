# Provider configuration
# Azure RM Provider version ~> 3.0
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  resource_prefix = "${var.environment}-${var.database_name}"
  default_tags = {
    Environment      = var.environment
    Project         = "Task Management System"
    ManagedBy       = "Terraform"
    Component       = "Database"
    SecurityLevel   = "High"
    BackupEnabled   = "True"
    HighAvailability = "True"
    CreatedDate     = timestamp()
  }
}

# Generate secure random admin credentials
resource "random_string" "admin_username" {
  length  = 16
  special = false
  upper   = false
  numeric = false
}

resource "random_password" "admin_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "postgresql_server" {
  name                = "${local.resource_prefix}-psql"
  resource_group_name = var.resource_group_name
  location            = var.location
  version            = var.postgresql_version
  
  # Network Configuration
  delegated_subnet_id = var.subnet_id
  private_dns_zone_id = var.private_dns_zone_id
  
  # Authentication
  administrator_login    = random_string.admin_username.result
  administrator_password = random_password.admin_password.result
  
  # High Availability Configuration
  zone                = "1"
  storage_mb          = var.storage_mb
  sku_name           = var.sku_name
  
  # Backup Configuration
  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled
  
  # High Availability
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }
  
  # Maintenance Window
  maintenance_window {
    day_of_week  = var.maintenance_window.day_of_week
    start_hour   = var.maintenance_window.start_hour
    start_minute = var.maintenance_window.start_minute
  }
  
  # Authentication Configuration
  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
  }
  
  # Advanced Threat Protection
  threat_detection_policy {
    enabled                    = var.enable_threat_detection
    disabled_alerts           = []
    email_account_admins      = true
    email_addresses           = []
    retention_days            = 30
    storage_account_access_key = null # Managed by Azure
    storage_endpoint          = null # Managed by Azure
  }
  
  tags = merge(local.default_tags, var.tags)

  lifecycle {
    prevent_destroy = true # Prevent accidental deletion
  }
}

# Database Creation
resource "azurerm_postgresql_flexible_server_database" "postgresql_database" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.postgresql_server.id
  charset   = "UTF8"
  collation = "en_US.UTF8"

  lifecycle {
    prevent_destroy = true
  }
}

# PostgreSQL Configuration
resource "azurerm_postgresql_flexible_server_configuration" "postgresql_configurations" {
  for_each = {
    # Performance Optimization
    "max_connections"               = "1000"
    "shared_buffers"               = "256MB"
    "work_mem"                     = "16MB"
    "maintenance_work_mem"         = "256MB"
    "effective_cache_size"         = "1GB"
    "autovacuum"                   = "on"
    
    # Security Settings
    "ssl_min_protocol_version"     = "TLSv1.2"
    "log_connections"              = "on"
    "log_disconnections"           = "on"
    "log_checkpoints"              = "on"
    "connection_throttling"        = "on"
    
    # Extensions
    "azure.extensions"             = "CITEXT,HSTORE,UUID-OSSP"
    
    # Connection Pooling
    "connection_pooling.mode"      = "transaction"
    
    # Query Performance
    "random_page_cost"            = "1.1"
    "effective_io_concurrency"    = "200"
  }

  server_id = azurerm_postgresql_flexible_server.postgresql_server.id
  name      = each.key
  value     = each.value
}

# Firewall Rules for allowed IP ranges
resource "azurerm_postgresql_flexible_server_firewall_rule" "allowed_ips" {
  for_each         = { for rule in var.allowed_ip_ranges : rule.name => rule }
  
  name             = each.value.name
  server_id        = azurerm_postgresql_flexible_server.postgresql_server.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}

# Outputs
output "server_id" {
  description = "ID of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.postgresql_server.id
}

output "server_fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.postgresql_server.fqdn
}

output "database_name" {
  description = "Name of the created database"
  value       = azurerm_postgresql_flexible_server_database.postgresql_database.name
}

output "connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${azurerm_postgresql_flexible_server.postgresql_server.administrator_login}@${azurerm_postgresql_flexible_server.postgresql_server.fqdn}:5432/${azurerm_postgresql_flexible_server_database.postgresql_database.name}"
  sensitive   = true
}

output "admin_username" {
  description = "Database administrator username"
  value       = azurerm_postgresql_flexible_server.postgresql_server.administrator_login
  sensitive   = true
}

output "admin_password" {
  description = "Database administrator password"
  value       = azurerm_postgresql_flexible_server.postgresql_server.administrator_password
  sensitive   = true
}