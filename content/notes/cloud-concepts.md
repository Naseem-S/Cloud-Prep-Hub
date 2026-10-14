## What is cloud computing?

Cloud computing is the **on-demand delivery of IT resources over the internet with pay-as-you-go pricing**. Instead of buying and running physical servers, you rent compute, storage and databases from a provider such as AWS and use them only when you need them.

### Service models

| Model | You manage | Example |
|---|---|---|
| IaaS (infrastructure) | OS, apps, data | Amazon EC2 |
| PaaS (platform) | Apps and data | AWS Elastic Beanstalk |
| SaaS (software) | Just your data and usage | A hosted email or CRM product |

### Deployment models

- **Cloud-based**: everything runs in the cloud.
- **On-premises (private cloud)**: resources run in your own data centre using virtualisation.
- **Hybrid**: cloud resources connected to on-premises infrastructure.

## The six advantages of cloud computing

1. **Trade fixed expense for variable expense.** Pay only for what you use instead of investing up front.
2. **Benefit from massive economies of scale.** Aggregated usage lets AWS charge lower prices.
3. **Stop guessing capacity.** Scale up or down in minutes instead of over- or under-provisioning.
4. **Increase speed and agility.** New resources are a click away, so teams can experiment faster.
5. **Stop spending money running and maintaining data centres.** Focus on your customers, not racking servers.
6. **Go global in minutes.** Deploy to Regions around the world with a few clicks.

> **Exam tip:** Questions often describe a scenario and ask which advantage it shows. Match the key phrase: "pay only when used" means variable expense, "lower prices because of many customers" means economies of scale.

## Key concepts

- **Elasticity**: automatically scaling resources up and down with demand.
- **Scalability**: the ability to handle growth, by scaling up (bigger resources) or out (more resources).
- **High availability**: the system stays operational with minimal downtime, usually by running across multiple Availability Zones.
- **Fault tolerance**: the system keeps working even when a component fails.
- **Agility**: how fast you can provision resources and try new ideas.

## AWS Well-Architected Framework

Six pillars that describe how to design good cloud workloads:

| Pillar | Focus |
|---|---|
| Operational Excellence | Running and monitoring systems, improving processes, infrastructure as code |
| Security | Protecting data, systems and assets; least privilege; traceability |
| Reliability | Recovering from failure and meeting demand |
| Performance Efficiency | Using resources efficiently as demand and technology change |
| Cost Optimization | Avoiding unnecessary costs |
| Sustainability | Minimising environmental impact |

> **Exam tip:** Remember the pillars with the phrase "**O**ld **S**ailors **R**arely **P**urchase **C**heap **S**hips".

## Migration strategies (the 7 Rs)

| Strategy | What it means |
|---|---|
| Rehost | "Lift and shift" with no changes |
| Replatform | "Lift, tinker and shift": small optimisations, such as moving to Amazon RDS |
| Refactor / re-architect | Redesign using cloud-native features |
| Repurchase | Move to a different product, often SaaS |
| Relocate | Move infrastructure without buying new hardware (for example, VMware Cloud on AWS) |
| Retain | Keep it where it is for now |
| Retire | Switch off applications that are no longer needed |

## AWS Cloud Adoption Framework (AWS CAF)

The CAF helps organisations plan a successful move to the cloud. It groups guidance into **six perspectives**:

- **Business capabilities:** Business, People, Governance
- **Technical capabilities:** Platform, Security, Operations

## Cloud economics

- **Capital expenditure (CapEx):** up-front spending on physical assets, such as servers.
- **Operational expenditure (OpEx):** ongoing, pay-as-you-go spending, which is what the cloud uses.
- **Total cost of ownership (TCO)** includes hidden on-premises costs: power, cooling, space, staff and hardware refreshes.
- **Rightsizing**: matching instance types and sizes to actual workload needs.
