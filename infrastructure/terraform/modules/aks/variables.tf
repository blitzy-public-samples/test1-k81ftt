# Azure Kubernetes Service (AKS) Cluster Name
variable "cluster_name" {
  type        = string
  description = "Name of the AKS cluster"
  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.cluster_name))
    error_message = "Cluster name can only contain lowercase letters, numbers, and hyphens"
  }
}

# Resource Group Name
variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where AKS cluster will be deployed"
}

# Azure Region
variable "location" {
  type        = string
  description = "Azure region where AKS cluster will be deployed"
}

# Kubernetes Version
variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the AKS cluster"
  validation {
    condition     = can(regex("^\\d+\\.\\d+\\.\\d+$", var.kubernetes_version))
    error_message = "Kubernetes version must be in format X.Y.Z"
  }
}

# Default Node Pool Configuration
variable "default_node_pool" {
  type = object({
    name                = string
    vm_size            = string
    node_count         = number
    availability_zones = list(string)
    enable_auto_scaling = bool
    min_count          = number
    max_count          = number
    max_pods           = number
    os_disk_size_gb    = number
    type               = string
    vnet_subnet_id     = string
  })
  description = "Configuration for the default system node pool"
  default = {
    name                = "system"
    vm_size            = "Standard_D4s_v3"
    node_count         = 3
    availability_zones = ["1", "2", "3"]
    enable_auto_scaling = true
    min_count          = 3
    max_count          = 5
    max_pods           = 50
    os_disk_size_gb    = 128
    type               = "VirtualMachineScaleSets"
    vnet_subnet_id     = null
  }
}

# Additional Node Pools Configuration
variable "additional_node_pools" {
  type = map(object({
    vm_size            = string
    node_count         = number
    availability_zones = list(string)
    enable_auto_scaling = bool
    min_count          = number
    max_count          = number
    max_pods           = number
    os_disk_size_gb    = number
    node_taints        = list(string)
    vnet_subnet_id     = string
  }))
  description = "Configuration for additional node pools"
  default     = {}
}

# Network Profile Configuration
variable "network_profile" {
  type = object({
    network_plugin      = string
    network_policy     = string
    dns_service_ip     = string
    docker_bridge_cidr = string
    service_cidr       = string
    load_balancer_sku  = string
  })
  description = "Network configuration for the AKS cluster"
  default = {
    network_plugin      = "azure"
    network_policy     = "calico"
    dns_service_ip     = "10.0.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
    service_cidr       = "10.0.0.0/16"
    load_balancer_sku  = "standard"
  }
}

# RBAC and Azure AD Configuration
variable "rbac_config" {
  type = object({
    enabled                  = bool
    admin_group_object_ids  = list(string)
    azure_rbac_enabled      = bool
    managed                 = bool
  })
  description = "RBAC and Azure AD integration configuration"
  default = {
    enabled                 = true
    admin_group_object_ids = []
    azure_rbac_enabled     = true
    managed                = true
  }
}

# Monitoring Configuration
variable "monitoring_config" {
  type = object({
    log_analytics_workspace_enabled = bool
    retention_in_days              = number
    enable_http_application_routing = bool
  })
  description = "Monitoring and diagnostics configuration"
  default = {
    log_analytics_workspace_enabled = true
    retention_in_days              = 30
    enable_http_application_routing = false
  }
}

# Resource Tags
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources in the AKS cluster"
  default     = {}
}