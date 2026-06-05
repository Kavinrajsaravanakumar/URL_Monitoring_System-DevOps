# ─────────────────────────────────────────────────────────────
# CloudFront Distribution for Static Frontend
# ─────────────────────────────────────────────────────────────
# CDN for S3 frontend assets
# API calls go directly to EC2 (not through CloudFront)
# ─────────────────────────────────────────────────────────────

# Origin Access Control - Allows CloudFront to access S3 privately
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "urlms-${var.environment}-s3-oac"
  description                       = "CloudFront Origin Access Control for S3 static hosting"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true

  # Origin: S3 Bucket (Frontend Static Assets)
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3Frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # Default Cache Behavior: Serve HTML/CSS/JS from S3
  default_cache_behavior {
    allowed_methods      = ["GET", "HEAD"]
    cached_methods       = ["GET", "HEAD"]
    target_origin_id     = "S3Frontend"
    compress             = true
    viewer_protocol_policy = "redirect-to-https"

    # Cache policy for static assets
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized

    # Optional: Security headers
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Restrictions - No geographical restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Viewer Certificate - Use CloudFront default certificate (*.cloudfront.net)
  # To use a custom domain, provide an ACM certificate ARN
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "urlms-frontend-distribution"
  }

  depends_on = [aws_s3_bucket_policy.frontend_cf_policy]
}

# CloudFront Response Headers Policy - Add security headers
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "urlms-${var.environment}-security-headers"
  comment = "Security headers for URLMS frontend"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      override                   = true
    }

    x_content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      protection = true
      override   = true
    }
  }
}
