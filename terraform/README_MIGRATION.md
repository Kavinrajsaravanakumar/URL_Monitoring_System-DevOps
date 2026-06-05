# Terraform Migration Guide: Lambda/API Gateway → EC2/K3s

## Migration Summary

This Terraform configuration has been migrated from a **serverless Lambda + API Gateway** architecture to an **EC2 + Kubernetes (K3s)** architecture.

## Architecture Changes

### BEFORE (Removed)

```
Users
  ↓
CloudFront
  ├─ Origin 1: S3 (static)
  └─ Origin 2: API Gateway
        ↓
    Lambda Functions (6 total)
        ↓
    EventBridge Scheduler (1 minute)
        ↓
    DynamoDB + SNS
```

**Components Deleted:**

- `aws_lambda_function` (6 functions)
- `aws_apigatewayv2_*` (API Gateway v2)
- `aws_cloudwatch_event_*` (EventBridge)
- Lambda IAM role + policies
- Lambda build artifacts

### AFTER (Current)

```
Users
  ↓
CloudFront
  ↓
S3 (static frontend only)

EC2 Instance (Ubuntu 22.04, t3.micro)
  ├─ Docker
  ├─ K3s Kubernetes
  └─ Node.js Express Application
        ├─ REST API (/api/*)
        ├─ node-cron monitoring
        ├─ Health check (/health)
        └─ Static file serving (fallback)
              ↓
        DynamoDB (reused)
              ↓
        SNS Topic (reused)
```

**Components Added:**

- `aws_instance` (EC2 - Ubuntu 22.04)
- `aws_security_group` (with SSH, HTTP, HTTPS rules)
- `aws_iam_role` + `aws_iam_policy` (EC2 permissions)
- `aws_iam_instance_profile` (bind role to EC2)
- `aws_eip` (Elastic IP for static public IP)
- `aws_cloudwatch_log_group` (application + system logs)

**Components Modified:**

- CloudFront distribution (only S3 origin, no API Gateway)
- Variables (added EC2-related variables)
- Outputs (updated for EC2 info)

## File Structure

```
terraform/
├── provider.tf                 # AWS provider configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── dynamodb-data.tf          # DynamoDB data sources (existing tables)
├── sns-data.tf               # SNS data source (existing topic)
├── s3.tf                      # S3 bucket for static frontend
├── cloudfront.tf              # CloudFront distribution
├── ec2.tf                     # EC2 instance configuration
├── iam.tf                     # IAM role + policies for EC2
├── security-group.tf          # Security group rules
├── user-data.sh              # EC2 initialization script
├── main.tf                    # (Placeholder - see modular files above)
└── variables-new.tf          # (Can be deleted - merged into variables.tf)
```

## Key Variables

### Required

- `sns_topic_arn` - ARN of existing SNS topic

### Optional (with defaults)

- `aws_region` - AWS region (default: us-east-1)
- `environment` - Environment name (default: dev)
- `ec2_instance_type` - Instance type (default: t3.micro)
- `ec2_ssh_key_name` - EC2 Key Pair name for SSH
- `ec2_ssh_cidr_blocks` - CIDR blocks for SSH (default: 0.0.0.0/0 - RESTRICT!)
- `urls_table_name` - DynamoDB URLs table (default: URLs)
- `results_table_name` - DynamoDB results table (default: MonitoringResults)
- `sns_topic_name` - SNS topic name (default: url-monitor-alerts)

## Deployment Instructions

### 1. Prerequisites

```bash
# Ensure AWS credentials are configured
aws sts get-caller-identity

# Verify existing resources exist
aws dynamodb describe-table --table-name URLs --region us-east-1
aws dynamodb describe-table --table-name MonitoringResults --region us-east-1
aws sns list-topics --region us-east-1
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Validate Configuration

```bash
terraform validate
```

### 4. Create Plan

```bash
terraform plan \
  -var="sns_topic_arn=arn:aws:sns:us-east-1:123456789012:url-monitor-alerts" \
  -var="ec2_ssh_key_name=my-key-pair" \
  -out=tfplan
```

### 5. Apply Changes

```bash
terraform apply tfplan
```

### 6. Monitor Deployment

```bash
# Get EC2 public IP
terraform output ec2_public_ip

# SSH into instance
ssh -i /path/to/key.pem ubuntu@<PUBLIC_IP>

# Check K3s status (wait 2-3 minutes)
kubectl get nodes
kubectl get pods -n urlms
kubectl logs -n urlms -f deployment/urlms-app

