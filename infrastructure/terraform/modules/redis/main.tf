# Provider versions
# azurerm ~> 3.0
# random ~> 3.0

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

# Generate random suffix for Redis resource names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Azure Cache for Redis instance
resource "azurerm_redis_cache" "redis_cache" {
  name                = "${var.name_prefix}-redis-${var.environment}-${random_string.suffix.result}"
  location            = var.location
  resource_group_name = var.resource_group_name
  
  # Premium tier configuration for production workloads
  sku_name            = var.redis_config.sku_name
  family              = var.redis_config.family
  capacity            = var.redis_config.capacity
  
  # Enable clustering for horizontal scaling
  shard_count         = var.redis_config.shard_count
  
  # High availability configuration
  zones               = ["1", "2", "3"]
  
  # Security configuration
  enable_non_ssl_port = var.redis_config.enable_non_ssl_port
  minimum_tls_version = var.redis_config.minimum_tls_version
  
  # Network security
  public_network_access_enabled = false
  
  # Redis version
  redis_version = "7.0"

  # Redis configuration
  redis_configuration {
    # Memory management
    maxmemory_policy              = var.redis_config.maxmemory_policy
    maxmemory_reserved           = 50
    maxfragmentationmemory_reserved = 50
    maxmemory_delta             = 50

    # Event notifications
    notify_keyspace_events       = "KEA"

    # Security
    enable_authentication        = var.redis_config.enable_authentication

    # Persistence configuration
    aof_backup_enabled          = true
    rdb_backup_enabled          = true
    rdb_backup_frequency        = 60
    rdb_backup_max_snapshot_count = 1
  }

  # Patch schedule for maintenance
  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
    maintenance_window = "PT5H"
  }

  # Private network configuration
  dynamic "private_endpoint" {
    for_each = var.network_config.private_endpoint_enabled ? [1] : []
    content {
      subnet_id = var.network_config.subnet_id
    }
  }

  # Resource tags
  tags = merge(var.tags, {
    Environment = var.environment
    Service     = "Redis Cache"
    CriticalityLevel = "High"
  })

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      tags["CreatedDate"],
      redis_configuration["rdb_backup_max_snapshot_count"]
    ]
  }
}

# Network security rules
resource "azurerm_redis_firewall_rule" "vnet_rule" {
  count               = var.network_config.private_endpoint_enabled ? 1 : 0
  name                = "AllowVNet"
  redis_cache_name    = azurerm_redis_cache.redis_cache.name
  resource_group_name = var.resource_group_name
  start_ip           = cidrhost(data.azurerm_subnet.cache_subnet[0].address_prefix, 0)
  end_ip             = cidrhost(data.azurerm_subnet.cache_subnet[0].address_prefix, -1)
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "redis_diagnostics" {
  count                      = var.monitoring_config.diagnostic_settings_enabled ? 1 : 0
  name                       = "${var.name_prefix}-redis-diag-${var.environment}"
  target_resource_id         = azurerm_redis_cache.redis_cache.id
  log_analytics_workspace_id = var.monitoring_config.log_analytics_workspace_id

  log {
    category = "ConnectedClientList"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.monitoring_config.metrics_retention_days
    }
  }

  log {
    category = "RedisPatches"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.monitoring_config.metrics_retention_days
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = var.monitoring_config.metrics_retention_days
    }
  }
}

# Monitoring alerts
resource "azurerm_monitor_metric_alert" "redis_alerts" {
  for_each            = var.monitoring_config.diagnostic_settings_enabled ? {
    cpu = {
      metric_name = "ProcessorTime"
      threshold   = var.monitoring_config.alert_thresholds.cpu_threshold
    }
    memory = {
      metric_name = "UsedMemoryPercentage"
      threshold   = var.monitoring_config.alert_thresholds.memory_threshold
    }
    clients = {
      metric_name = "ConnectedClients"
      threshold   = var.monitoring_config.alert_thresholds.connected_clients_threshold
    }
  } : {}

  name                = "${var.name_prefix}-redis-${each.key}-alert-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes             = [azurerm_redis_cache.redis_cache.id]
  description        = "Alert for Redis Cache ${each.key} metric"
  severity           = 2
  window_size        = "PT5M"
  frequency          = "PT1M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = each.value.metric_name
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = each.value.threshold
  }
}

# Outputs for other modules
output "redis_cache_id" {
  value       = azurerm_redis_cache.redis_cache.id
  description = "The ID of the Redis Cache"
}

output "redis_cache_hostname" {
  value       = azurerm_redis_cache.redis_cache.hostname
  description = "The hostname of the Redis Cache"
}

output "redis_cache_ssl_port" {
  value       = azurerm_redis_cache.redis_cache.ssl_port
  description = "The SSL port of the Redis Cache"
}

output "redis_cache_connection_string" {
  value       = azurerm_redis_cache.redis_cache.primary_connection_string
  description = "The primary connection string of the Redis Cache"
  sensitive   = true
}

output "redis_cache_primary_key" {
  value       = azurerm_redis_cache.redis_cache.primary_access_key
  description = "The primary access key for the Redis Cache"
  sensitive   = true
}