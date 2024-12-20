# Provider Configuration
# Azure Provider version ~> 3.0
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Resource Group for Monitoring Infrastructure
resource "azurerm_resource_group" "monitoring" {
  name     = var.resource_group_name
  location = var.location
  tags = merge(var.tags, {
    Environment       = var.environment
    Purpose          = "Monitoring"
    CostCenter       = "Operations"
    SecurityLevel    = "High"
    DataClassification = "Sensitive"
  })
}

# Kubernetes Namespace with Enhanced Security
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
    labels = {
      name             = "monitoring"
      environment      = var.environment
      "security-level" = "restricted"
    }
    annotations = {
      "security.kubernetes.io/enforce-pod-security" = "restricted"
      "monitoring.kubernetes.io/retention"          = "${var.retention_days}d"
    }
  }
}

# Network Policy for Monitoring Namespace
resource "kubernetes_network_policy" "monitoring" {
  metadata {
    name      = "monitoring-network-policy"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  spec {
    pod_selector {}
    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = kubernetes_namespace.monitoring.metadata[0].name
          }
        }
      }
    }
    policy_types = ["Ingress"]
  }
}

# Prometheus Deployment
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus"
  version    = "15.10.0"  # Specify exact version for production stability
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    file(var.prometheus_values_file)
  ]

  set {
    name  = "retention"
    value = "${var.retention_days}d"
  }

  set {
    name  = "server.securityContext.runAsNonRoot"
    value = "true"
  }

  depends_on = [kubernetes_namespace.monitoring]
}

# Grafana Deployment
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  version    = "6.50.0"  # Specify exact version for production stability
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    file(var.grafana_values_file)
  ]

  set_sensitive {
    name  = "adminPassword"
    value = var.grafana_admin_password
  }

  set {
    name  = "securityContext.runAsNonRoot"
    value = "true"
  }

  depends_on = [helm_release.prometheus]
}

# Loki Deployment
resource "helm_release" "loki" {
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki-stack"
  version    = "2.9.0"  # Specify exact version for production stability
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    file(var.loki_values_file)
  ]

  set {
    name  = "retention"
    value = "${var.retention_days}d"
  }

  set {
    name  = "loki.auth_enabled"
    value = "true"
  }

  depends_on = [kubernetes_namespace.monitoring]
}

# Tempo Deployment
resource "helm_release" "tempo" {
  name       = "tempo"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "tempo"
  version    = "1.0.0"  # Specify exact version for production stability
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    file(var.tempo_values_file)
  ]

  set {
    name  = "retention"
    value = "${var.retention_days}d"
  }

  set {
    name  = "securityContext.runAsNonRoot"
    value = "true"
  }

  depends_on = [kubernetes_namespace.monitoring]
}

# Monitoring Stack Outputs
output "prometheus_url" {
  description = "Prometheus server URL"
  value       = "https://prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  sensitive   = true
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "https://grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  sensitive   = true
}

output "loki_endpoint" {
  description = "Loki log aggregation endpoint"
  value       = "http://loki.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:3100"
  sensitive   = true
}

output "tempo_endpoint" {
  description = "Tempo tracing endpoint"
  value       = "http://tempo.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:3100"
  sensitive   = true
}

output "monitoring_namespace" {
  description = "Kubernetes namespace for monitoring stack"
  value       = kubernetes_namespace.monitoring.metadata[0].name
}

# Service Account for Monitoring Components
resource "kubernetes_service_account" "monitoring" {
  metadata {
    name      = "monitoring-service-account"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    annotations = {
      "kubernetes.io/enforce-mountable-secrets" = "true"
    }
  }
  automount_service_account_token = true
}

# RBAC Role for Monitoring
resource "kubernetes_role" "monitoring" {
  metadata {
    name      = "monitoring-role"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services", "endpoints"]
    verbs      = ["get", "list", "watch"]
  }
}

# RBAC Role Binding
resource "kubernetes_role_binding" "monitoring" {
  metadata {
    name      = "monitoring-role-binding"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.monitoring.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.monitoring.metadata[0].name
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }
}