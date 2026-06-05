# ─────────────────────────────────────────────────────────────
# EC2 Instance for Node.js Express Application
# ─────────────────────────────────────────────────────────────
# Runs Dockerized URL Monitoring System application
# Kubernetes cluster (k3s) on single node
# ─────────────────────────────────────────────────────────────

# Data source to get latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  vpc_security_group_ids = [aws_security_group.ec2_app.id]
  key_name               = var.ec2_ssh_key_name != "" ? var.ec2_ssh_key_name : null

  # Root volume configuration
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "urlms-root-volume"
    }
  }

  # User data script - Install Docker, K3s, and deploy application
  user_data = templatefile("${path.module}/user-data.sh", {
    region                  = var.aws_region
    environment             = var.environment
    dynamodb_urls_table     = data.aws_dynamodb_table.urls.name
    dynamodb_results_table  = data.aws_dynamodb_table.results.name
    sns_topic_arn           = data.aws_sns_topic.alerts.arn
    docker_image            = var.docker_image
    repo_url                = var.repo_url
  })

  monitoring              = true
  associate_public_ip_address = true

  tags = {
    Name = "urlms-${var.environment}-app-server"
    Role = "application"
  }

  depends_on = [
    aws_iam_role_policy_attachment.ec2_policy_attachment,
    aws_security_group.ec2_app
  ]

  # Prevent accidental termination
  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP for static IP address (optional but recommended)
resource "aws_eip" "app_server_ip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  tags = {
    Name = "urlms-${var.environment}-eip"
  }

  depends_on = [aws_instance.app_server]
}

# CloudWatch Log Group for application logs
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/urlms/${var.environment}/application"
  retention_in_days = 14

  tags = {
    Name = "urlms-app-logs"
  }
}

# CloudWatch Log Group for system logs
resource "aws_cloudwatch_log_group" "system_logs" {
  name              = "/urlms/${var.environment}/system"
  retention_in_days = 7

  tags = {
    Name = "urlms-system-logs"
  }
}
