# Azure Storage Account Configuration
# Provider version: hashicorp/azurerm ~> 3.0
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Primary Storage Account with enhanced security and compliance features
resource "azurerm_storage_account" "main" {
  name                          = var.storage_account_name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  account_tier                  = "Standard"
  account_replication_type      = var.replication_type
  enable_https_traffic_only     = true
  min_tls_version              = var.min_tls_version
  allow_nested_items_to_be_public = false

  # Advanced threat protection and security features
  identity {
    type = "SystemAssigned"
  }

  # Network security rules
  network_rules {
    default_action             = "Deny"
    ip_rules                   = var.allowed_ips
    virtual_network_subnet_ids = var.subnet_ids
    bypass                     = ["AzureServices"]
  }

  # Blob service properties with enhanced data protection
  blob_properties {
    versioning_enabled = var.enable_versioning
    change_feed_enabled = true
    
    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }

    # CORS configuration for web access
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "POST", "PUT"]
      allowed_origins    = var.allowed_origins
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  # Encryption configuration
  encryption_scopes {
    name = "default"
    source = "Microsoft.Storage"
  }

  tags = merge(var.tags, {
    Name = var.storage_account_name
  })
}

# Storage containers with specific access policies
resource "azurerm_storage_container" "containers" {
  for_each              = var.containers
  name                  = each.value.name
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = each.value.access_type

  depends_on = [azurerm_storage_account.main]
}

# Advanced lifecycle management policy
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      name    = "Rule-${rule.key}"
      enabled = rule.value.enabled
      filters {
        blob_types = ["blockBlob"]
        prefix_match = [rule.key]
      }
      actions {
        base_blob {
          tier_to_cool_after_days    = rule.value.target_tier == "Cool" ? rule.value.days_after_modification : null
          tier_to_archive_after_days = rule.value.target_tier == "Archive" ? rule.value.days_after_modification : null
          delete_after_days_since_modification_greater_than = rule.value.target_tier == "Delete" ? rule.value.days_after_modification : null
        }
        snapshot {
          delete_after_days = 30
        }
        version {
          delete_after_days = 90
        }
      }
    }
  }

  depends_on = [azurerm_storage_account.main]
}

# CDN Profile and Endpoint configuration if enabled
resource "azurerm_cdn_profile" "storage_cdn" {
  count               = var.enable_cdn ? 1 : 0
  name                = "${var.storage_account_name}-cdn"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.cdn_sku

  tags = var.tags
}

resource "azurerm_cdn_endpoint" "storage_cdn_endpoint" {
  count               = var.enable_cdn ? 1 : 0
  name                = "${var.storage_account_name}-cdn-endpoint"
  profile_name        = azurerm_cdn_profile.storage_cdn[0].name
  location            = var.location
  resource_group_name = var.resource_group_name

  origin {
    name       = "storage"
    host_name  = azurerm_storage_account.main.primary_blob_endpoint
  }

  optimization_type = "GeneralWebDelivery"

  # Security settings
  is_compression_enabled = true
  is_http_allowed       = false
  
  delivery_rule {
    name  = "EnforceHTTPS"
    order = 1

    request_scheme_condition {
      operator     = "Equal"
      match_values = ["HTTP"]
    }

    url_redirect_action {
      redirect_type = "Found"
      protocol      = "Https"
    }
  }

  tags = var.tags

  depends_on = [azurerm_cdn_profile.storage_cdn]
}

# Diagnostic settings for monitoring and compliance
resource "azurerm_monitor_diagnostic_setting" "storage_diagnostics" {
  name                       = "${var.storage_account_name}-diagnostics"
  target_resource_id         = azurerm_storage_account.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric {
    category = "Transaction"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  metric {
    category = "Capacity"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}