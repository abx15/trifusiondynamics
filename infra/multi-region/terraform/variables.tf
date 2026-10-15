variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "tertiary_region" {
  description = "Tertiary AWS region (cold standby)"
  type        = string
  default     = "us-west-2"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "agencyos.com"
}

variable "subdomain" {
  description = "Subdomain for API"
  type        = string
  default     = "api"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for DNS management"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "vpc_cidr_primary" {
  description = "VPC CIDR for primary region"
  type        = string
  default     = "10.0.0.0/16"
}

variable "vpc_cidr_secondary" {
  description = "VPC CIDR for secondary region"
  type        = string
  default     = "10.1.0.0/16"
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "database_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 500
}

variable "database_max_allocated_storage" {
  description = "RDS max allocated storage (GB)"
  type        = number
  default     = 1000
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.xlarge"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 2
}

variable "eks_instance_types" {
  description = "EKS node group instance types"
  type        = list(string)
  default     = ["m6i.xlarge", "m6i.2xlarge"]
}

variable "eks_min_size" {
  description = "EKS node group minimum size"
  type        = number
  default     = 3
}

variable "eks_max_size" {
  description = "EKS node group maximum size"
  type        = number
  default     = 20
}

variable "eks_desired_size" {
  description = "EKS node group desired size"
  type        = number
  default     = 5
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "RDS backup retention days"
  type        = number
  default     = 30
}

variable "replication_lag_threshold" {
  description = "Replication lag threshold for alerts (seconds)"
  type        = number
  default     = 60
}

variable "health_check_interval" {
  description = "Health check interval (seconds)"
  type        = number
  default     = 30
}

variable "failure_threshold" {
  description = "Number of failed health checks before failover"
  type        = number
  default     = 3
}

variable "notification_email" {
  description = "Email for alerts"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook for notifications"
  type        = string
  sensitive   = true
}