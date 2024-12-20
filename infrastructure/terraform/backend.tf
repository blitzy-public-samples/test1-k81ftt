# Azure Storage Account Backend Configuration for Terraform State Management
# Version: azurerm ~> 3.0
# Purpose: Secure and scalable state management with enhanced security features

terraform {
  backend "azurerm" {
    # Resource identifiers derived from variables
    resource_group_name  = "${var.project}-${var.environment}-tfstate-rg"
    storage_account_name = "${var.project}${var.environment}tfstate"
    container_name      = "tfstate"
    key                 = "terraform.tfstate"

    # Enhanced security configuration
    use_oidc                  = true
    subscription_id           = var.subscription_id
    tenant_id                = var.tenant_id
    min_tls_version          = "TLS1_2"
    enable_https_traffic_only = true

    # Advanced features for state management
    use_azuread_auth         = true
    snapshot_enabled         = true
    # Implements versioning for state file history
    versioning_enabled       = true
    
    # State locking configuration using Azure Blob lease
    lease_duration           = "60"
    lease_interval          = "15"

    # Network security settings
    allowed_ip_ranges       = []  # Empty list enforces private endpoints only
    virtual_network_enabled = true

    # Encryption configuration
    encryption_scope        = "CustomerManaged"
    infrastructure_encryption_enabled = true

    # Monitoring and diagnostics
    enable_diagnostic_settings = true
    diagnostic_settings_retention_days = 365
  }
}

# Local backend configuration for development environments
# This block is conditionally included based on workspace
locals {
  is_dev_workspace = terraform.workspace == "dev"
}

# Development environment can optionally use local backend
terraform {
  backend "local" {
    count = local.is_dev_workspace ? 1 : 0
    path  = "terraform.tfstate"
  }
}

# Backend configuration validation
check "backend_security" {
  assert {
    condition     = var.environment != "prod" || terraform.backend.azurerm.use_oidc == true
    error_message = "Production environment must use OIDC authentication for backend access."
  }

  assert {
    condition     = terraform.backend.azurerm.min_tls_version == "TLS1_2"
    error_message = "TLS version must be 1.2 or higher for security compliance."
  }

  assert {
    condition     = terraform.backend.azurerm.infrastructure_encryption_enabled == true
    error_message = "Infrastructure encryption must be enabled for state storage."
  }
}

# Lifecycle management for backend resources
lifecycle {
  prevent_destroy = true

  ignore_changes = [
    # Prevent accidental modifications to critical backend settings
    backend.azurerm.encryption_scope,
    backend.azurerm.infrastructure_encryption_enabled,
    backend.azurerm.min_tls_version
  ]
}

# Tags for backend resources
locals {
  backend_tags = {
    Environment     = var.environment
    Project        = var.project
    ManagedBy      = "Terraform"
    SecurityLevel  = "Critical"
    DataClass      = "Confidential"
    BackupRequired = "True"
  }
}