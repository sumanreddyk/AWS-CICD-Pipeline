import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import kms = require('@aws-cdk/aws-kms');
import * as lambda from '@aws-cdk/aws-lambda'; 
import { App, Stack, StackProps, RemovalPolicy, CfnOutput} from '@aws-cdk/core';


export interface LambdaDeploymentPipelineStackProps extends StackProps {
   stageName: string;
}

export class LambdaDeploymentPipelineStack extends Stack{
   //lambdaCode: lambda.CfnParametersCode;

  constructor(app: App, id: string, props: LambdaDeploymentPipelineStackProps) {

    super(app, id, props);
  
    const lambda_deployment_repository = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepo', "Lambda-deployment");
    
    const key = new kms.Key(this, 'LambdaDeployment-ArtifactKey', {
      alias: 'key/lambda-deployment-artifact-key',
    });

    const lambdaDep_artifactBucket = new s3.Bucket(this, 'LambdaArtifactBucket', {
      bucketName: 'lambda-deploy-artifactory',
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key
    });
    
    const LambdaDeployment_cdk = new codebuild.PipelineProject(this, 'LambdaDeploymentBuild-Cdk', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'pwd',
              'ls -ltr',
              'npm install'
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist',
              'pwd',
              'ls -ltr',
              'cd dist',
              'ls -ltr'

            ],
          }
        },
        artifacts: {
          'base-directory': 'dist',
          files: [
            "*",
            '*.template.json', 'manifest.json',
            "bin/*", "lib/*",
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2,
      },
      encryptionKey: key
    });
    
    const LambdaDeployment_Code = new codebuild.PipelineProject(this, 'LambdaDeploymentBuild-Code', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'pwd',
              'ls -ltr',
              'yum -y install unzip',
              'yum -y install java-1.8.0-amazon-corretto',
              'yum -y install java-1.8.0-amazon-corretto-devel',
              'npm install'
            ],
          },
          build: {
            commands: [
              'npm run build',
              //'cd lambda-1',
              //'cd ebus',
              'cd lambdas'

            ],
          },
          post_build: {
            commands: [
              'pwd',
              'ls -ltr',
              'aws --version',
              'java --version',
              'echo Updating function code...',
              /*'aws lambda update-function-code --function-name DevApplicationDeploymentStack-LambdaD247545B-R5SFLQFMASH6 --zip-file fileb://./lambda.zip',
              'unzip lambda.zip',
              'rm -rf lambda.zip'*/
              //'aws lambda update-function-code --function-name DevApplicationDeploymentStack-LambdaD247545B-R5SFLQFMASH6 --zip-file fileb://./ebus-integrator-1.0.0.jar',
              //'java -jar ebus-integrator-1.0.0.jar',
              //'rm -rf ebus-integrator-1.0.0.jar'
              'aws lambda update-function-code --function-name DevApplicationDeploymentStack-LambdaD247545B-R5SFLQFMASH6 --zip-file fileb://./lambda-0.1.jar',

            ]
          }
        },
        artifacts: {
          'base-directory': 'lambdas',
          files: [
            "*/**",
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2,
      },
      encryptionKey: key
    });

    const cdkSourceOutput = new codepipeline.Artifact();
    const cdkLambdaDeployBuildOutput = new codepipeline.Artifact('cdkLambdaDeployBuildOutput');
    const codeLambdaDeployBuildOutput = new codepipeline.Artifact('codeLambdaDeployBuildOutput');

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'lambda-deployment-pipeline',
      artifactBucket: lambdaDep_artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              repository: lambda_deployment_repository,
              output: cdkSourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Build',
              project: LambdaDeployment_cdk,
              input: cdkSourceOutput,
              outputs: [cdkLambdaDeployBuildOutput],
            }),
           new codepipeline_actions.CodeBuildAction({
              actionName: 'AppCode_Build',
              project: LambdaDeployment_Code,
              input: cdkSourceOutput,
              outputs: [codeLambdaDeployBuildOutput],
            })
          ],
        },
        {
          stageName: 'CDK_Deploy',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'CDKDeploy',
              templatePath: cdkLambdaDeployBuildOutput.atPath('LambdaDeploymentStackApplication.template.json'),
              stackName: 'DevApplicationDeploymentStack',
              adminPermissions: true,
              /*parameterOverrides:{
                [artifactBucket.bucketName]: cdkBuildOutput.bucketName,
                [artifactBucket.bucketName]: cdkBuildOutput.objectKey,
                [artifactBucket.bucketName]: "1"
              },*/
              /*parameterOverrides:{
                ...props.lambdaCode.assign(codeLambdaDeployBuildOutput.s3Location)
              }*/
              parameterOverrides:{
                LambdaLambdaSourceBucketNameParameter159473FC: codeLambdaDeployBuildOutput.bucketName,
                LambdaLambdaSourceObjectKeyParameter06573F1D: codeLambdaDeployBuildOutput.objectKey
              },
             extraInputs: [
              codeLambdaDeployBuildOutput,
              ]
              
            })
          ],
        },
      ],
    });

    new CfnOutput(this, 'ArtifactBucketEncryptionKeyArn', {
      value: key.keyArn,
      exportName: 'ArtifactBucketEncryptionKey'
    });

  }
}