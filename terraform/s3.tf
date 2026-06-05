# ─────────────────────────────────────────────────────────────
# S3 Bucket for Static Frontend
# ─────────────────────────────────────────────────────────────
# Hosts the static website files (HTML, CSS, JS)
# Access controlled via CloudFront OAC (Origin Access Control)
# ─────────────────────────────────────────────────────────────

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.s3_bucket_prefix}-${var.environment}-frontend-${random_id.bucket_suffix.hex}"
  force_destroy = true

  tags = {
    Name        = "urlms-frontend-${var.environment}"
    Description = "Static website files for URLMS dashboard"
  }
}

# Block all public access (access via CloudFront only)
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy: Allow CloudFront to access objects via OAC
resource "aws_s3_bucket_policy" "frontend_cf_policy" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# ─────────────────────────────────────────────────────────────
# S3 Objects - Frontend Static Assets
# ─────────────────────────────────────────────────────────────

resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "index.html"
  source       = "${path.module}/../public/index.html"
  content_type = "text/html"
  etag         = filemd5("${path.module}/../public/index.html")

  tags = {
    Name = "index.html"
  }
}

resource "aws_s3_object" "style" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "css/style.css"
  source       = "${path.module}/../public/css/style.css"
  content_type = "text/css"
  etag         = filemd5("${path.module}/../public/css/style.css")

  tags = {
    Name = "style.css"
  }
}

resource "aws_s3_object" "app" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "js/app.js"
  source       = "${path.module}/../public/js/app.js"
  content_type = "application/javascript"
  etag         = filemd5("${path.module}/../public/js/app.js")

  tags = {
    Name = "app.js"
  }
}
