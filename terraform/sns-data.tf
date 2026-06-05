# ─────────────────────────────────────────────────────────────
# SNS Topic - Data Source (Reusing Existing Topic)
# ─────────────────────────────────────────────────────────────
# This data source references an existing SNS topic
# that is configured for email alerts
# ─────────────────────────────────────────────────────────────

data "aws_sns_topic" "alerts" {
  name = var.sns_topic_name
}
