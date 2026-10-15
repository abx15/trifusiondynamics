# VPC Module for Primary Region
module "primary_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  providers = {
    aws = aws.primary
  }

  name = "${var.environment}-primary-vpc"
  cidr = var.vpc_cidr_primary

  azs             = ["${var.primary_region}a", "${var.primary_region}b", "${var.primary_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_network_address_usage_metrics = true

  tags = {
    "kubernetes.io/role/elb"   = "1"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# VPC Module for Secondary Region
module "secondary_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  providers = {
    aws = aws.secondary
  }

  name = "${var.environment}-secondary-vpc"
  cidr = var.vpc_cidr_secondary

  azs             = ["${var.secondary_region}a", "${var.secondary_region}b", "${var.secondary_region}c"]
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
  database_subnets = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_network_address_usage_metrics = true

  tags = {
    "kubernetes.io/role/elb"   = "1"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# VPC Peering for Cross-Region Replication
resource "aws_vpc_peering_connection" "cross_region" {
  provider      = aws.primary
  vpc_id        = module.primary_vpc.vpc_id
  peer_vpc_id   = module.secondary_vpc.vpc_id
  peer_region   = var.secondary_region
  auto_accept   = false
  tags = {
    Name = "${var.environment}-cross-region-peering"
  }
}

resource "aws_vpc_peering_connection_accepter" "cross_region" {
  provider                  = aws.secondary
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_region.id
  auto_accept               = true
  tags = {
    Name = "${var.environment}-cross-region-peering-accepter"
  }
}

# Route table entries for peering
resource "aws_route" "primary_to_secondary" {
  for_each = { for idx, rt in module.primary_vpc.database_route_table_ids : idx => rt }
  route_table_id            = each.value
  destination_cidr_block    = var.vpc_cidr_secondary
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_region.id
}

resource "aws_route" "secondary_to_primary" {
  for_each = { for idx, rt in module.secondary_vpc.database_route_table_ids : idx => rt }
  provider = aws.secondary
  route_table_id            = each.value
  destination_cidr_block    = var.vpc_cidr_primary
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_region.id
}

# RDS Primary Database (Primary Region)
module "primary_rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"
  providers = {
    aws = aws.primary
  }

  identifier = "${var.environment}-primary-db"
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = var.database_instance_class
  allocated_storage    = var.database_allocated_storage
  max_allocated_storage = var.database_max_allocated_storage
  storage_encrypted    = true
  storage_type         = "gp3"

  db_name  = "agencyos"
  username = "admin"
  password = random_password.db_password.result
  port     = 5432

  vpc_id            = module.primary_vpc.vpc_id
  subnet_ids        = module.primary_vpc.database_subnets
  security_groups   = [aws_security_group.rds_primary.id]

  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  deletion_protection     = var.enable_deletion_protection

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  apply_immediately = false

  parameters = [
    { name = "rds.force_ssl", value = "1" },
    { name = "max_connections", value = "1000" },
    { name = "shared_buffers", value = "256MB" },
    { name = "effective_cache_size", value = "768MB" },
    { name = "work_mem", value = "16MB" },
    { name = "maintenance_work_mem", value = "128MB" },
    { name = "wal_level", value = "replica" },
    { name = "max_wal_senders", value = "10" },
    { name = "max_replication_slots", value = "10" },
    { name = "hot_standby", value = "on" },
    { name = "synchronous_commit", value = "remote_apply" },
    { name = "synchronous_standby_names", value = "secondary" },
  ]

  tags = {
    Role = "primary"
  }
}

# RDS Read Replica (Secondary Region)
module "secondary_rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"
  providers = {
    aws = aws.secondary
  }

  identifier = "${var.environment}-secondary-db"
  replicate_source_db = module.primary_rds.this_db_instance_identifier
  instance_class       = var.database_instance_class

  vpc_id            = module.secondary_vpc.vpc_id
  subnet_ids        = module.secondary_vpc.database_subnets
  security_groups   = [aws_security_group.rds_secondary.id]

  deletion_protection     = var.enable_deletion_protection
  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  tags = {
    Role = "replica"
  }
}

# ElastiCache Primary (Primary Region)
module "primary_redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 3.0"
  providers = {
    aws = aws.primary
  }

  cluster_id = "${var.environment}-primary-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_cache_nodes
  parameter_group_name = "default.redis7"
  port                 = 6379

  vpc_id     = module.primary_vpc.vpc_id
  subnet_ids = module.primary_vpc.private_subnets
  security_group_ids = [aws_security_group.redis_primary.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = random_password.redis_password.result

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = 7
  snapshot_window          = "05:00-06:00"

  tags = {
    Role = "primary"
  }
}

