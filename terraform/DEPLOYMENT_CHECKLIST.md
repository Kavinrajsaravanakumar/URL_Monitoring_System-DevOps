# URLMS Terraform Migration Checklist

## Pre-Deployment Verification

### AWS Account Preparation

- [ ] Verify AWS account access and permissions
- [ ] Confirm IAM user has necessary permissions:
  - [ ] EC2 (create instance, security groups, EIP)
  - [ ] IAM (create roles, policies, instance profiles)
  - [ ] DynamoDB (read existing tables)
  - [ ] SNS (read existing topic)
  - [ ] S3 (create bucket, manage objects)
  - [ ] CloudFront (create distribution)
  - [ ] CloudWatch (create log groups)

### Resource Verification

- [ ] Verify DynamoDB table exists: **URLs**
- [ ] Verify DynamoDB table exists: **MonitoringResults**
- [ ] Verify SNS topic exists: **url-monitor-alerts**
- [ ] Note SNS topic ARN: `arn:aws:sns:REGION:ACCOUNT:url-monitor-alerts`
- [ ] Create EC2 Key Pair (or use existing)
- [ ] Note Key Pair name: `_________________`

### Code Preparation

- [ ] Back up existing Terraform state (if any)
- [ ] Review all Terraform files in `terraform/` directory
- [ ] Ensure Git repository is clean (all changes committed)
- [ ] Create new branch for this deployment: `terraform-ec2-migration`

### Terraform Configuration

- [ ] Copy `terraform.tfvars.example` to `terraform.tfvars`
- [ ] Update `terraform.tfvars` with actual values:
  - [ ] `aws_region` = ********\_********
  - [ ] `environment` = ********\_********
  - [ ] `ec2_instance_type` = t3.micro (or approved type)
  - [ ] `ec2_ssh_key_name` = ********\_********
  - [ ] `ec2_ssh_cidr_blocks` = ["YOUR_IP/32"] (NOT 0.0.0.0/0 in production)
  - [ ] `sns_topic_arn` = ********\_********
- [ ] DO NOT commit `terraform.tfvars` to Git

## Terraform Execution Phase

### Initialize

```bash
cd terraform
terraform init
```

- [ ] Terraform initialized successfully
- [ ] State backend configured (local or remote)
- [ ] AWS provider downloaded

### Validate

```bash
terraform validate
```

- [ ] All configuration files are valid
- [ ] No syntax errors reported

### Plan

```bash
terraform plan -out=tfplan
```

- [ ] Plan shows expected resource creation (EC2, IAM, Security Group, etc.)
- [ ] No unexpected resource deletions
- [ ] Verify DynamoDB/SNS data sources are recognized
- [ ] Review resource count and names

**Expected Resources:**

- [ ] `aws_instance.app_server` (EC2 instance)
- [ ] `aws_eip.app_server_ip` (Elastic IP)
- [ ] `aws_security_group.ec2_app` (Security Group)
- [ ] `aws_iam_role.ec2_role` (IAM Role)
- [ ] `aws_iam_policy.ec2_policy` (IAM Policy)
- [ ] `aws_iam_instance_profile.ec2_profile` (Instance Profile)
- [ ] `aws_s3_bucket.frontend` (S3 Bucket)
- [ ] `aws_cloudfront_distribution.frontend` (CloudFront)
- [ ] `aws_cloudwatch_log_group.app_logs` (Log Group)
- [ ] `aws_cloudwatch_log_group.system_logs` (Log Group)

### Apply

```bash
terraform apply tfplan
```

- [ ] All resources created successfully
- [ ] No errors in apply operation
- [ ] State file updated
- [ ] Outputs displayed (copy for reference)

## Post-Deployment Verification

### AWS Console Verification

- [ ] EC2 instance is running (check AWS Console → EC2)
- [ ] Instance has public IP assigned
- [ ] Security group is attached
- [ ] IAM role is attached
- [ ] Elastic IP is associated
- [ ] S3 bucket created with correct name
- [ ] CloudFront distribution is active
- [ ] CloudWatch log groups created

### EC2 Instance Initialization

```bash
# Get EC2 public IP from Terraform output
EC2_IP=$(terraform output -raw ec2_public_ip)

# Wait for initialization (2-3 minutes)
sleep 180

# SSH into instance
ssh -i /path/to/key.pem ubuntu@${EC2_IP}
```

- [ ] SSH connection successful
- [ ] Instance is fully booted (check: `uptime`)

### Docker Verification (on EC2)

```bash
docker --version
docker ps
docker images
```

- [ ] Docker is installed
- [ ] No images yet (will be built later)

