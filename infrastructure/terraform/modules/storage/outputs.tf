# Storage Account Identification Outputs
output "storage_account_name" {
  description = "Name of the created Azure Storage Account for resource identification and access configuration"
  value       = azurerm_storage_account.main.name
}

output "storage_account_id" {
  description = "Resource ID of the created Azure Storage Account for RBAC and resource relationship management"
  value       = azurerm_storage_account.main.id
}

# Storage Access Configuration Outputs
output "primary_blob_endpoint" {
  description = "Primary blob endpoint URL for the storage account, used for direct blob access configuration"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "primary_access_key" {
  description = "Primary access key for secure storage account access, must be handled securely and rotated periodically"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true # Marked sensitive to prevent exposure in logs and outputs
}

# CDN Configuration Output
output "cdn_endpoint_fqdn" {
  description = "Fully qualified domain name of the CDN endpoint for content delivery optimization, null when CDN is disabled"
  value       = var.enable_cdn ? azurerm_cdn_endpoint.storage_cdn_endpoint[0].fqdn : null
}

# Container Management Outputs
output "container_names" {
  description = "Map of created storage container names for organized storage access and management"
  value       = {
    for container_key, container in azurerm_storage_container.containers :
    container_key => container.name
  }
}

# Storage Configuration Outputs
output "versioning_enabled" {
  description = "Indicates whether blob versioning is enabled for the storage account"
  value       = var.enable_versioning
}

output "replication_type" {
  description = "Configured replication type for the storage account"
  value       = var.replication_type
}

# Security Configuration Outputs
output "network_rule_default_action" {
  description = "Default network rule action for the storage account (Allow/Deny)"
  value       = azurerm_storage_account.main.network_rules[0].default_action
}

output "https_only" {
  description = "Confirms that HTTPS traffic only is enforced"
  value       = azurerm_storage_account.main.enable_https_traffic_only
}

# Lifecycle Management Output
output "lifecycle_rules" {
  description = "Map of configured lifecycle management rules for automated data management"
  value       = {
    for rule_key, rule in var.lifecycle_rules :
    rule_key => {
      enabled                 = rule.enabled
      days_after_modification = rule.days_after_modification
      target_tier            = rule.target_tier
    }
  }
}

# Resource Tags Output
output "storage_tags" {
  description = "Tags applied to the storage account for resource organization"
  value       = azurerm_storage_account.main.tags
}