# ElastiCache Replica (Secondary Region)
module "secondary_redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 3.0"
  providers = {
    aws = aws.secondary
  }

  cluster_id = "${var.environment}-secondary-redis"
  replication_group_id = module.primary_redis.replication_group_id
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_cache_nodes

  vpc_id     = module.secondary_vpc.vpc_id
  subnet_ids = module.secondary_vpc.private_subnets
  security_group_ids = [aws_security_group.redis_secondary.id]

  automatic_failover_enabled = true
  multi_az_enabled           = true

  tags = {
    Role = "replica"
  }
}

# EKS Primary Cluster
module "primary_eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  providers = {
    aws = aws.primary
  }

  cluster_name    = "${var.environment}-primary"
  cluster_version = "1.28"

  vpc_id     = module.primary_vpc.vpc_id
  subnet_ids = module.primary_vpc.private_subnets

  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    instance_types = var.eks_instance_types
  }

  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = var.eks_instance_types
      capacity_type  = "ON_DEMAND"
      min_size       = var.eks_min_size
      max_size       = var.eks_max_size
      desired_size   = var.eks_desired_size

      labels = {
        Environment = var.environment
        Region      = var.primary_region
        Role        = "general"
      }

      taints = [{
        key    = "dedicated"
        value  = "general"
        effect = "NO_SCHEDULE"
      }]
    }

    critical = {
      name           = "critical"
      instance_types = ["m6i.2xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 10
      desired_size   = 3

      labels = {
        Environment = var.environment
        Region      = var.primary_region
        Role        = "critical"
      }
    }
  }

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  cluster_addons = {
    vpc-cni = {
      most_recent = true
    }
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = {
    Environment = var.environment
    Role        = "primary"
  }
}

# EKS Secondary Cluster (Warm Standby)
module "secondary_eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  providers = {
    aws = aws.secondary
  }

  cluster_name    = "${var.environment}-secondary"
  cluster_version = "1.28"

  vpc_id     = module.secondary_vpc.vpc_id
  subnet_ids = module.secondary_vpc.private_subnets

  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    instance_types = var.eks_instance_types
  }

  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = var.eks_instance_types
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = var.eks_max_size
      desired_size   = 2

      labels = {
        Environment = var.environment
        Region      = var.secondary_region
        Role        = "general"
      }
    }
  }

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  cluster_addons = {
    vpc-cni = { most_recent = true }
    coredns = { most_recent = true }
    kube-proxy = { most_recent = true }
    aws-ebs-csi-driver = { most_recent = true }
  }

  tags = {
    Environment = var.environment
    Role        = "secondary"
  }
}

# Security Groups
resource "aws_security_group" "rds_primary" {
  provider = aws.primary
  name        = "${var.environment}-rds-primary-sg"
  description = "Security group for primary RDS"
  vpc_id      = module.primary_vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [module.primary_eks.cluster_security_group_id]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_secondary]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-rds-primary-sg" }
}

resource "aws_security_group" "rds_secondary" {
  provider = aws.secondary
  name        = "${var.environment}-rds-secondary-sg"
  description = "Security group for secondary RDS"
  vpc_id      = module.secondary_vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [module.secondary_eks.cluster_security_group_id]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_primary]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-rds-secondary-sg" }
}

