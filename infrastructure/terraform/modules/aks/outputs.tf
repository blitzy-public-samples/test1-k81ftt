# Core cluster identification outputs
output "cluster_id" {
  description = "The unique identifier of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
  sensitive   = false
}

output "cluster_name" {
  description = "The name of the AKS cluster for reference in other resources"
  value       = azurerm_kubernetes_cluster.main.name
  sensitive   = false
}

output "resource_group_name" {
  description = "The name of the resource group containing the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.resource_group_name
  sensitive   = false
}

output "location" {
  description = "The Azure region where the AKS cluster is deployed"
  value       = azurerm_kubernetes_cluster.main.location
  sensitive   = false
}

output "kubernetes_version" {
  description = "The version of Kubernetes running on the cluster"
  value       = azurerm_kubernetes_cluster.main.kubernetes_version
  sensitive   = false
}

# Kubernetes configuration outputs - marked sensitive due to credential content
output "kube_config" {
  description = "Structured Kubernetes configuration object for cluster access"
  value       = azurerm_kubernetes_cluster.main.kube_config[0]
  sensitive   = true
}

output "kube_config_raw" {
  description = "Raw Kubernetes configuration in YAML format for direct cluster access"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "node_resource_group" {
  description = "The auto-generated resource group containing the AKS cluster node resources"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
  sensitive   = false
}

# Identity and security outputs
output "identity" {
  description = "The system-assigned managed identity details for the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.identity[0]
  sensitive   = false
}

# Network configuration outputs
output "network_profile" {
  description = "Network configuration details of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.network_profile[0]
  sensitive   = false
}