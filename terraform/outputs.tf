# ─────────────────────────────────────────────────────────────
# Terraform Outputs
# ─────────────────────────────────────────────────────────────
# Key information about provisioned infrastructure
# ─────────────────────────────────────────────────────────────

output "cloudfront_url" {
  description = "CloudFront distribution URL for accessing the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket storing frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.app_server.id
}

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.app_server_ip.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.app_server.public_dns
}

output "ec2_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = aws_instance.app_server.private_ip
}

output "security_group_id" {
  description = "Security group ID for the EC2 instance"
  value       = aws_security_group.ec2_app.id
}

output "iam_role_name" {
  description = "IAM role name for the EC2 instance"
  value       = aws_iam_role.ec2_role.name
}

output "iam_instance_profile_name" {
  description = "IAM instance profile name"
  value       = aws_iam_instance_profile.ec2_profile.name
}

output "dynamodb_urls_table_name" {
  description = "DynamoDB table name for storing monitored URLs"
  value       = data.aws_dynamodb_table.urls.name
}

output "dynamodb_urls_table_arn" {
  description = "DynamoDB URLs table ARN"
  value       = data.aws_dynamodb_table.urls.arn
}

output "dynamodb_results_table_name" {
  description = "DynamoDB table name for storing monitoring results"
  value       = data.aws_dynamodb_table.results.name
}

output "dynamodb_results_table_arn" {
  description = "DynamoDB results table ARN"
  value       = data.aws_dynamodb_table.results.arn
}

output "sns_topic_name" {
  description = "SNS topic name for email alerts"
  value       = data.aws_sns_topic.alerts.name
}

output "sns_topic_arn" {
  description = "SNS topic ARN for email alerts"
  value       = data.aws_sns_topic.alerts.arn
}

output "cloudwatch_log_group_app" {
  description = "CloudWatch Log Group for application logs"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "cloudwatch_log_group_system" {
  description = "CloudWatch Log Group for system logs"
  value       = aws_cloudwatch_log_group.system_logs.name
}

# ─────────────────────────────────────────────────────────────
# Connection Instructions
# ─────────────────────────────────────────────────────────────

output "connection_instructions" {
  description = "Instructions for connecting to resources"
  value = <<-EOT
    
    === URLMS DEPLOYMENT SUMMARY ===
    
    Frontend URL (CloudFront):
      https://${aws_cloudfront_distribution.frontend.domain_name}
    
    EC2 Instance SSH:
      ssh -i /path/to/key.pem ubuntu@${aws_eip.app_server_ip.public_ip}
    
    Application Direct Access (EC2):
      http://${aws_eip.app_server_ip.public_ip}:30080
    
    K3s kubectl access (on EC2):
      export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
      kubectl get pods -n urlms
      kubectl logs -n urlms -l app=urlms
    
    CloudWatch Logs:
      Application: ${aws_cloudwatch_log_group.app_logs.name}
      System:      ${aws_cloudwatch_log_group.system_logs.name}
    
    DynamoDB Tables:
      URLs:     ${data.aws_dynamodb_table.urls.name}
      Results:  ${data.aws_dynamodb_table.results.name}
    
    SNS Topic:
      ${data.aws_sns_topic.alerts.arn}
    
    === NEXT STEPS ===
    1. SSH into EC2: ssh -i key.pem ubuntu@${aws_eip.app_server_ip.public_ip}
    2. Wait ~2 minutes for K3s initialization
    3. Check application status: kubectl get pods -n urlms
    4. View logs: kubectl logs -n urlms -f deployment/urlms-app
    5. Access frontend: https://${aws_cloudfront_distribution.frontend.domain_name}
    6. Access application directly: http://${aws_eip.app_server_ip.public_ip}:30080
    
  EOT
}

output "migration_checklist" {
  description = "Checklist for post-deployment verification"
  value = <<-EOT
    
    === POST-DEPLOYMENT VERIFICATION CHECKLIST ===
    
    [ ] Verify CloudFront distribution is active
    [ ] Verify S3 bucket is properly configured
    [ ] Verify EC2 instance is running
    [ ] SSH into EC2 and verify Docker is running
    [ ] Check K3s cluster status: kubectl cluster-info
    [ ] Check application pod: kubectl get pods -n urlms
    [ ] Test application health: curl http://EC2_IP:30080/health
    [ ] Test frontend via CloudFront: https://CLOUDFRONT_DOMAIN
    [ ] Verify DynamoDB connectivity in logs
    [ ] Verify SNS alerts are configured
    [ ] Add test URL via API: curl -X POST http://EC2_IP:30080/api/websites
    [ ] Wait 1 minute and verify monitoring works
    [ ] Check CloudWatch logs for errors
    [ ] Update security group SSH rules (restrict 0.0.0.0/0)
    [ ] Configure CloudFront cache invalidation policy
    [ ] Set up automatic backups for data
    [ ] Monitor EC2 costs and adjust instance size if needed
    
  EOT
}