resource "aws_security_group" "redis_primary" {
  provider = aws.primary
  name        = "${var.environment}-redis-primary-sg"
  description = "Security group for primary Redis"
  vpc_id      = module.primary_vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [module.primary_eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-redis-primary-sg" }
}

resource "aws_security_group" "redis_secondary" {
  provider = aws.secondary
  name        = "${var.environment}-redis-secondary-sg"
  description = "Security group for secondary Redis"
  vpc_id      = module.secondary_vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [module.secondary_eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-redis-secondary-sg" }
}

# IAM Roles
resource "aws_iam_role" "rds_monitoring" {
  provider = aws.primary
  name = "${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  provider = aws.primary
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Random Passwords
resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

# S3 Buckets for Cross-Region Replication
resource "aws_s3_bucket" "primary_assets" {
  provider = aws.primary
  bucket = "${var.environment}-primary-assets"
  force_destroy = false

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  versioning {
    enabled = true
  }

  replication_configuration {
    role = aws_iam_role.s3_replication.arn

    rules {
      id     = "cross-region-replication"
      status = "Enabled"
      priority = 1

      destination {
        bucket        = aws_s3_bucket.secondary_assets.arn
        storage_class = "STANDARD_IA"
      }

      filter {
        prefix = ""
      }
    }
  }

  lifecycle_rule {
    enabled = true
    expiration {
      days = 365
    }
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket" "secondary_assets" {
  provider = aws.secondary
  bucket = "${var.environment}-secondary-assets"
  force_destroy = false

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  versioning {
    enabled = true
  }
}

resource "aws_iam_role" "s3_replication" {
  provider = aws.primary
  name = "${var.environment}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "s3_replication" {
  provider = aws.primary
  name = "${var.environment}-s3-replication-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObjectVersion",
        "s3:GetObjectVersionTagging",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectRetention",
        "s3:GetObjectLegalHold"
      ]
      Resource = [
        "${aws_s3_bucket.primary_assets.arn}/*",
      ]
    }, {
      Effect = "Allow"
      Action = [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags",
        "s3:ObjectOwnerOverrideToBucketOwner"
      ]
      Resource = [
        "${aws_s3_bucket.secondary_assets.arn}/*",
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3_replication" {
  provider = aws.primary
  role       = aws_iam_role.s3_replication.name
  policy_arn = aws_iam_policy.s3_replication.arn
}

# Cloudflare DNS for Failover
resource "cloudflare_record" "api_primary" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  type    = "CNAME"
  value   = module.primary_eks.cluster_endpoint
  ttl     = 60
  proxied = true
  comment = "Primary API endpoint"
}

resource "cloudflare_load_balancer" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.subdomain}.${var.domain_name}"
  fallback_pool = cloudflare_load_balancer_pool.secondary.id
  default_pools = [cloudflare_load_balancer_pool.primary.id]
  proxied = true

  steer_policy = "random"
  session_affinity = "none"
}

resource "cloudflare_load_balancer_pool" "primary" {
  zone_id = var.cloudflare_zone_id
  name    = "primary-pool"
  origin_steering_policy = "random"
  enabled = true
  minimum_origins = 1
  check_regions = ["WNAM", "ENAM", "WEU", "EEU"]

  monitor = "health-monitor"

  origin {
    name = "primary-${var.primary_region}"
    address = module.primary_eks.cluster_endpoint
    enabled = true
    weight = 1
  }
}

resource "cloudflare_load_balancer_pool" "secondary" {
  zone_id = var.cloudflare_zone_id
  name    = "secondary-pool"
  origin_steering_policy = "random"
  enabled = true
  minimum_origins = 1

  monitor = "health-monitor"

  origin {
    name = "secondary-${var.secondary_region}"
    address = module.secondary_eks.cluster_endpoint
    enabled = true
    weight = 1
  }
}

resource "cloudflare_load_balancer_monitor" "health_monitor" {
  zone_id = var.cloudflare_zone_id
  name    = "health-monitor"
  type    = "HTTPS"
  method  = "GET"
  path    = "/health/ready"
  expected_codes = "200"
  timeout = 10
  interval = 30
  retries = 2
  follow_redirects = true
  allow_insecure = false
  expected_body = "ready"
}

# Monitoring & Alerting
resource "aws_cloudwatch_metric_alarm" "primary_db_cpu" {
  provider = aws.primary
  alarm_name          = "${var.environment}-primary-db-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Primary database CPU > 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = module.primary_rds.this_db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "primary_db_connections" {
  provider = aws.primary
  alarm_name          = "${var.environment}-primary-db-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 800
  alarm_description   = "Primary database connections > 800"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = module.primary_rds.this_db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  provider = aws.secondary
  alarm_name          = "${var.environment}-replication-lag-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = var.replication_lag_threshold
  alarm_description   = "Replication lag > threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = module.secondary_rds.this_db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "primary_redis_cpu" {
  provider = aws.primary
  alarm_name          = "${var.environment}-primary-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Primary Redis CPU > 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    CacheClusterId = module.primary_redis.cache_cluster_id
  }
}

resource "aws_sns_topic" "alerts" {
  provider = aws.primary
  name = "${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  provider = aws.primary
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

resource "aws_sns_topic_subscription" "slack" {
  provider = aws.primary
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}