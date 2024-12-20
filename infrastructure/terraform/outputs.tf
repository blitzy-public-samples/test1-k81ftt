# Task Management System Infrastructure Outputs
# Version: 1.0.0
# This file defines the root-level outputs for the Task Management System infrastructure,
# exposing essential configuration values for application deployment and integration.

# Redis Cache Outputs
# Expose Redis connection details for session management and caching
output "redis_connection_string" {
  description = "Redis cache connection string for session management and caching - must be handled securely"
  value       = module.redis.redis_connection_string
  sensitive   = true
}

output "redis_host" {
  description = "Redis cache hostname for application configuration"
  value       = module.redis.redis_hostname
  sensitive   = false
}

output "redis_port" {
  description = "Redis cache SSL port for secure connections"
  value       = module.redis.redis_ssl_port
  sensitive   = false
}

# Database Outputs
# Expose PostgreSQL connection details for primary data storage
output "database_connection_string" {
  description = "PostgreSQL database connection string for primary data storage - must be handled securely"
  value       = module.database.connection_string
  sensitive   = true
}

output "database_host" {
  description = "PostgreSQL server hostname for application configuration"
  value       = module.database.server_fqdn
  sensitive   = false
}

# AKS Cluster Outputs
# Expose Kubernetes cluster details for container orchestration
output "aks_cluster_name" {
  description = "AKS cluster name for container orchestration configuration"
  value       = module.aks.cluster_name
  sensitive   = false
}

output "aks_resource_group" {
  description = "Resource group containing the AKS cluster"
  value       = module.aks.resource_group_name
  sensitive   = false
}

output "aks_kubernetes_version" {
  description = "Kubernetes version running on the AKS cluster"
  value       = module.aks.kubernetes_version
  sensitive   = false
}

# Storage Outputs
# Expose storage account details for file storage and CDN configuration
output "storage_account_name" {
  description = "Azure Storage account name for file storage configuration"
  value       = module.storage.storage_account_name
  sensitive   = false
}

output "storage_account_key" {
  description = "Primary access key for Azure Storage account - must be handled securely"
  value       = module.storage.primary_access_key
  sensitive   = true
}

output "storage_blob_endpoint" {
  description = "Primary blob storage endpoint for file access configuration"
  value       = module.storage.primary_blob_endpoint
  sensitive   = false
}

output "storage_cdn_endpoint" {
  description = "CDN endpoint FQDN for optimized content delivery"
  value       = module.storage.cdn_endpoint_fqdn
  sensitive   = false
}

# Consolidated Infrastructure Outputs
# Expose a consolidated object of all infrastructure configuration values
output "infrastructure_config" {
  description = "Consolidated infrastructure configuration values for application deployment"
  value = {
    redis = {
      host = module.redis.redis_hostname
      port = module.redis.redis_ssl_port
      ssl_enabled = true
    }
    database = {
      host = module.database.server_fqdn
      name = module.database.database_name
      ssl_enabled = true
    }
    storage = {
      account_name = module.storage.storage_account_name
      blob_endpoint = module.storage.primary_blob_endpoint
      cdn_endpoint = module.storage.cdn_endpoint_fqdn
      containers = module.storage.container_names
    }
    kubernetes = {
      cluster_name = module.aks.cluster_name
      resource_group = module.aks.resource_group_name
      version = module.aks.kubernetes_version
      node_resource_group = module.aks.node_resource_group
    }
  }
  sensitive = false
}

# Security and Compliance Outputs
# Expose security-related configuration values
output "security_config" {
  description = "Security-related configuration values for compliance and auditing"
  value = {
    storage_https_only = module.storage.https_only
    storage_min_tls_version = "TLS1_2"
    redis_ssl_enabled = true
    database_ssl_enabled = true
    network_rules = {
      storage_default_action = module.storage.network_rule_default_action
    }
  }
  sensitive = false
}

# Monitoring and Diagnostics Outputs
# Expose monitoring-related configuration values
output "monitoring_config" {
  description = "Monitoring and diagnostics configuration values"
  value = {
    storage_versioning_enabled = module.storage.versioning_enabled
    storage_lifecycle_rules = module.storage.lifecycle_rules
    replication_type = module.storage.replication_type
  }
  sensitive = false
}