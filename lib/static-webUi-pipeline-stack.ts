// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import cloudformation = require('@aws-cdk/aws-cloudformation');
import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import kms = require('@aws-cdk/aws-kms');
import * as lambda from '@aws-cdk/aws-lambda'; 
import { App, Stack, StackProps, RemovalPolicy, CfnOutput, ConstructNode, Construct,  } from '@aws-cdk/core';


export interface StaticWebUIPipelineStackProps extends StackProps {
   stageName: string;
}

export class StaticWebUIPipelineStack extends Stack{
  //readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: App, id: string, props: StaticWebUIPipelineStackProps) {

    super(app, id, props);

    const staticWebUi_repository = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepo', "StaticWebUI");
    const staticWebUi_repository_url = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepoUrl', "StaticWebUI").repositoryCloneUrlHttp;
    const key = new kms.Key(this, 'StaticWeb-ArtifactKey', {
      alias: 'key/static-web-artifact-key',
    });

    const artifactBucket = new s3.Bucket(this, 'StaticArtifactBucket', {
      bucketName: 'static-web-ui-artifact',
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key
    });
    
    const StaticWebUiBuild = new codebuild.PipelineProject(this, 'StaticWebUiBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
             // `git clone ${staticWebUi_repository_url}`,
              //'cd StaticWebUI',
              'npm install'
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist'
            ],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: [
            "*",
            '*ApplicationStack.template.json', 'manifest.json',
            "bin/*", "lib/*", "example-build/*"
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2,
      },
      encryptionKey: key
    });

    const sourceOutput = new codepipeline.Artifact();
    const staticWebUIBuildOutput = new codepipeline.Artifact('StaticWebUIBuildOutput');

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'static-webUi-pipeline',
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              repository: staticWebUi_repository,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Application_Build',
              project: StaticWebUiBuild,
              input: sourceOutput,
              outputs: [staticWebUIBuildOutput],
            })
          ],
        },
        {
          stageName: 'Deploy_cdk_Dev',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy',
              templatePath: staticWebUIBuildOutput.atPath('StaticWebUiApplicationStack.template.json'),
              stackName: 'StaticWebUiApplicationStack',
              adminPermissions: true,
              /*parameterOverrides:{
                [artifactBucket.bucketName]: cdkBuildOutput.bucketName,
                [artifactBucket.bucketName]: cdkBuildOutput.objectKey,
                [artifactBucket.bucketName]: "1"
              },
              parameterOverrides:{
                ...this.lambdaCode.assign(staticWebUIBuildOutput.s3Location)
              }*/
              
            })
          ],
        }
      ],
    });

    new CfnOutput(this, 'ArtifactBucketEncryptionKeyArn', {
      value: key.keyArn,
      exportName: 'StaticWeb-ArtifactBucket-EncryptionKey'
    });

  }
}