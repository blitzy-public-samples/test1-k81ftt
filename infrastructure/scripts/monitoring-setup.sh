#!/usr/bin/env bash

# Monitoring Setup Script v1.0.0
# Enterprise-grade monitoring stack deployment for Task Management System
# Implements Prometheus, Grafana, Loki with enhanced security and validation

set -euo pipefail
IFS=$'\n\t'

# Global variables
readonly MONITORING_NAMESPACE="monitoring"
readonly GRAFANA_VERSION="10.0.0"
readonly PROMETHEUS_VERSION="2.45.0"
readonly LOKI_VERSION="2.9.0"
readonly TLS_CERT_PATH="/etc/monitoring/certs"
readonly BACKUP_PATH="/var/monitoring/backups"
readonly VALIDATION_TIMEOUT="300"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
validate_kubernetes_access() {
    log_info "Validating Kubernetes cluster access..."
    if ! kubectl cluster-info &>/dev/null; then
        log_error "Failed to access Kubernetes cluster"
        return 1
    fi
    log_info "Kubernetes cluster access validated"
}

validate_helm_installation() {
    log_info "Validating Helm installation..."
    if ! helm version --short &>/dev/null; then
        log_error "Helm is not installed or not accessible"
        return 1
    fi
    log_info "Helm installation validated"
}

validate_tls_certificates() {
    log_info "Validating TLS certificates..."
    local cert_files=("prometheus.crt" "prometheus.key" "ca.crt")
    
    for cert in "${cert_files[@]}"; do
        if [[ ! -f "${TLS_CERT_PATH}/${cert}" ]]; then
            log_error "Missing TLS certificate: ${cert}"
            return 1
        fi
    done
    log_info "TLS certificates validated"
}

# Setup functions
setup_namespace() {
    local namespace=$1
    log_info "Setting up monitoring namespace: ${namespace}"
    
    # Create namespace if it doesn't exist
    if ! kubectl get namespace "${namespace}" &>/dev/null; then
        kubectl create namespace "${namespace}"
        
        # Apply resource quotas
        kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: monitoring-quota
  namespace: ${namespace}
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    persistentvolumeclaims: "10"
EOF
    fi
    
    # Apply network policies
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monitoring-network-policy
  namespace: ${namespace}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: task-management
  egress:
  - to:
    - namespaceSelector: {}
EOF
    
    log_info "Namespace setup completed"
}

install_prometheus() {
    log_info "Installing Prometheus ${PROMETHEUS_VERSION}..."
    
    # Add Prometheus Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Create Prometheus configuration
    kubectl create configmap prometheus-config \
        --from-file=prometheus.yml=../monitoring/prometheus/prometheus.yaml \
        --from-file=alert-rules.yml=../monitoring/prometheus/rules/alert-rules.yaml \
        --from-file=recording-rules.yml=../monitoring/prometheus/rules/recording-rules.yaml \
        -n "${MONITORING_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Prometheus with security configurations
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace "${MONITORING_NAMESPACE}" \
        --version "${PROMETHEUS_VERSION}" \
        --set server.securityContext.runAsUser=65534 \
        --set server.securityContext.runAsGroup=65534 \
        --set server.securityContext.runAsNonRoot=true \
        --set server.persistentVolume.size=50Gi \
        --set server.retention=15d \
        --values ../monitoring/prometheus/prometheus.yaml
    
    # Validate Prometheus deployment
    kubectl rollout status deployment/prometheus-server -n "${MONITORING_NAMESPACE}" --timeout="${VALIDATION_TIMEOUT}s"
    log_info "Prometheus installation completed"
}

