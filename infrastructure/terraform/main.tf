# Provider and Backend Configuration
# Azure Provider version ~> 3.0
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate${random_string.suffix.result}"
    container_name      = "tfstate"
    key                 = "terraform.tfstate"
    use_oidc           = true
  }
}

# Random string for unique naming
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Configure the Azure Provider
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Main Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.project}-${var.environment}-rg"
  location = var.regions.primary
  tags     = local.common_tags

  lifecycle {
    prevent_destroy = true
  }
}

# DDoS Protection Plan
resource "azurerm_network_ddos_protection_plan" "main" {
  name                = "${var.project}-${var.environment}-ddos"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.project}-${var.environment}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.network_config.vnet_address_space
  
  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.main.id
    enable = true
  }

  tags = local.common_tags
}

# Subnets
resource "azurerm_subnet" "main" {
  for_each = var.network_config.subnet_prefixes

  name                 = "${var.project}-${var.environment}-${each.key}-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [each.value]

  service_endpoints = lookup(var.network_config.service_endpoints, each.key, [])

  dynamic "delegation" {
    for_each = each.key == "aks" ? [1] : []
    content {
      name = "aks-delegation"
      service_delegation {
        name = "Microsoft.ContainerService/managedClusters"
        actions = [
          "Microsoft.Network/virtualNetworks/subnets/join/action",
        ]
      }
    }
  }
}

# Network Security Groups
resource "azurerm_network_security_group" "main" {
  for_each = var.network_config.subnet_prefixes

  name                = "${var.project}-${var.environment}-${each.key}-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags

  dynamic "security_rule" {
    for_each = var.network_config.network_security_rules
    content {
      name                         = security_rule.key
      priority                     = security_rule.value.priority
      direction                    = security_rule.value.direction
      access                       = security_rule.value.access
      protocol                     = security_rule.value.protocol
      source_port_range           = security_rule.value.source_port_range
      destination_port_range      = security_rule.value.destination_port_range
      source_address_prefix       = security_rule.value.source_address_prefix
      destination_address_prefix  = security_rule.value.destination_address_prefix
    }
  }
}

# Subnet NSG Associations
resource "azurerm_subnet_network_security_group_association" "main" {
  for_each = var.network_config.subnet_prefixes

  subnet_id                 = azurerm_subnet.main[each.key].id
  network_security_group_id = azurerm_network_security_group.main[each.key].id
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project}-${var.environment}-law"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.monitoring_config.log_analytics.sku
  retention_in_days   = var.monitoring_config.log_analytics.retention_days
  daily_quota_gb      = var.monitoring_config.log_analytics.daily_quota_gb
  tags                = local.common_tags
}

# AKS Module
module "aks" {
  source = "./modules/aks"

  project             = var.project
  environment         = var.environment
  location            = var.regions.primary
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.main["aks"].id
  aks_config          = var.aks_config
  log_analytics_id    = azurerm_log_analytics_workspace.main.id

  depends_on = [
    azurerm_virtual_network.main,
    azurerm_subnet.main,
  ]
}

# Database Module
module "database" {
  source = "./modules/database"

  project             = var.project
  environment         = var.environment
  location            = var.regions.primary
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.main["database"].id
  database_config     = var.database_config
  log_analytics_id    = azurerm_log_analytics_workspace.main.id

  depends_on = [
    azurerm_virtual_network.main,
    azurerm_subnet.main,
  ]
}

# Security Module
module "security" {
  source = "./modules/security"

  project             = var.project
  environment         = var.environment
  location            = var.regions.primary
  resource_group_name = azurerm_resource_group.main.name
  vnet_id             = azurerm_virtual_network.main.id
  log_analytics_id    = azurerm_log_analytics_workspace.main.id
  monitoring_config   = var.monitoring_config

  depends_on = [
    azurerm_virtual_network.main,
    azurerm_log_analytics_workspace.main,
  ]
}

# Local Variables
locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
    CreatedDate = timestamp()
  }
}

# Outputs
output "resource_group_id" {
  value       = azurerm_resource_group.main.id
  description = "The ID of the main resource group"
}

output "network_config" {
  value = {
    vnet_id     = azurerm_virtual_network.main.id
    subnet_ids  = { for k, v in azurerm_subnet.main : k => v.id }
    nsg_ids     = { for k, v in azurerm_network_security_group.main : k => v.id }
  }
  description = "Network configuration details"
}

output "monitoring_config" {
  value = {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    log_analytics_workspace_key = azurerm_log_analytics_workspace.main.primary_shared_key
  }
  description = "Monitoring configuration details"
  sensitive   = true
}