# Redis resource name prefix
variable "name_prefix" {
  type        = string
  description = "Prefix for Redis resource names"
  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.name_prefix))
    error_message = "Name prefix can only contain lowercase letters, numbers, and hyphens"
  }
}

# Deployment environment
variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Azure region
variable "location" {
  type        = string
  description = "Azure region for Redis deployment"
}

# Resource group
variable "resource_group_name" {
  type        = string
  description = "Name of the resource group for Redis deployment"
}

# Redis configuration settings
variable "redis_config" {
  type = object({
    sku_name             = string
    family              = string
    capacity            = number
    shard_count         = number
    maxmemory_policy    = string
    enable_non_ssl_port = bool
    minimum_tls_version = string
    enable_authentication = bool
  })
  description = "Redis cache configuration settings"

  validation {
    condition     = var.environment == "prod" ? var.redis_config.sku_name == "Premium" : true
    error_message = "Production environment requires Premium SKU"
  }

  validation {
    condition     = var.redis_config.capacity >= 1 && var.redis_config.capacity <= 4
    error_message = "Capacity must be between 1 and 4"
  }

  validation {
    condition     = var.redis_config.shard_count >= 1 && var.redis_config.shard_count <= 10
    error_message = "Shard count must be between 1 and 10"
  }

  validation {
    condition     = contains(["volatile-lru", "allkeys-lru", "volatile-random", "allkeys-random", "volatile-ttl", "noeviction"], var.redis_config.maxmemory_policy)
    error_message = "Invalid maxmemory policy specified"
  }

  default = {
    sku_name             = "Premium"
    family              = "P"
    capacity            = 1
    shard_count         = 3
    maxmemory_policy    = "volatile-lru"
    enable_non_ssl_port = false
    minimum_tls_version = "1.2"
    enable_authentication = true
  }
}

# Network configuration
variable "network_config" {
  type = object({
    subnet_id               = string
    private_endpoint_enabled = bool
  })
  description = "Network configuration for Redis"

  default = {
    subnet_id               = null
    private_endpoint_enabled = true
  }
}

# Monitoring configuration
variable "monitoring_config" {
  type = object({
    diagnostic_settings_enabled  = bool
    log_analytics_workspace_id  = string
    metrics_retention_days      = number
    alert_thresholds = object({
      cpu_threshold              = number
      memory_threshold           = number
      connected_clients_threshold = number
    })
  })
  description = "Monitoring configuration"

  default = {
    diagnostic_settings_enabled = true
    log_analytics_workspace_id = null
    metrics_retention_days     = 30
    alert_thresholds = {
      cpu_threshold              = 80
      memory_threshold           = 80
      connected_clients_threshold = 1000
    }
  }
}

# Resource tags
variable "tags" {
  type        = map(string)
  description = "Tags to apply to Redis resources"
  default = {
    Service     = "Cache"
    Component   = "Redis"
    Environment = "var.environment"
  }
}