install_grafana() {
    log_info "Installing Grafana ${GRAFANA_VERSION}..."
    
    # Add Grafana Helm repository
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Create Grafana dashboards configmap
    kubectl create configmap grafana-dashboards \
        --from-file=api-metrics.json=../monitoring/grafana-dashboards/api-metrics.json \
        -n "${MONITORING_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Grafana with security configurations
    helm upgrade --install grafana grafana/grafana \
        --namespace "${MONITORING_NAMESPACE}" \
        --version "${GRAFANA_VERSION}" \
        --set securityContext.runAsUser=472 \
        --set securityContext.runAsGroup=472 \
        --set securityContext.fsGroup=472 \
        --set persistence.enabled=true \
        --set persistence.size=10Gi \
        --set adminPassword="$(openssl rand -base64 32)" \
        --set dashboardProviders."dashboardproviders\.yaml".apiVersion=1 \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].name=default \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].orgId=1 \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].folder="" \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].type=file \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].disableDeletion=false \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].editable=true \
        --set dashboardProviders."dashboardproviders\.yaml".providers[0].options.path=/var/lib/grafana/dashboards/default
    
    # Validate Grafana deployment
    kubectl rollout status deployment/grafana -n "${MONITORING_NAMESPACE}" --timeout="${VALIDATION_TIMEOUT}s"
    log_info "Grafana installation completed"
}

install_loki() {
    log_info "Installing Loki ${LOKI_VERSION}..."
    
    # Add Loki Helm repository
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Create Loki configuration
    kubectl create configmap loki-config \
        --from-file=loki.yaml=../monitoring/loki/loki.yaml \
        -n "${MONITORING_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Loki with security configurations
    helm upgrade --install loki grafana/loki \
        --namespace "${MONITORING_NAMESPACE}" \
        --version "${LOKI_VERSION}" \
        --set persistence.enabled=true \
        --set persistence.size=50Gi \
        --set config.auth_enabled=true \
        --set config.storage.filesystem.directory=/data/loki/chunks \
        --values ../monitoring/loki/loki.yaml
    
    # Validate Loki deployment
    kubectl rollout status statefulset/loki -n "${MONITORING_NAMESPACE}" --timeout="${VALIDATION_TIMEOUT}s"
    log_info "Loki installation completed"
}

configure_monitoring() {
    log_info "Configuring monitoring stack integration..."
    
    # Configure Prometheus datasource in Grafana
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: ${MONITORING_NAMESPACE}
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus-server:80
      isDefault: true
      version: 1
      editable: false
    - name: Loki
      type: loki
      access: proxy
      url: http://loki:3100
      version: 1
      editable: false
EOF
    
    # Validate monitoring stack integration
    local endpoints=("prometheus-server:80/api/v1/status/config" "grafana:3000/api/health" "loki:3100/ready")
    
    for endpoint in "${endpoints[@]}"; do
        if ! kubectl run curl-test --image=curlimages/curl --rm --restart=Never -n "${MONITORING_NAMESPACE}" \
            --command -- curl -s "http://${endpoint}" &>/dev/null; then
            log_error "Failed to validate endpoint: ${endpoint}"
            return 1
        fi
    done
    
    log_info "Monitoring stack integration completed"
}

# Main execution
main() {
    log_info "Starting monitoring stack setup..."
    
    # Validate prerequisites
    validate_kubernetes_access || exit 1
    validate_helm_installation || exit 1
    validate_tls_certificates || exit 1
    
    # Create monitoring namespace and setup
    setup_namespace "${MONITORING_NAMESPACE}"
    
    # Install and configure components
    install_prometheus
    install_grafana
    install_loki
    configure_monitoring
    
    log_info "Monitoring stack setup completed successfully"
    
    # Display access information
    local grafana_password=$(kubectl get secret --namespace "${MONITORING_NAMESPACE}" grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
    echo -e "\nAccess Information:"
    echo -e "Grafana URL: http://grafana.${MONITORING_NAMESPACE}"
    echo -e "Grafana Admin Password: ${grafana_password}"
    echo -e "Prometheus URL: http://prometheus.${MONITORING_NAMESPACE}"
    echo -e "Loki URL: http://loki.${MONITORING_NAMESPACE}"
}

# Script execution
main "$@"