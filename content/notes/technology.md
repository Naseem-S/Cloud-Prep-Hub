## Global infrastructure

- **Region**: a geographic area with multiple isolated Availability Zones. Choose one based on **compliance, latency to users, service availability and price**.
- **Availability Zone (AZ)**: one or more discrete data centres with redundant power and networking. Run across **multiple AZs** for high availability.
- **Edge location**: a site that caches content for **Amazon CloudFront** and answers DNS queries for **Route 53**.
- **AWS Local Zones / Wavelength / Outposts**: extend AWS closer to users, to 5G networks or into your own data centre.

## Compute

| Service | Use it when… |
|---|---|
| Amazon EC2 | You need full control of virtual servers |
| EC2 Auto Scaling | You want to add or remove instances automatically |
| AWS Lambda | You want to run code on events without servers |
| Amazon ECS / EKS | You want to run containers (EKS = Kubernetes) |
| AWS Fargate | You want serverless compute for containers |
| AWS Elastic Beanstalk | You want to upload code and let AWS handle deployment |
| Amazon Lightsail | You want simple virtual servers at a fixed monthly price |

## Storage

| Service | Type | Key point |
|---|---|---|
| Amazon S3 | Object | 11 nines durability; buckets; static website hosting |
| Amazon EBS | Block | Attached to one EC2 instance, like a hard drive |
| Amazon EFS | File | Shared file system for many Linux instances |
| Amazon FSx | File | Managed Windows File Server, Lustre and others |
| AWS Storage Gateway | Hybrid | Connects on-premises storage to AWS |
| AWS Snow Family | Physical | Devices that move large amounts of data offline |

**S3 storage classes**, from most to least frequently accessed: Standard, Intelligent-Tiering, Standard-IA, One Zone-IA, Glacier Instant Retrieval, Glacier Flexible Retrieval and Glacier Deep Archive (cheapest).

## Databases

| Service | Type |
|---|---|
| Amazon RDS | Managed relational (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server) |
| Amazon Aurora | AWS-built relational database, compatible with MySQL and PostgreSQL |
| Amazon DynamoDB | Serverless NoSQL key-value |
| Amazon ElastiCache | In-memory cache (Redis, Memcached) |
| Amazon Redshift | Data warehouse for analytics |
| Amazon Neptune | Graph database |
| AWS DMS | Database Migration Service |

## Networking and content delivery

- **Amazon VPC**: your private, isolated network. **Public subnets** route to an **internet gateway**; **private subnets** do not.
- **Amazon Route 53**: DNS and domain registration.
- **Amazon CloudFront**: content delivery network (CDN) using edge locations.
- **Elastic Load Balancing**: spreads traffic across targets.
- **AWS Direct Connect**: a dedicated private connection to AWS.
- **AWS Site-to-Site VPN**: an encrypted connection over the internet.
- **AWS Global Accelerator**: routes users over the AWS global network for better performance.

## Management and developer tools

- **Amazon CloudWatch**: metrics, logs and alarms.
- **AWS CloudFormation**: infrastructure as code.
- **AWS Systems Manager**: manage and patch fleets of instances.
- **AWS CodePipeline / CodeBuild / CodeDeploy**: CI/CD services.
- **AWS CLI and SDKs**: interact with AWS from the terminal or from code.

> **Exam tip:** "Serverless" in a question usually points to Lambda, Fargate, DynamoDB or S3.

## Analytics and AI/ML (awareness level)

- **Amazon Athena**: query data in S3 with SQL.
- **Amazon Kinesis**: process streaming data in real time.
- **Amazon QuickSight**: business intelligence dashboards.
- **Amazon SageMaker AI**: build, train and deploy ML models.
- **Amazon Rekognition / Comprehend / Polly / Lex**: ready-made AI for images, text, speech and chatbots.
