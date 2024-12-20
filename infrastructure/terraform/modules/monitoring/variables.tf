# Azure Resource Group Configuration
variable "resource_group_name" {
  type        = string
  description = "Name of the Azure resource group for monitoring resources"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters long and contain only alphanumeric characters and hyphens"
  }
}

variable "location" {
  type        = string
  description = "Azure region where monitoring resources will be deployed"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.location))
    error_message = "Location must be a valid Azure region name"
  }
}

# Environment Configuration
variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod) affecting monitoring configuration"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Kubernetes Namespace Configuration
variable "monitoring_namespace" {
  type        = string
  description = "Kubernetes namespace for monitoring stack deployment"
  default     = "monitoring"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.monitoring_namespace))
    error_message = "Namespace must consist of lowercase alphanumeric characters or hyphens"
  }
}

# Data Retention Configuration
variable "retention_days" {
  type        = number
  description = "Number of days to retain monitoring data across all components"
  default     = 30

  validation {
    condition     = var.retention_days >= 7 && var.retention_days <= 90
    error_message = "Retention period must be between 7 and 90 days for compliance and resource optimization"
  }
}

# Alerting Configuration
variable "enable_alerts" {
  type        = bool
  description = "Enable alerting functionality in monitoring stack"
  default     = true
}

# Grafana Security Configuration
variable "grafana_admin_password" {
  type        = string
  description = "Secure admin password for Grafana dashboard access"
  sensitive   = true

  validation {
    condition     = can(regex("^[A-Za-z0-9!@#$%^&*()_+=-]{12,}$", var.grafana_admin_password))
    error_message = "Password must be at least 12 characters and contain a mix of alphanumeric and special characters"
  }
}

# Helm Values File Paths
variable "prometheus_values_file" {
  type        = string
  description = "Path to custom Prometheus Helm values file"
  default     = "../../../monitoring/prometheus/prometheus.yaml"
}

variable "grafana_values_file" {
  type        = string
  description = "Path to custom Grafana Helm values file"
  default     = "../../../monitoring/grafana-dashboards/grafana-values.yaml"
}

variable "loki_values_file" {
  type        = string
  description = "Path to custom Loki Helm values file"
  default     = "../../../monitoring/loki/loki.yaml"
}

variable "tempo_values_file" {
  type        = string
  description = "Path to custom Tempo Helm values file"
  default     = "../../../monitoring/tempo/tempo.yaml"
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Resource tags for monitoring infrastructure"
  default = {
    Component     = "Monitoring"
    ManagedBy     = "Terraform"
    Environment   = "var.environment"
    SecurityLevel = "High"
    DataRetention = "var.retention_days"
  }
}