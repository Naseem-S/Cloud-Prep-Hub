## The shared responsibility model

Security on AWS is shared between AWS and the customer.

| AWS: security **of** the cloud | Customer: security **in** the cloud |
|---|---|
| Physical data centres | Customer data |
| Hardware and networking | IAM users, groups, roles and permissions |
| Hypervisor and virtualisation | Guest OS patching (on EC2) |
| Global infrastructure (Regions, AZs, edge) | Security groups and firewall configuration |
| Managed service operations | Encryption choices (client and server side) |

The split **shifts with the service**. On Amazon EC2 you patch the operating system. On a managed service like Amazon RDS or AWS Lambda, AWS does more of the work.

> **Exam tip:** If a question mentions physical security, hardware or the hypervisor, the answer is AWS. If it mentions your data, your users or your configuration, it's you.

## Identity and Access Management (IAM)

- **Root user**: created with the account and has full access. Enable **MFA**, don't create access keys for it, and use it only for the few tasks that require it.
- **IAM users**: people or applications with long-term credentials.
- **IAM groups**: collections of users that share permissions.
- **IAM roles**: identities that grant **temporary credentials**. Use them for EC2 instances, Lambda functions and cross-account access.
- **IAM policies**: JSON documents that allow or deny actions on resources.
- **Least privilege**: grant only the permissions needed.
- **IAM Identity Center**: single sign-on (SSO) across multiple AWS accounts.

## Security services at a glance

| Service | What it does |
|---|---|
| AWS Shield | DDoS protection (Standard is free and automatic) |
| AWS WAF | Web application firewall: blocks SQL injection, XSS and bad IPs |
| Amazon GuardDuty | Threat detection from logs |
| Amazon Inspector | Vulnerability scanning for EC2, containers and Lambda |
| Amazon Macie | Finds sensitive data (PII) in S3 |
| Amazon Detective | Investigates the root cause of security findings |
| AWS Security Hub | Central view of security alerts and posture |
| AWS KMS | Creates and manages encryption keys |
| AWS Secrets Manager | Stores and rotates passwords and API keys |
| AWS Certificate Manager | Provisions SSL/TLS certificates |

## Network security

- **Security groups**: stateful firewalls at the **instance** level. They support allow rules only.
- **Network ACLs**: stateless firewalls at the **subnet** level. They support allow and deny rules.

## Logging, auditing and compliance

- **AWS CloudTrail**: logs API calls (who did what, when).
- **AWS Config**: tracks resource configuration changes and checks them against rules.
- **AWS Artifact**: downloads compliance reports such as SOC and ISO.
- **AWS Audit Manager**: continuously collects evidence for audits.

> **Exam tip:** CloudTrail is "who did it", CloudWatch is "how is it performing", and Config is "what changed in the setup".

## Encryption

- **In transit**: data moving across a network, protected with TLS/SSL.
- **At rest**: data in storage, protected with keys managed in AWS KMS.
