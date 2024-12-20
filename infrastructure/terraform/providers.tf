# Required Terraform version and provider configurations
# Version constraints align with enterprise security and stability requirements
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # Azure Resource Manager provider v3.0
    # Used for managing Azure infrastructure resources
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }

    # Azure Active Directory provider v2.0
    # Used for managing Azure AD resources and OIDC authentication
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }

    # Random provider v3.0
    # Used for generating secure unique identifiers
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }

    # Kubernetes provider v2.0
    # Used for managing AKS resources with enhanced security
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Azure Resource Manager Provider Configuration
provider "azurerm" {
  features {
    # Key Vault security features
    key_vault {
      # Prevent accidental permanent deletion of key vaults
      purge_soft_delete_on_destroy = false
      # Enable recovery of soft-deleted key vaults
      recover_soft_deleted_key_vaults = true
      # Prevent accidental permanent deletion of secrets
      purge_soft_deleted_secrets_on_destroy = false
      # Enable recovery of soft-deleted secrets
      recover_soft_deleted_secrets = true
    }

    # Resource group protection features
    resource_group {
      # Prevent accidental deletion of non-empty resource groups
      prevent_deletion_if_contains_resources = true
    }

    # Virtual machine management features
    virtual_machine {
      # Automatically delete OS disks when VM is deleted
      delete_os_disk_on_deletion = true
      # Enable graceful shutdown for maintenance
      graceful_shutdown = true
    }

    # Log Analytics workspace features
    log_analytics_workspace {
      # Enable permanent deletion on destroy for compliance
      permanently_delete_on_destroy = true
    }

    # API Management features
    api_management {
      # Prevent accidental permanent deletion
      purge_soft_delete_on_destroy = false
      # Enable recovery of soft-deleted instances
      recover_soft_deleted = true
    }
  }

  # Enable OpenID Connect authentication
  use_oidc = true
  
  # Subscription and tenant configuration
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  environment     = var.environment
  
  # Azure Resource Manager endpoint
  metadata_host = "https://management.azure.com"
  
  # Additional security configurations
  skip_provider_registration = false
}

# Azure Active Directory Provider Configuration
provider "azuread" {
  tenant_id     = var.tenant_id
  use_oidc      = true
  environment   = var.environment
  metadata_host = "https://login.microsoftonline.com"
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  host = data.azurerm_kubernetes_cluster.main.kube_config.0.host

  # Client certificate authentication
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.client_certificate)
  client_key            = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.cluster_ca_certificate)

  # Azure AD authentication configuration for AKS
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "kubelogin"
    args = [
      "get-token",
      "--login",
      "spn",
      "--environment",
      "AzurePublicCloud",
      "--tenant-id",
      var.tenant_id,
      "--server-id",
      data.azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
    ]
  }
}