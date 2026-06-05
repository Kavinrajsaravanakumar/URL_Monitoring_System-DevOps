variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, prod, staging, etc.)"
  type        = string
  default     = "dev"
}

variable "urls_table_name" {
  description = "Name of the existing DynamoDB table that stores URLs"
  type        = string
  default     = "URLs"
}

variable "results_table_name" {
  description = "Name of the existing DynamoDB table that stores monitoring results"
  type        = string
  default     = "MonitoringResults"
}

variable "sns_topic_name" {
  description = "Name of the existing SNS topic for email alerts"
  type        = string
  default     = "url-monitor-alerts"
}

variable "sns_topic_arn" {
  description = "ARN of the existing SNS topic for email alerts"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the Node.js application server"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium", "t3.large"], var.ec2_instance_type)
    error_message = "EC2 instance type must be t3.micro, t3.small, t3.medium, or t3.large."
  }
}

variable "ec2_ssh_key_name" {
  description = "Name of EC2 Key Pair for SSH access (must exist in AWS)"
  type        = string
  default     = ""
}

variable "ec2_ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access (default: allow from anywhere - RESTRICT IN PRODUCTION)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_monitoring" {
  description = "Whether to enable CloudWatch monitoring dashboards"
  type        = bool
  default     = true
}

variable "s3_bucket_prefix" {
  description = "Prefix for S3 bucket name (must be globally unique)"
  type        = string
  default     = "urlms"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "repo_url" {
  description = "Git repository URL for the URLMS application (cloned on EC2)"
  type        = string
}

variable "docker_image" {
  description = "Docker Hub or ECR image to pull for the URLMS application (e.g. user/urlms:latest)"
  type        = string
}
