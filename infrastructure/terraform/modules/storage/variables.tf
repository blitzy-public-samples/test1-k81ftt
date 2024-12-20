# Storage Account Configuration
variable "storage_account_name" {
  type        = string
  description = "Name of the Azure Storage Account - must be globally unique and comply with Azure naming rules"

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "Storage account name must be between 3 and 24 characters long and can only contain lowercase letters and numbers"
  }
}

variable "resource_group_name" {
  type        = string
  description = "Name of the existing resource group where storage resources will be created"
}

variable "location" {
  type        = string
  description = "Azure region where storage resources will be deployed - should align with application deployment region"
  default     = "eastus2"
}

# Storage Replication and Security Configuration
variable "replication_type" {
  type        = string
  description = "Type of replication for the storage account - GRS recommended for enterprise production workloads"
  default     = "GRS"

  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS"], var.replication_type)
    error_message = "Replication type must be one of: LRS (Locally Redundant), GRS (Geo-Redundant), RAGRS (Read-Access Geo-Redundant), ZRS (Zone Redundant)"
  }
}

variable "min_tls_version" {
  type        = string
  description = "Minimum TLS version required for secure data transmission - TLS1_2 recommended for security compliance"
  default     = "TLS1_2"

  validation {
    condition     = contains(["TLS1_2"], var.min_tls_version)
    error_message = "Only TLS 1.2 is allowed for security compliance"
  }
}

variable "enable_versioning" {
  type        = bool
  description = "Enable blob versioning for the storage account to maintain file version history"
  default     = true
}

# Container Configuration
variable "containers" {
  type = map(object({
    name        = string
    access_type = string
    purpose     = string
  }))
  description = "Map of storage containers with their access types and purposes"
  default = {
    attachments = {
      name        = "attachments"
      access_type = "private"
      purpose     = "Task and project file attachments"
    }
    backups = {
      name        = "backups"
      access_type = "private"
      purpose     = "System backup storage"
    }
    archives = {
      name        = "archives"
      access_type = "private"
      purpose     = "Long-term storage for completed tasks and projects"
    }
  }
}

# Lifecycle Management Configuration
variable "lifecycle_rules" {
  type = map(object({
    enabled                 = bool
    days_after_modification = number
    target_tier            = string
    compression_enabled    = bool
  }))
  description = "Lifecycle management rules for automated data management"
  default = {
    archive_completed_tasks = {
      enabled                 = true
      days_after_modification = 30
      target_tier            = "Archive"
      compression_enabled    = true
    }
    archive_inactive_projects = {
      enabled                 = true
      days_after_modification = 365
      target_tier            = "Archive"
      compression_enabled    = true
    }
    delete_old_backups = {
      enabled                 = true
      days_after_modification = 90
      target_tier            = "Delete"
      compression_enabled    = false
    }
  }
}

# CDN Configuration
variable "enable_cdn" {
  type        = bool
  description = "Enable Azure CDN for optimized content delivery"
  default     = true
}

variable "cdn_sku" {
  type        = string
  description = "SKU for the CDN profile - determines features and pricing tier"
  default     = "Standard_Microsoft"

  validation {
    condition     = contains(["Standard_Microsoft", "Premium_Verizon"], var.cdn_sku)
    error_message = "CDN SKU must be either Standard_Microsoft or Premium_Verizon for enterprise requirements"
  }
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all storage resources for organization and cost tracking"
  default = {
    Component   = "Storage"
    ManagedBy   = "Terraform"
    Environment = "Production"
    Project     = "TaskManagementSystem"
  }
}