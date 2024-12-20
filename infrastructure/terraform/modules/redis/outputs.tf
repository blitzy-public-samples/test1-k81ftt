# Redis Cache Resource ID
output "redis_id" {
  description = "The resource ID of the Redis cache instance for reference in other Azure resources and IAM configurations"
  value       = azurerm_redis_cache.redis_cache.id
  sensitive   = false
}

# Redis Cache Instance Name
output "redis_name" {
  description = "The name of the Redis cache instance for reference in application configurations and monitoring"
  value       = azurerm_redis_cache.redis_cache.name
  sensitive   = false
}

# Redis Cache Hostname
output "redis_hostname" {
  description = "The hostname of the Redis cache instance for client connection configuration"
  value       = azurerm_redis_cache.redis_cache.hostname
  sensitive   = false
}

# Redis Cache SSL Port
output "redis_ssl_port" {
  description = "The SSL port of the Redis cache instance for secure client connections"
  value       = azurerm_redis_cache.redis_cache.ssl_port
  sensitive   = false
}

# Redis Cache Connection String - Marked as sensitive to protect credentials
output "redis_connection_string" {
  description = "The primary connection string of the Redis cache instance containing authentication credentials - must be handled securely"
  value       = azurerm_redis_cache.redis_cache.primary_connection_string
  sensitive   = true
}

# Consolidated Redis outputs object for simplified module consumption
output "redis_outputs" {
  description = "Consolidated object containing all Redis cache outputs for simplified module consumption"
  value = {
    redis_id              = azurerm_redis_cache.redis_cache.id
    redis_name            = azurerm_redis_cache.redis_cache.name
    redis_hostname        = azurerm_redis_cache.redis_cache.hostname
    redis_ssl_port        = azurerm_redis_cache.redis_cache.ssl_port
    redis_connection_string = azurerm_redis_cache.redis_cache.primary_connection_string
  }
  sensitive = true # Marked as sensitive since it contains the connection string
}