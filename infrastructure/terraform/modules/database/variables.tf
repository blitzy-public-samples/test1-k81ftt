# Resource Group Configuration
variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where database resources will be created. Must follow Azure naming conventions and include environment identifier"
  
  validation {
    condition     = length(var.resource_group_name) > 0 && length(var.resource_group_name) <= 90 && can(regex("^[a-zA-Z0-9-_()]+$", var.resource_group_name))
    error_message = "Resource group name must be 1-90 characters and contain only alphanumeric, hyphens, underscores, and parentheses"
  }
}

variable "location" {
  type        = string
  description = "Azure region where database resources will be deployed. Must be a region that supports all required features including geo-replication and zone redundancy"
  
  validation {
    condition     = can(regex("^[a-z]+[a-z0-9]+$", var.location)) && contains(["eastus", "westus2", "northeurope", "westeurope"], var.location)
    error_message = "Location must be a supported Azure region with full feature availability"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod) determining security, redundancy, and performance configurations"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Database Configuration
variable "database_name" {
  type        = string
  description = "Name of the PostgreSQL database. Must follow naming conventions and include environment prefix"
  default     = "taskdb"
  
  validation {
    condition     = can(regex("^[a-z][a-z0-9_]*$", var.database_name)) && length(var.database_name) >= 3 && length(var.database_name) <= 63
    error_message = "Database name must be 3-63 characters, start with a letter, and contain only lowercase letters, numbers, and underscores"
  }
}

variable "postgresql_version" {
  type        = string
  description = "PostgreSQL version to deploy. Must be 14.0 or higher for required features"
  default     = "14"
  
  validation {
    condition     = can(regex("^(14|15|16)$", var.postgresql_version))
    error_message = "PostgreSQL version must be 14 or higher"
  }
}

# Performance Configuration
variable "sku_name" {
  type        = string
  description = "SKU name for the PostgreSQL Flexible Server with environment-specific performance tiers"
  default     = "GP_Standard_D4s_v3"
  
  validation {
    condition     = can(regex("^(GP|MO)_.*$", var.sku_name)) && (var.environment == "prod" ? can(regex("^MO_.*$", var.sku_name)) : true)
    error_message = "SKU must be Memory Optimized (MO) for production and can be General Purpose (GP) for non-production"
  }
}

variable "storage_mb" {
  type        = number
  description = "Storage size in megabytes with environment-specific minimums"
  default     = 32768
  
  validation {
    condition     = var.storage_mb >= 32768 && var.storage_mb <= 65536000 && (var.environment == "prod" ? var.storage_mb >= 65536 : true)
    error_message = "Storage must be between 32GB and 64TB, with minimum 64GB for production"
  }
}

# High Availability and Backup Configuration
variable "backup_retention_days" {
  type        = number
  description = "Backup retention period in days with environment-specific minimums"
  default     = 30
  
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35 && (var.environment == "prod" ? var.backup_retention_days >= 30 : true)
    error_message = "Backup retention must be 7-35 days, with minimum 30 days for production"
  }
}

variable "geo_redundant_backup_enabled" {
  type        = bool
  description = "Enable geo-redundant backups for disaster recovery"
  default     = true
}

variable "high_availability_enabled" {
  type        = bool
  description = "Enable high availability with zone redundancy"
  default     = true
}

# Network Security Configuration
variable "allowed_ip_ranges" {
  type = list(object({
    name     = string
    start_ip = string
    end_ip   = string
  }))
  description = "List of IP ranges allowed to access the database with strict validation"
  default     = []
  
  validation {
    condition     = alltrue([for r in var.allowed_ip_ranges : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}$", r.start_ip)) && can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}$", r.end_ip)) && tonumber(split(".", r.start_ip)[0]) < 224])
    error_message = "IP addresses must be valid IPv4 addresses and not in multicast range"
  }
}

variable "subnet_id" {
  type        = string
  description = "ID of the subnet where the database will be deployed with private endpoint"
  
  validation {
    condition     = length(var.subnet_id) > 0 && can(regex("^/subscriptions/[^/]+/resourceGroups/[^/]+/providers/Microsoft.Network/virtualNetworks/[^/]+/subnets/[^/]+$", var.subnet_id))
    error_message = "Subnet ID must be a valid Azure resource ID"
  }
}

variable "private_dns_zone_id" {
  type        = string
  description = "ID of the private DNS zone for database private endpoint resolution"
  
  validation {
    condition     = length(var.private_dns_zone_id) > 0 && can(regex("^/subscriptions/[^/]+/resourceGroups/[^/]+/providers/Microsoft.Network/privateDnsZones/[^/]+$", var.private_dns_zone_id))
    error_message = "Private DNS zone ID must be a valid Azure resource ID"
  }
}

# Security and Monitoring Configuration
variable "enable_threat_detection" {
  type        = bool
  description = "Enable advanced threat detection and security alerts"
  default     = true
}

variable "maintenance_window" {
  type = object({
    day_of_week  = number
    start_hour   = number
    start_minute = number
  })
  description = "Scheduled maintenance window configuration"
  default = {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }
  
  validation {
    condition     = var.maintenance_window.day_of_week >= 0 && var.maintenance_window.day_of_week <= 6 && var.maintenance_window.start_hour >= 0 && var.maintenance_window.start_hour <= 23 && var.maintenance_window.start_minute >= 0 && var.maintenance_window.start_minute <= 59
    error_message = "Invalid maintenance window configuration"
  }
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Tags to apply to database resources including mandatory tags for compliance"
  default     = {}
}