#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { App, CfnParameter } from '@aws-cdk/core';
import { LambdaDeploymentPipelineStack } from '../lib/lambda-deployment-pipeline-stack';
import { StaticWebUIPipelineStack } from '../lib/static-webUi-pipeline-stack';
import { RepositoryStack } from '../lib/repository-stack';
import { Code } from '@aws-cdk/aws-lambda';

const app = new App();
const prodAccountId = '145674177909';

new RepositoryStack(app, 'LambdaDeployment-repository-stack',{
  repoName: 'Lambda-deployment', 
  repositoryDescription: 'Testing lambda Deployment using CDK Pipeline'
});

new RepositoryStack(app, 'StaticWebUI-repository-stack',{
  repoName: 'StaticWebUI', 
  repositoryDescription: 'Testing Static Web application Deployment using CDK Pipeline'
});

// codepipeline
/*const paramCode = Code.fromCfnParameters({
  bucketNameParam: new CfnParameter(this, 'lambda-versioning-bucket'),
  objectKeyParam: new cdk.CfnParameter(this, 'CodeBucketObjectKey'),
})*/
new LambdaDeploymentPipelineStack(app, 'testing-lambdadeployment-CICDPipelineStack',{
  stageName:"dev"
});

new StaticWebUIPipelineStack(app, 'testing-staticWebUI-CICDPipelineStack',{
  stageName:"dev"
});
