# Project and Environment Configuration
variable "project" {
  type        = string
  description = "Name of the project used for resource naming and tagging"
  default     = "task-management"

  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.project)) && length(var.project) <= 24
    error_message = "Project name must be lowercase alphanumeric with hyphens, max 24 characters"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod) affecting resource configurations and security settings"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Regional Configuration
variable "regions" {
  type = object({
    primary   = string
    secondary = string
  })
  description = "Primary and secondary regions for high availability deployment"
  default = {
    primary   = "eastus2"
    secondary = "westus2"
  }
}

# Network Configuration
variable "network_config" {
  type = object({
    vnet_address_space = list(string)
    subnet_prefixes    = map(string)
    service_endpoints  = map(list(string))
    network_security_rules = map(object({
      priority                   = number
      direction                 = string
      access                    = string
      protocol                  = string
      source_port_range         = string
      destination_port_range    = string
      source_address_prefix     = string
      destination_address_prefix = string
    }))
    private_endpoints = map(bool)
  })
  description = "Enhanced network configuration with security zones and service isolation"
  default = {
    vnet_address_space = ["10.0.0.0/16"]
    subnet_prefixes = {
      aks               = "10.0.1.0/24"
      database          = "10.0.2.0/24"
      redis             = "10.0.3.0/24"
      private_endpoints = "10.0.4.0/24"
    }
    service_endpoints = {
      aks      = ["Microsoft.ContainerRegistry"]
      database = ["Microsoft.Sql"]
      redis    = ["Microsoft.Cache"]
    }
    network_security_rules = {
      allow_aks_api = {
        priority                   = 100
        direction                 = "Inbound"
        access                    = "Allow"
        protocol                  = "Tcp"
        source_port_range         = "*"
        destination_port_range    = "443"
        source_address_prefix     = "AzureCloud"
        destination_address_prefix = "VirtualNetwork"
      }
    }
    private_endpoints = {
      database = true
      redis    = true
      storage  = true
    }
  }
}

# AKS Configuration
variable "aks_config" {
  type = object({
    kubernetes_version = string
    default_node_pool = object({
      name                = string
      node_count         = number
      vm_size            = string
      availability_zones = list(string)
      max_pods          = number
      os_disk_size_gb   = number
      node_labels       = map(string)
      node_taints       = list(string)
    })
    additional_node_pools = map(object({
      node_count         = number
      vm_size            = string
      availability_zones = list(string)
      max_pods          = number
      node_labels       = map(string)
      node_taints       = list(string)
    }))
    network_profile = object({
      network_plugin     = string
      network_policy     = string
      service_cidr       = string
      dns_service_ip     = string
      outbound_type      = string
    })
    security_profile = object({
      enable_pod_security_policy = bool
      enable_azure_policy       = bool
      enable_secret_rotation    = bool
    })
    monitoring_config = object({
      log_analytics_workspace_enabled = bool
      metrics_enabled                = bool
      enable_node_logs              = bool
    })
    maintenance_window = object({
      allowed_days  = list(string)
      allowed_hours = list(number)
    })
  })
  description = "Enhanced AKS configuration with security and monitoring"
  default = {
    kubernetes_version = "1.26"
    default_node_pool = {
      name                = "system"
      node_count         = 3
      vm_size            = "Standard_D4s_v3"
      availability_zones = ["1", "2", "3"]
      max_pods          = 50
      os_disk_size_gb   = 128
      node_labels       = {
        "nodepool-type" = "system"
        "environment"   = "production"
      }
      node_taints       = []
    }
    additional_node_pools = {
      application = {
        node_count         = 3
        vm_size            = "Standard_D8s_v3"
        availability_zones = ["1", "2", "3"]
        max_pods          = 50
        node_labels       = {
          "nodepool-type" = "application"
        }
        node_taints       = []
      }
    }
    network_profile = {
      network_plugin     = "azure"
      network_policy     = "calico"
      service_cidr       = "172.16.0.0/16"
      dns_service_ip     = "172.16.0.10"
      outbound_type      = "userDefinedRouting"
    }
    security_profile = {
      enable_pod_security_policy = true
      enable_azure_policy       = true
      enable_secret_rotation    = true
    }
    monitoring_config = {
      log_analytics_workspace_enabled = true
      metrics_enabled                = true
      enable_node_logs              = true
    }
    maintenance_window = {
      allowed_days  = ["Saturday", "Sunday"]
      allowed_hours = [22, 23, 0, 1, 2, 3]
    }
  }
}

# Database Configuration
variable "database_config" {
  type = object({
    sku_name                      = string
    storage_mb                    = number
    backup_retention_days         = number
    geo_redundant_backup_enabled  = bool
    high_availability = object({
      mode                      = string
      standby_availability_zone = string
    })
    security_config = object({
      ssl_enforcement_enabled              = bool
      minimum_tls_version                  = string
      infrastructure_encryption_enabled     = bool
      public_network_access_enabled        = bool
      connection_throttling_enabled        = bool
    })
  })
  description = "Enhanced PostgreSQL configuration with HA and security"
  default = {
    sku_name                      = "GP_Standard_D4s_v3"
    storage_mb                    = 32768
    backup_retention_days         = 35
    geo_redundant_backup_enabled  = true
    high_availability = {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
    security_config = {
      ssl_enforcement_enabled              = true
      minimum_tls_version                  = "TLS1_2"
      infrastructure_encryption_enabled     = true
      public_network_access_enabled        = false
      connection_throttling_enabled        = true
    }
  }
}

# Monitoring Configuration
variable "monitoring_config" {
  type = object({
    log_analytics = object({
      retention_days  = number
      daily_quota_gb = number
      sku            = string
    })
    metrics = object({
      retention_days         = number
      enable_cluster_metrics = bool
      sampling_frequency     = string
    })
    alerts = object({
      enable_critical_alerts = bool
      action_group_email    = string
      severity_levels       = list(number)
    })
    security_center = object({
      enabled              = bool
      alert_notifications  = bool
      pricing_tier         = string
      assessed_resources   = list(string)
    })
  })
  description = "Enhanced monitoring and security logging configuration"
  default = {
    log_analytics = {
      retention_days  = 90
      daily_quota_gb = 10
      sku            = "PerGB2018"
    }
    metrics = {
      retention_days         = 90
      enable_cluster_metrics = true
      sampling_frequency     = "PT1M"
    }
    alerts = {
      enable_critical_alerts = true
      action_group_email    = "alerts@company.com"
      severity_levels       = [0, 1]
    }
    security_center = {
      enabled              = true
      alert_notifications  = true
      pricing_tier         = "Standard"
      assessed_resources   = ["AppService", "KeyVault", "SqlServers", "StorageAccounts", "VirtualMachines"]
    }
  }
}