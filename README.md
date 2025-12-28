## Serverless Blog Platform (AWS)

This project is a serverless web platform built on AWS, designed to demonstrate scalable frontend delivery, backend API architecture, and CI/CD automation using modern cloud best practices.


![Serverless Blog Architecture](https://github.com/TempleInCloud/cloud-with-temple/blob/94650b461ecda1a568747794676ede9fdf3b557d/severless%20blog.drawio%20(1).png)



## Frontend Architecture (Live)

The frontend is a static web application hosted on AWS and globally distributed.

## Services Used:

**Amazon S3** – Hosts the static frontend (index.html)

**Amazon CloudFront** – Global CDN for fast, secure delivery

**GitHub Actions** – CI/CD pipeline for automated deployment

## Flow:

1. User accesses the site via CloudFront
2. CloudFront fetches content from S3
3. Static assets are cached and delivered globally
4. On updates, CloudFront cache is invalidated automatically

## Backend Architecture (Designed & Provisioned)

The backend is designed to support dynamic blog content and admin operations using a fully serverless model.

## Services:

**Amazon API Gateway** – REST API layer

**AWS Lambda** – Serverless business logic

**Amazon DynamoDB** – NoSQL database for storing blog posts

**AWS IAM** – Secure role-based permissions

## Intended Flow:

1. Frontend sends HTTP requests to API Gateway
2. API Gateway routes requests to Lambda functions
3. Lambda performs read/write operations on DynamoDB
4. Responses are returned to the frontend

Backend services are provisioned and tested independently and are currently being integrated into the frontend.

## CI/CD Pipeline (Implemented)

This project includes an automated deployment pipeline using GitHub Actions.

## Pipeline Steps:

1. Code is pushed to the main branch
2. GitHub Actions workflow is triggered
3. AWS credentials are loaded securely from GitHub Secrets
4. Frontend files are synced to S3
5. CloudFront cache is invalidated to reflect changes instantly
   
## Technologies:

* GitHub Actions
* AWS CLI
* S3 sync
* CloudFront invalidation

## Security & Access Control

* AWS credentials are stored securely using GitHub Repository Secrets
* IAM roles follow least privilege access
* CloudFront restricts direct S3 access
* No secrets are exposed in the repository

## Project Roadmap

* Static frontend deployment (S3 + CloudFront)
* CI/CD pipeline with GitHub Actions
* Secure AWS credential management
* CloudFront cache invalidation
* Frontend → API Gateway integration
* Lambda-based blog APIs
* DynamoDB-backed content storage
* Admin management endpoints

This project demonstrates how to design, deploy, and evolve a full-stack serverless architecture using AWS, following production-grade practices and incremental delivery.

## 🚀 Live Demo
**Live URL:** https://d8r65ba7hgqkb.cloudfront.net/

## Domain Page





