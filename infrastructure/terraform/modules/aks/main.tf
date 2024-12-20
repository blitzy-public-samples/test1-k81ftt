# Provider configuration
# azurerm provider version ~> 3.0
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

# Configure Azure RM Provider with enhanced security features
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    virtual_machine {
      delete_os_disk_on_deletion = true
      graceful_shutdown = true
    }
  }
}

# Local variables for resource naming and tagging
locals {
  cluster_name = "${var.cluster_name}-${terraform.workspace}"
  common_tags = merge(var.tags, {
    Environment = terraform.workspace
    ManagedBy   = "Terraform"
    Project     = "TaskManagementSystem"
    LastUpdated = formatdate("YYYY-MM-DD", timestamp())
  })
}

# Random ID for unique resource naming
resource "random_id" "cluster_suffix" {
  byte_length = 4
}

# Main AKS Cluster Resource
resource "azurerm_kubernetes_cluster" "main" {
  name                = local.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  kubernetes_version  = var.kubernetes_version
  dns_prefix         = "${local.cluster_name}-${random_id.cluster_suffix.hex}"
  sku_tier           = "Standard"

  # Default node pool configuration
  default_node_pool {
    name                = var.default_node_pool.name
    vm_size            = var.default_node_pool.vm_size
    node_count         = var.default_node_pool.node_count
    availability_zones = var.default_node_pool.availability_zones
    enable_auto_scaling = var.default_node_pool.enable_auto_scaling
    min_count          = var.default_node_pool.min_count
    max_count          = var.default_node_pool.max_count
    max_pods           = var.default_node_pool.max_pods
    os_disk_size_gb    = var.default_node_pool.os_disk_size_gb
    type               = var.default_node_pool.type
    vnet_subnet_id     = var.default_node_pool.vnet_subnet_id
    
    # Enhanced security settings
    enable_host_encryption = true
    enable_node_public_ip = false
    
    # Node pool tags
    tags = local.common_tags
  }

  # Managed Identity Configuration
  identity {
    type = "SystemAssigned"
  }

  # Network Profile
  network_profile {
    network_plugin     = var.network_profile.network_plugin
    network_policy    = var.network_profile.network_policy
    dns_service_ip    = var.network_profile.dns_service_ip
    docker_bridge_cidr = var.network_profile.docker_bridge_cidr
    service_cidr      = var.network_profile.service_cidr
    load_balancer_sku = var.network_profile.load_balancer_sku
    
    # Enhanced network security
    outbound_type = "loadBalancer"
  }

  # Azure AD RBAC Configuration
  azure_active_directory_role_based_access_control {
    managed                = var.rbac_config.managed
    admin_group_object_ids = var.rbac_config.admin_group_object_ids
    azure_rbac_enabled    = var.rbac_config.azure_rbac_enabled
  }

  # Monitoring Configuration
  oms_agent {
    log_analytics_workspace_id = var.monitoring_config.log_analytics_workspace_enabled ? azurerm_log_analytics_workspace.aks[0].id : null
  }

  # Key Vault Integration
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # API Server Security
  api_server_access_profile {
    authorized_ip_ranges = ["0.0.0.0/0"] # Should be restricted in production
    enable_private_cluster = true
  }

  # Auto-scaler Profile
  auto_scaler_profile {
    balance_similar_node_groups = true
    expander                   = "random"
    max_graceful_termination_sec = "600"
    max_node_provisioning_time   = "15m"
    max_unready_nodes            = 3
    max_unready_percentage       = 45
    new_pod_scale_up_delay      = "10s"
    scale_down_delay_after_add  = "10m"
    scale_down_delay_after_delete = "10s"
    scale_down_delay_after_failure = "3m"
    scan_interval                = "10s"
    utilization_threshold        = "0.5"
  }

  # Maintenance Window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [21, 22, 23]
    }
  }

  tags = local.common_tags
}

# Additional Node Pools
resource "azurerm_kubernetes_cluster_node_pool" "additional" {
  for_each = var.additional_node_pools

  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  name                  = each.key
  vm_size              = each.value.vm_size
  node_count           = each.value.node_count
  availability_zones   = each.value.availability_zones
  enable_auto_scaling  = each.value.enable_auto_scaling
  min_count           = each.value.min_count
  max_count           = each.value.max_count
  max_pods            = each.value.max_pods
  os_disk_size_gb     = each.value.os_disk_size_gb
  
  # Enhanced security settings
  enable_host_encryption = true
  enable_node_public_ip  = false
  
  # Node taints and labels
  node_taints = each.value.node_taints
  node_labels = {
    "pool" = each.key
    "environment" = terraform.workspace
  }

  vnet_subnet_id = each.value.vnet_subnet_id
  tags           = local.common_tags
}

# Log Analytics Workspace for monitoring
resource "azurerm_log_analytics_workspace" "aks" {
  count = var.monitoring_config.log_analytics_workspace_enabled ? 1 : 0

  name                = "${local.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                = "PerGB2018"
  retention_in_days   = var.monitoring_config.retention_in_days

  tags = local.common_tags
}

# Outputs
output "cluster_id" {
  value = azurerm_kubernetes_cluster.main.id
  description = "The ID of the AKS cluster"
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
  description = "The name of the AKS cluster"
}

output "kube_config" {
  value = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
  description = "Raw Kubernetes config for connecting to the cluster"
}

output "cluster_identity" {
  value = azurerm_kubernetes_cluster.main.identity
  description = "The identity of the AKS cluster"
}

output "resource_group_name" {
  value = var.resource_group_name
  description = "The name of the resource group containing the AKS cluster"
}