# Check application
curl http://<PUBLIC_IP>:3000/health
```

## Key Outputs

After deployment, Terraform provides:

- `cloudfront_url` - HTTPS URL to frontend
- `ec2_public_ip` - Public IP of EC2 instance
- `ec2_public_dns` - Public DNS name of EC2
- `dynamodb_urls_table_arn` - ARN of URLs table
- `dynamodb_results_table_arn` - ARN of results table
- `sns_topic_arn` - ARN of SNS topic
- `connection_instructions` - How to connect to resources

## Post-Deployment Checklist

- [ ] EC2 instance is running
- [ ] K3s cluster is initialized
- [ ] Application pod is running
- [ ] CloudFront distribution is active
- [ ] S3 bucket is properly configured
- [ ] DynamoDB connectivity verified in logs
- [ ] SNS alerts are configured
- [ ] Application health check responds (curl /health)
- [ ] Frontend loads via CloudFront
- [ ] Test API endpoints work
- [ ] URL monitoring runs every 1 minute (check via cron logs)
- [ ] CloudWatch logs show application output
- [ ] Security group SSH is restricted (update from 0.0.0.0/0)

## Common Commands

```bash
# Check Terraform state
terraform state list
terraform state show aws_instance.app_server

# Destroy all resources
terraform destroy

# Update variables
terraform apply -var="ec2_instance_type=t3.small"

# View specific output
terraform output ec2_public_ip
terraform output cloudfront_url

# Refresh state
terraform refresh

# Format Terraform code
terraform fmt -recursive
```

## Troubleshooting

### EC2 not reaching DynamoDB

1. Check IAM role: `aws iam get-role --role-name urlms-${environment}-ec2-role`
2. Check security group: `aws ec2 describe-security-groups --group-ids <SG_ID>`
3. Verify DynamoDB table exists: `aws dynamodb describe-table --table-name URLs`

### K3s not starting

1. SSH into EC2 and check: `sudo systemctl status k3s`
2. View logs: `sudo journalctl -u k3s -f`
3. Check available disk space: `df -h`

### Pod not running

```bash
# Check pod status
kubectl get pods -n urlms -o wide

# Describe pod
kubectl describe pod -n urlms <POD_NAME>

# View pod logs
kubectl logs -n urlms <POD_NAME>

# Check events
kubectl get events -n urlms
```

### Application not accessible

1. Verify security group allows ports 80, 443, 3000
2. Check if app is listening: `ssh -i key.pem ubuntu@IP "netstat -tuln | grep 3000"`
3. Test locally: `curl http://<IP>:3000/health`
4. Check CloudWatch logs: `/urlms/${environment}/application`

## Cost Estimation

| Component           | Type      | Monthly Cost |
| ------------------- | --------- | ------------ |
| EC2 t3.micro        | Compute   | ~$7.50       |
| S3                  | Storage   | ~$0.50       |
| DynamoDB (existing) | Database  | (existing)   |
| SNS (existing)      | Messaging | (existing)   |
| CloudFront          | CDN       | ~$1-5        |
| CloudWatch Logs     | Logging   | ~$0.50-1     |
| **Total**           |           | **~$10-15**  |

## Security Recommendations

1. **Restrict SSH Access** - Update `ec2_ssh_cidr_blocks` to your IP/VPN

   ```bash
   terraform apply -var="ec2_ssh_cidr_blocks=[\"YOUR_IP/32\"]"
   ```

2. **Enable VPC Flow Logs** - Monitor traffic to EC2

3. **Use IAM Roles** - EC2 already uses IAM role (no hardcoded credentials)

4. **Enable EBS Encryption** - Root volume is already encrypted

5. **Regular Backups** - Implement DynamoDB point-in-time recovery

6. **Enable CloudTrail** - Audit AWS API calls

7. **Use Custom Domain** - Add ACM certificate to CloudFront

## Next Steps

1. Deploy infrastructure using instructions above
2. SSH into EC2 and verify everything is working
3. Add first monitored URL via API
4. Verify email alerts are received
5. Monitor CloudWatch metrics
6. Set up auto-scaling or backups (future enhancement)
7. Configure custom domain with CloudFront (optional)
8. Implement CI/CD pipeline (Jenkins/GitHub Actions) for future deployments

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EC2 Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-best-practices.html)
- [K3s Documentation](https://docs.k3s.io/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