### K3s Verification (on EC2)

```bash
sudo systemctl status k3s
kubectl cluster-info
kubectl get nodes
```

- [ ] K3s service is running
- [ ] Cluster info shows healthy control plane
- [ ] Node is Ready status

### Application Initialization (on EC2)

```bash
kubectl get pods -n urlms
kubectl get deployment -n urlms
kubectl get service -n urlms
```

- [ ] urlms-app pod is running (may take 1-2 minutes)
- [ ] Deployment shows 1/1 replicas ready
- [ ] Service is created with NodePort

### Application Health Check (on EC2)

```bash
curl http://localhost:3000/health
```

- [ ] HTTP 200 response
- [ ] Health status is OK

### DynamoDB Connectivity (on EC2)

```bash
kubectl logs -n urlms -l app=urlms | grep -i "dynamo"
```

- [ ] No connection errors in logs
- [ ] Tables URLs and MonitoringResults are accessible

### SNS Configuration (on EC2)

```bash
kubectl logs -n urlms -l app=urlms | grep -i "sns"
```

- [ ] SNS topic ARN is configured
- [ ] No authentication errors in logs

### CloudFront & S3 Verification

```bash
# From local machine
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
curl -I ${CLOUDFRONT_URL}
curl ${CLOUDFRONT_URL}
```

- [ ] CloudFront URL responds with HTTP 200
- [ ] index.html is served from S3
- [ ] CSS and JS files load without errors
- [ ] No CORS errors in browser console

### Application API Testing

```bash
# From local machine
EC2_IP=$(terraform output -raw ec2_public_ip)

# Test health endpoint
curl http://${EC2_IP}:3000/health

# List websites (should be empty initially)
curl http://${EC2_IP}:3000/api/websites

# Create test website
curl -X POST http://${EC2_IP}:3000/api/websites \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "name": "Example"}'

# Wait 1 minute and check if monitoring ran
sleep 60
curl http://${EC2_IP}:3000/api/websites
```

- [ ] Health endpoint returns 200
- [ ] GET /api/websites returns empty array initially
- [ ] POST creates website successfully
- [ ] Website appears in GET response
- [ ] Monitoring runs every minute (check timestamps)

### Monitoring & Logs

```bash
# Check application logs
kubectl logs -n urlms -f deployment/urlms-app

# Check system logs (on EC2)
sudo journalctl -u k3s -f

# Check CloudWatch logs (from local machine)
aws logs tail /urlms/dev/application --follow
aws logs tail /urlms/dev/system --follow
```

- [ ] Application logs show startup messages
- [ ] K3s logs show healthy status
- [ ] CloudWatch logs contain application output
- [ ] No error messages in logs

### Security Group Verification

```bash
# Check security group rules
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_id)
```

- [ ] SSH rule exists (port 22)
- [ ] HTTP rule exists (port 80)
- [ ] HTTPS rule exists (port 443)
- [ ] Application rule exists (port 3000)
- [ ] All egress is allowed

### IAM Role Verification

```bash
# Check IAM role permissions
aws iam get-role --role-name urlms-dev-ec2-role

# List attached policies
aws iam list-attached-role-policies --role-name urlms-dev-ec2-role
```

- [ ] Role exists with correct name
- [ ] Policy is attached
- [ ] Policy contains DynamoDB, SNS, CloudWatch permissions

## Post-Deployment Configuration

### Restrict SSH Access (IMPORTANT)

```bash
# Get your current public IP
curl https://checkip.amazonaws.com/

# Update security group
terraform apply -var="ec2_ssh_cidr_blocks=[\"YOUR_IP/32\"]"
```

- [ ] SSH CIDR blocks restricted to your IP/VPN
- [ ] NOT 0.0.0.0/0 in production

### Set Up Monitoring

- [ ] Create CloudWatch dashboard:
  - [ ] EC2 CPU usage
  - [ ] EC2 network throughput
  - [ ] Application health check
  - [ ] DynamoDB read/write units
  - [ ] SNS publish count
- [ ] Set up CloudWatch alarms:
  - [ ] EC2 high CPU (> 80%)
  - [ ] EC2 unhealthy status check
  - [ ] DynamoDB throttling
  - [ ] Application error rate

### Configure Auto-Scaling (Optional)

- [ ] Consider EC2 Auto Scaling Group if production
- [ ] Consider ELB/NLB for load balancing

### Set Up Backups (Optional)

- [ ] Enable DynamoDB point-in-time recovery
- [ ] Configure S3 bucket versioning
- [ ] Set up S3 lifecycle policies

### Configure Custom Domain (Optional)

