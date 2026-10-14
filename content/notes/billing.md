## EC2 pricing models

| Model | Best for | Savings vs On-Demand |
|---|---|---|
| On-Demand | Short-term, unpredictable workloads | None, but no commitment |
| Savings Plans | Steady usage with a 1- or 3-year $/hour commitment | Large |
| Reserved Instances | Steady usage of a specific instance type for 1 or 3 years | Large |
| Spot Instances | Fault-tolerant jobs that can be interrupted | Largest |
| Dedicated Hosts | Licensing or compliance needs a physical server for you | Most expensive |

> **Exam tip:** "Can be interrupted" means Spot. "Steady, predictable for 1–3 years" means Savings Plans or Reserved Instances. "No commitment, unpredictable" means On-Demand.

## How AWS charges

You generally pay for three things: **compute**, **storage** and **data transfer out**.

- Data transfer **in** from the internet is generally free.
- Data transfer **out** to the internet, and **between Regions**, is usually charged.

## Cost management tools

| Tool | Use it to… |
|---|---|
| AWS Pricing Calculator | Estimate costs **before** you build |
| AWS Cost Explorer | Visualise and analyse **past** costs, and forecast |
| AWS Budgets | Get **alerts** when costs or usage exceed a threshold |
| AWS Cost and Usage Report | Get the most detailed billing data for analysis |
| Cost allocation tags | Track spend by project, team or department |
| AWS Compute Optimizer | Get rightsizing recommendations |

## AWS Organizations

- Manage multiple AWS accounts centrally.
- **Consolidated billing**: one bill for all accounts, with shared volume discounts.
- **Service control policies (SCPs)**: set the maximum permissions for accounts in the organisation.

## Support plans

| Plan | Highlights |
|---|---|
| Basic | Free for everyone: account and billing help, documentation, re:Post, core Trusted Advisor checks |
| Developer | Email access to support engineers during business hours |
| Business | 24/7 phone, chat and email support; full Trusted Advisor checks |
| Enterprise On-Ramp | Faster response for business-critical workloads; access to a pool of Technical Account Managers |
| Enterprise | Fastest response times and a designated Technical Account Manager (TAM) |

AWS reviews its support offerings from time to time, so check the current [AWS Support plans page](https://aws.amazon.com/premiumsupport/plans/) before the exam.

## Other resources

- **AWS Trusted Advisor**: best-practice checks for cost, performance, security, fault tolerance and service limits.
- **AWS Health Dashboard**: alerts about AWS service issues that affect you.
- **AWS Marketplace**: buy third-party software that runs on AWS.
- **AWS re:Post**: community Q&A.
- **AWS Partner Network (APN)**: find consulting and technology partners.
- **AWS Professional Services**: AWS experts who help with your cloud projects.
