# ─────────────────────────────────────────────────────────────
# DynamoDB Tables - Data Sources (Reusing Existing Tables)
# ─────────────────────────────────────────────────────────────
# These data sources reference existing DynamoDB tables
# managed outside of this Terraform module
# ─────────────────────────────────────────────────────────────

data "aws_dynamodb_table" "urls" {
  name = var.urls_table_name
}

data "aws_dynamodb_table" "results" {
  name = var.results_table_name
}
