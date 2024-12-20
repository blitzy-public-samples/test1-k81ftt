# Monitoring Stack Service Endpoints
output "prometheus_url" {
  description = "Internal URL endpoint for accessing Prometheus metrics interface with proper namespace isolation"
  value       = "http://prometheus.${var.monitoring_namespace}.svc.cluster.local:9090"
  sensitive   = false
}

output "grafana_url" {
  description = "Internal URL endpoint for accessing Grafana dashboards and visualization interface"
  value       = "http://grafana.${var.monitoring_namespace}.svc.cluster.local:3000"
  sensitive   = false
}

output "loki_endpoint" {
  description = "Internal endpoint for Loki log aggregation service with proper namespace configuration"
  value       = "http://loki.${var.monitoring_namespace}.svc.cluster.local:3100"
  sensitive   = false
}

output "tempo_endpoint" {
  description = "Internal endpoint for Tempo distributed tracing service with proper routing"
  value       = "http://tempo.${var.monitoring_namespace}.svc.cluster.local:3200"
  sensitive   = false
}

# Monitoring Stack Status Outputs
output "prometheus_status" {
  description = "Current deployment status of Prometheus metrics collection stack"
  value       = helm_release.prometheus.status
  sensitive   = false
}

output "grafana_status" {
  description = "Current deployment status of Grafana visualization platform"
  value       = helm_release.grafana.status
  sensitive   = false
}

output "loki_status" {
  description = "Current deployment status of Loki log aggregation service"
  value       = helm_release.loki.status
  sensitive   = false
}

output "tempo_status" {
  description = "Current deployment status of Tempo distributed tracing service"
  value       = helm_release.tempo.status
  sensitive   = false
}

# Resource Organization Outputs
output "monitoring_namespace" {
  description = "Kubernetes namespace where monitoring stack components are deployed for isolation"
  value       = var.monitoring_namespace
  sensitive   = false
}

output "monitoring_resource_group" {
  description = "Azure resource group containing all monitoring stack resources for better organization"
  value       = var.resource_group_name
  sensitive   = false
}