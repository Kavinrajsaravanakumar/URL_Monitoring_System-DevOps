# ─────────────────────────────────────────────────────────────
# IAM Role and Policy for EC2 Application Server
# ─────────────────────────────────────────────────────────────
# Allows EC2 instance to access DynamoDB, SNS, and CloudWatch
# ─────────────────────────────────────────────────────────────

# IAM Role for EC2 instance
resource "aws_iam_role" "ec2_role" {
  name               = "urlms-${var.environment}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "urlms-ec2-role"
  }
}

# IAM Policy for DynamoDB, SNS, and CloudWatch access
resource "aws_iam_policy" "ec2_policy" {
  name        = "urlms-${var.environment}-ec2-policy"
  description = "Permissions for URLMS EC2 instance to access DynamoDB, SNS, and CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB Permissions
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          data.aws_dynamodb_table.urls.arn,
          data.aws_dynamodb_table.results.arn
        ]
      },
      # SNS Permissions
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          data.aws_sns_topic.alerts.arn
        ]
      },
      # CloudWatch Logs Permissions
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/urlms/*"
      },
      # CloudWatch Metrics
      {
        Sid    = "CloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      # EC2 Tags (for managing instances via tags)
      {
        Sid    = "EC2Tags"
        Effect = "Allow"
        Action = [
          "ec2:DescribeTags",
          "ec2:DescribeInstances"
        ]
        Resource = "*"
      },
      # Allow reading SSM parameters (optional, for configuration management)
      {
        Sid    = "SSMParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/urlms/${var.environment}/*"
      }
    ]
  })

  tags = {
    Name = "urlms-ec2-policy"
  }
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "ec2_policy_attachment" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_policy.arn
}

# Instance Profile to attach role to EC2 instance
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "urlms-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}
