# Multi-Region Active-Passive Infrastructure

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
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

  backend "s3" {
    bucket         = "agencyos-terraform-state"
    key            = "multi-region/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  alias  = "primary"
  region = var.primary_region
  default_tags {
    tags = {
      Project     = "AgencyOS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = var.primary_region
    }
  }
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
  default_tags {
    tags = {
      Project     = "AgencyOS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = var.secondary_region
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "kubernetes" {
  alias                  = "primary"
  host                   = module.primary_eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.primary_eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.primary_eks.cluster_name, "--region", var.primary_region]
  }
}

provider "kubernetes" {
  alias                  = "secondary"
  host                   = module.secondary_eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.secondary_eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.secondary_eks.cluster_name, "--region", var.secondary_region]
  }
}

provider "helm" {
  alias                  = "primary"
  kubernetes {
    host                   = module.primary_eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.primary_eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.primary_eks.cluster_name, "--region", var.primary_region]
    }
  }
}

provider "helm" {
  alias                  = "secondary"
  kubernetes {
    host                   = module.secondary_eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.secondary_eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.secondary_eks.cluster_name, "--region", var.secondary_region]
    }
  }
}