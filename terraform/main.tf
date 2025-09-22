# Terraform конфигурация для Oracle Cloud Free Tier
# Создает VPS с Ubuntu 22.04 для TURN-сервера

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

# Конфигурация провайдера OCI
provider "oci" {
  region = var.region
}

# Переменные
variable "region" {
  description = "Oracle Cloud регион"
  type        = string
  default     = "us-ashburn-1"
}

variable "compartment_id" {
  description = "OCID компартмента (получите из Oracle Cloud Console)"
  type        = string
}

variable "availability_domain" {
  description = "Домен доступности (например: us-ashburn-1)"
  type        = string
  default     = "us-ashburn-1"
}

# VCN (Virtual Cloud Network)
resource "oci_core_vcn" "turn_vcn" {
  compartment_id = var.compartment_id
  display_name   = "turn-server-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "turnvcn"
}

# Internet Gateway
resource "oci_core_internet_gateway" "turn_igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.turn_vcn.id
  display_name   = "turn-internet-gateway"
}

# Route Table
resource "oci_core_route_table" "turn_route_table" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.turn_vcn.id
  display_name   = "turn-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.turn_igw.id
  }
}

# Security List для TURN-сервера
resource "oci_core_security_list" "turn_security_list" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.turn_vcn.id
  display_name   = "turn-security-list"

  # SSH (порт 22)
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 22
      max = 22
    }
  }

  # TURN UDP (порт 3478)
  ingress_security_rules {
    protocol  = "17"
    source    = "0.0.0.0/0"
    stateless = false
    udp_options {
      min = 3478
      max = 3478
    }
  }

  # TURN TLS (порт 5349)
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 5349
      max = 5349
    }
  }

  # HTTPS (порт 443)
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 443
      max = 443
    }
  }

  # HTTP (порт 80)
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 80
      max = 80
    }
  }

  # Исходящий трафик
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
    stateless   = false
  }
}

# Subnet
resource "oci_core_subnet" "turn_subnet" {
  compartment_id      = var.compartment_id
  vcn_id              = oci_core_vcn.turn_vcn.id
  display_name        = "turn-subnet"
  cidr_block          = "10.0.1.0/24"
  availability_domain = var.availability_domain
  route_table_id      = oci_core_route_table.turn_route_table.id
  security_list_ids   = [oci_core_security_list.turn_security_list.id]
  dns_label           = "turnsubnet"
}

# Получаем образ Ubuntu 22.04
data "oci_core_images" "ubuntu_images" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.E2.1.Micro"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# SSH ключ (создайте заранее)
resource "tls_private_key" "turn_ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Сохраняем приватный ключ
resource "local_file" "turn_private_key" {
  content  = tls_private_key.turn_ssh_key.private_key_pem
  filename = "turn-server-key.pem"
  file_permission = "0600"
}

# Сохраняем публичный ключ
resource "local_file" "turn_public_key" {
  content  = tls_private_key.turn_ssh_key.public_key_openssh
  filename = "turn-server-key.pub"
}

# Compute Instance
resource "oci_core_instance" "turn_instance" {
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  display_name        = "turn-server"
  shape               = "VM.Standard.E2.1.Micro"

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_images.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.turn_subnet.id
    display_name     = "turn-server-vnic"
    assign_public_ip = true
    hostname_label   = "turn-server"
  }

  metadata = {
    ssh_authorized_keys = tls_private_key.turn_ssh_key.public_key_openssh
    user_data = base64encode(<<-EOF
      #!/bin/bash
      apt update
      apt install -y curl
      echo "TURN Server ready for setup" > /home/ubuntu/ready.txt
    EOF
    )
  }

  agent_config {
    is_management_disabled = false
    is_monitoring_disabled = false
  }
}

# Выводы
output "instance_public_ip" {
  description = "Публичный IP адрес TURN-сервера"
  value       = oci_core_instance.turn_instance.public_ip
}

output "instance_private_ip" {
  description = "Приватный IP адрес TURN-сервера"
  value       = oci_core_instance.turn_instance.private_ip
}

output "ssh_connection" {
  description = "Команда для подключения по SSH"
  value       = "ssh -i turn-server-key.pem ubuntu@${oci_core_instance.turn_instance.public_ip}"
}

output "turn_server_info" {
  description = "Информация о TURN-сервере"
  value = {
    public_ip = oci_core_instance.turn_instance.public_ip
    turn_port = "3478"
    tls_port  = "5349"
    username  = "webrtc"
    password  = "strongpassword"
    realm     = "myturn.local"
  }
}


