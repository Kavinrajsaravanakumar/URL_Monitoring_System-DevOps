# ─────────────────────────────────────────────────────────────
# Security Group for EC2 Application Server
# ─────────────────────────────────────────────────────────────
# Controls inbound and outbound traffic to EC2 instance
# ─────────────────────────────────────────────────────────────

resource "aws_security_group" "ec2_app" {
  name        = "urlms-${var.environment}-ec2-sg"
  description = "Security group for URLMS Node.js Express application on EC2"

  tags = {
    Name = "urlms-ec2-sg"
  }
}

# Inbound: SSH (Port 22)
resource "aws_security_group_rule" "ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.ec2_ssh_cidr_blocks
  security_group_id = aws_security_group.ec2_app.id
  description       = "SSH access from specified CIDR blocks"
}

# Inbound: HTTP (Port 80)
resource "aws_security_group_rule" "http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ec2_app.id
  description       = "HTTP access from anywhere"
}

# Inbound: HTTPS (Port 443)
resource "aws_security_group_rule" "https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ec2_app.id
  description       = "HTTPS access from anywhere"
}

# Inbound: K3s NodePort (Port 30080)
resource "aws_security_group_rule" "app_port" {
  type              = "ingress"
  from_port         = 30080
  to_port           = 30080
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ec2_app.id
  description       = "K3s NodePort for URLMS application"
}

# Outbound: Allow all traffic
resource "aws_security_group_rule" "egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ec2_app.id
  description       = "Allow all outbound traffic"
}