- [ ] Register domain (Route 53, external registrar)
- [ ] Create ACM certificate
- [ ] Update CloudFront distribution with custom domain
- [ ] Update DNS records

## Testing Checklist

### Functional Testing

- [ ] Add multiple URLs to monitor
- [ ] Verify monitoring runs every 1 minute
- [ ] Check website status (UP/DOWN/SLOW)
- [ ] Verify email alerts are sent for status changes
- [ ] Test delete website functionality
- [ ] Test statistics page loads
- [ ] Test history view works

### Performance Testing

- [ ] Response time for GET /api/websites < 500ms
- [ ] Response time for POST /api/websites < 500ms
- [ ] CloudFront cache hit ratio > 90%
- [ ] EC2 CPU usage < 20% under load

### Security Testing

- [ ] Verify HTTPS works via CloudFront
- [ ] Verify HTTP redirects to HTTPS (if configured)
- [ ] Test SQL injection attempts (should be safe)
- [ ] Verify DynamoDB doesn't expose sensitive data
- [ ] Check AWS IAM role follows least privilege

### Disaster Recovery Testing

- [ ] Terminate EC2 and verify Terraform can recreate
- [ ] Delete S3 bucket and verify Terraform can recreate
- [ ] Verify DynamoDB data persists
- [ ] Verify SNS configuration persists

## Troubleshooting During Deployment

### Terraform Plan/Apply Errors

| Error                    | Solution                                            |
| ------------------------ | --------------------------------------------------- |
| SNS topic not found      | Verify `sns_topic_arn` in variables                 |
| DynamoDB table not found | Check table names match existing tables             |
| EC2 Key Pair not found   | Create key pair in EC2 console first                |
| Permission denied        | Verify IAM user has required permissions            |
| Region error             | Check `aws_region` variable matches resource region |

### EC2 Initialization Issues

| Issue                   | Solution                                          |
| ----------------------- | ------------------------------------------------- |
| User data script fails  | SSH in and check `/var/log/cloud-init-output.log` |
| Docker doesn't start    | Run `sudo systemctl start docker`                 |
| K3s doesn't start       | Run `sudo systemctl start k3s`                    |
| Insufficient disk space | Check `df -h`, may need larger instance           |

### Kubernetes Issues

| Issue                  | Solution                                        |
| ---------------------- | ----------------------------------------------- |
| Pod not starting       | `kubectl describe pod -n urlms POD_NAME`        |
| Pod image not found    | Ensure Docker image built before K3s deployment |
| Pod stuck in CrashLoop | Check logs: `kubectl logs -n urlms POD_NAME`    |
| Service not accessible | Verify NodePort service created                 |

### Application Issues

| Issue                         | Solution                                             |
| ----------------------------- | ---------------------------------------------------- |
| App won't connect to DynamoDB | Check IAM role has permissions, check security group |
| SNS alerts not sending        | Verify topic ARN is correct, check IAM policy        |
| CloudFront not serving S3     | Check S3 bucket policy, verify OAC configuration     |

## Rollback Procedure

If deployment encounters critical issues:

```bash
# 1. Get current state
terraform state show

# 2. Plan destroy (to verify)
terraform plan -destroy

# 3. Destroy all resources
terraform destroy

# 4. Fix issues
# - Update variables
# - Fix code
# - etc.

# 5. Redeploy
terraform apply
```

- [ ] All resources destroyed
- [ ] Verified in AWS console (no orphaned resources)
- [ ] Issues identified and fixed
- [ ] Ready for fresh deployment

## Cleanup Checklist

After successful deployment:

- [ ] Update project README with new deployment info
- [ ] Update Jenkins/CI-CD pipeline for Terraform deployment
- [ ] Delete old serverless.yml (no longer needed)
- [ ] Delete old lambda.zip files
- [ ] Archive old Terraform configuration if needed
- [ ] Commit changes to Git
- [ ] Tag release: `v1.0.0-ec2-migration`
- [ ] Document deployment in wiki/confluence
- [ ] Create runbooks for:
  - [ ] How to scale EC2 instance
  - [ ] How to update application
  - [ ] How to restart services
  - [ ] How to view logs
  - [ ] How to add new monitored URLs

## Sign-Off

- [ ] Project Lead approval
- [ ] Security team approval
- [ ] Operations team approval

Deployment completed by: ********\_******** Date: ****\_****

## References

- Terraform docs: https://www.terraform.io/docs
- AWS docs: https://docs.aws.amazon.com
- K3s docs: https://docs.k3s.io
- Kubernetes docs: https://kubernetes.io/docs
