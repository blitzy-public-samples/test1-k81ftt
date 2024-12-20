# Server resource identifier output
output "server_id" {
  description = "The resource ID of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.postgresql_server.id
  sensitive   = false
}

# Server FQDN output for connection strings
output "server_fqdn" {
  description = "The fully qualified domain name of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.postgresql_server.fqdn
  sensitive   = false
}

# Database name output
output "database_name" {
  description = "The name of the PostgreSQL database created for the Task Management System"
  value       = azurerm_postgresql_flexible_server_database.postgresql_database.name
  sensitive   = false
}

# Administrator login output - marked sensitive
output "administrator_login" {
  description = "The administrator username for PostgreSQL server access"
  value       = azurerm_postgresql_flexible_server.postgresql_server.administrator_login
  sensitive   = true
}

# Connection string without credentials for application configuration
output "connection_string" {
  description = "PostgreSQL connection string without credentials for application configuration"
  value       = "postgresql://${azurerm_postgresql_flexible_server.postgresql_server.fqdn}:5432/${azurerm_postgresql_flexible_server_database.postgresql_database.name}"
  sensitive   = false
}

# High availability status output
output "high_availability_enabled" {
  description = "Indicates whether high availability is enabled for the database server"
  value       = length(azurerm_postgresql_flexible_server.postgresql_server.high_availability) > 0 ? azurerm_postgresql_flexible_server.postgresql_server.high_availability[0].mode != "" : false
  sensitive   = false
}