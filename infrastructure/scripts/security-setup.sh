#!/bin/bash

# Task Management System Security Setup Script
# Version: 1.0.0
# Purpose: Automates security configuration and hardening of the infrastructure
# Dependencies:
# - kubectl v1.24+ (latest)
# - openssl v1.1.1 (v1.1.1)
# - azure-cli latest (latest)

set -euo pipefail

# Global Variables
NAMESPACE="taskmanagement"
MIN_TLS_VERSION="1.3"
KEY_SIZE="4096"
CERT_VALIDITY_DAYS="365"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Error handling
handle_error() {
    log_error "An error occurred on line $1"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Verify prerequisites
verify_prerequisites() {
    log_info "Verifying prerequisites..."
    
    # Check required tools
    command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed"; exit 1; }
    command -v openssl >/dev/null 2>&1 || { log_error "openssl is required but not installed"; exit 1; }
    command -v az >/dev/null 2>&1 || { log_error "azure-cli is required but not installed"; exit 1; }
    
    # Verify Kubernetes connection
    kubectl cluster-info >/dev/null 2>&1 || { log_error "Unable to connect to Kubernetes cluster"; exit 1; }
    
    log_info "Prerequisites verification completed"
}

# Setup network policies
setup_network_policies() {
    log_info "Setting up network policies..."
    
    # Apply default deny-all policies
    kubectl apply -f "${SCRIPT_DIR}/../security/network-policies/default-deny-all.yaml" -n "$NAMESPACE"
    
    # Apply service-specific network policies
    kubectl apply -f "${SCRIPT_DIR}/../security/network-policies/" -n "$NAMESPACE"
    
    # Verify network policy application
    kubectl get networkpolicies -n "$NAMESPACE" --no-headers | wc -l | grep -q "^[1-9]" || {
        log_error "Network policies not properly applied"
        return 1
    }
    
    log_info "Network policies setup completed"
}

# Setup pod security policies
setup_pod_security() {
    log_info "Setting up pod security policies..."
    
    # Apply restricted pod security policy
    kubectl apply -f "${SCRIPT_DIR}/../security/pod-security-policies/restricted-pods.yaml" -n "$NAMESPACE"
    
    # Setup pod security context constraints
    kubectl apply -f "${SCRIPT_DIR}/../security/pod-security-policies/" -n "$NAMESPACE"
    
    # Verify pod security policy application
    kubectl get podsecuritypolicies --no-headers | grep -q "restricted-pods" || {
        log_error "Pod security policies not properly applied"
        return 1
    }
    
    log_info "Pod security policies setup completed"
}

# Setup RBAC
setup_rbac() {
    log_info "Setting up RBAC..."
    
    # Apply service account configurations
    kubectl apply -f "${SCRIPT_DIR}/../kubernetes/base/service-accounts.yaml" -n "$NAMESPACE"
    
    # Apply RBAC roles and bindings
    kubectl apply -f "${SCRIPT_DIR}/../security/rbac/" -n "$NAMESPACE"
    
    # Verify RBAC setup
    kubectl get roles,rolebindings -n "$NAMESPACE" --no-headers | wc -l | grep -q "^[1-9]" || {
        log_error "RBAC configuration not properly applied"
        return 1
    }
    
    log_info "RBAC setup completed"
}

# Setup TLS certificates
setup_certificates() {
    log_info "Setting up TLS certificates..."
    
    # Apply cert-manager configurations
    kubectl apply -f "${SCRIPT_DIR}/../security/certificates/cert-manager/" -n "$NAMESPACE"
    
    # Setup certificate monitoring
    kubectl apply -f "${SCRIPT_DIR}/../security/certificates/monitoring/" -n "monitoring"
    
    # Apply certificate policies
    kubectl apply -f "${SCRIPT_DIR}/../security/certificates/policies/" -n "$NAMESPACE"
    
    # Verify certificate setup
    kubectl get certificates -n "$NAMESPACE" --no-headers | grep -q "tms-tls-cert" || {
        log_error "TLS certificates not properly configured"
        return 1
    }
    
    log_info "Certificate setup completed"
}

# Verify security setup
verify_security() {
    log_info "Verifying security configuration..."
    
    local verification_failed=0
    
    # Verify network policies
    kubectl get networkpolicies -n "$NAMESPACE" >/dev/null 2>&1 || {
        log_error "Network policies verification failed"
        verification_failed=1
    }
    
    # Verify pod security policies
    kubectl get podsecuritypolicies >/dev/null 2>&1 || {
        log_error "Pod security policies verification failed"
        verification_failed=1
    }
    
    # Verify RBAC configuration
    kubectl auth can-i --list -n "$NAMESPACE" >/dev/null 2>&1 || {
        log_error "RBAC verification failed"
        verification_failed=1
    }
    
    # Verify TLS certificates
    kubectl get certificates -n "$NAMESPACE" >/dev/null 2>&1 || {
        log_error "Certificate verification failed"
        verification_failed=1
    }
    
    if [ $verification_failed -eq 0 ]; then
        log_info "Security verification completed successfully"
    else
        log_error "Security verification failed"
        return 1
    fi
}

# Main setup function
main() {
    log_info "Starting security setup for Task Management System..."
    
    # Verify prerequisites
    verify_prerequisites
    
    # Create namespace if it doesn't exist
    kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || {
        kubectl create namespace "$NAMESPACE"
    }
    
    # Setup security components
    setup_network_policies
    setup_pod_security
    setup_rbac
    setup_certificates
    
    # Verify setup
    verify_security
    
    log_info "Security setup completed successfully"
}

# Execute main function
main "$@"