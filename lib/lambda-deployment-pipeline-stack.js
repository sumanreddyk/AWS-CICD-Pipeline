"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codebuild = require("@aws-cdk/aws-codebuild");
const codecommit = require("@aws-cdk/aws-codecommit");
const codepipeline = require("@aws-cdk/aws-codepipeline");
const codepipeline_actions = require("@aws-cdk/aws-codepipeline-actions");
const s3 = require("@aws-cdk/aws-s3");
const kms = require("@aws-cdk/aws-kms");
const core_1 = require("@aws-cdk/core");
class LambdaDeploymentPipelineStack extends core_1.Stack {
    //lambdaCode: lambda.CfnParametersCode;
    constructor(app, id, props) {
        super(app, id, props);
        const lambda_deployment_repository = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepo', "Lambda-deployment");
        const key = new kms.Key(this, 'LambdaDeployment-ArtifactKey', {
            alias: 'key/lambda-deployment-artifact-key',
        });
        const lambdaDep_artifactBucket = new s3.Bucket(this, 'LambdaArtifactBucket', {
            bucketName: 'lambda-deploy-artifactory',
            removalPolicy: core_1.RemovalPolicy.DESTROY,
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
                            parameterOverrides: {
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
        new core_1.CfnOutput(this, 'ArtifactBucketEncryptionKeyArn', {
            value: key.keyArn,
            exportName: 'ArtifactBucketEncryptionKey'
        });
    }
}
exports.LambdaDeploymentPipelineStack = LambdaDeploymentPipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWRlcGxveW1lbnQtcGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtZGVwbG95bWVudC1waXBlbGluZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG9EQUFxRDtBQUNyRCxzREFBdUQ7QUFDdkQsMERBQTJEO0FBQzNELDBFQUEyRTtBQUMzRSxzQ0FBdUM7QUFFdkMsd0NBQXlDO0FBRXpDLHdDQUFnRjtBQU9oRixNQUFhLDZCQUE4QixTQUFRLFlBQUs7SUFDckQsdUNBQXVDO0lBRXhDLFlBQVksR0FBUSxFQUFFLEVBQVUsRUFBRSxLQUF5QztRQUV6RSxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV0QixNQUFNLDRCQUE0QixHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFM0gsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSw4QkFBOEIsRUFBRTtZQUM1RCxLQUFLLEVBQUUsb0NBQW9DO1NBQzVDLENBQUMsQ0FBQztRQUVILE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUMzRSxVQUFVLEVBQUUsMkJBQTJCO1lBQ3ZDLGFBQWEsRUFBRSxvQkFBYSxDQUFDLE9BQU87WUFDcEMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHO1lBQ25DLGFBQWEsRUFBRSxHQUFHO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUM1RixTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7Z0JBQ3hDLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRTtvQkFDTixPQUFPLEVBQUU7d0JBQ1AsUUFBUSxFQUFFOzRCQUNSLEtBQUs7NEJBQ0wsU0FBUzs0QkFDVCxhQUFhO3lCQUNkO3FCQUNGO29CQUNELEtBQUssRUFBRTt3QkFDTCxRQUFRLEVBQUU7NEJBQ1IsZUFBZTs0QkFDZiw4QkFBOEI7NEJBQzlCLEtBQUs7NEJBQ0wsU0FBUzs0QkFDVCxTQUFTOzRCQUNULFNBQVM7eUJBRVY7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULGdCQUFnQixFQUFFLE1BQU07b0JBQ3hCLEtBQUssRUFBRTt3QkFDTCxHQUFHO3dCQUNILGlCQUFpQixFQUFFLGVBQWU7d0JBQ2xDLE9BQU8sRUFBRSxPQUFPO3FCQUNqQjtpQkFDRjthQUNGLENBQUM7WUFDRixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLFNBQVMsQ0FBQyxlQUFlLENBQUMsY0FBYzthQUNyRDtZQUNELGFBQWEsRUFBRSxHQUFHO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUM5RixTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7Z0JBQ3hDLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRTtvQkFDTixPQUFPLEVBQUU7d0JBQ1AsUUFBUSxFQUFFOzRCQUNSLEtBQUs7NEJBQ0wsU0FBUzs0QkFDVCxzQkFBc0I7NEJBQ3RCLDJDQUEyQzs0QkFDM0MsaURBQWlEOzRCQUNqRCxhQUFhO3lCQUNkO3FCQUNGO29CQUNELEtBQUssRUFBRTt3QkFDTCxRQUFRLEVBQUU7NEJBQ1IsZUFBZTs0QkFDZixnQkFBZ0I7NEJBQ2hCLFlBQVk7NEJBQ1osWUFBWTt5QkFFYjtxQkFDRjtvQkFDRCxVQUFVLEVBQUU7d0JBQ1YsUUFBUSxFQUFFOzRCQUNSLEtBQUs7NEJBQ0wsU0FBUzs0QkFDVCxlQUFlOzRCQUNmLGdCQUFnQjs0QkFDaEIsZ0NBQWdDOzRCQUNoQzs7aURBRXFCOzRCQUNyQiw2SkFBNko7NEJBQzdKLHdDQUF3Qzs0QkFDeEMsb0NBQW9DOzRCQUNwQywrSUFBK0k7eUJBRWhKO3FCQUNGO2lCQUNGO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxnQkFBZ0IsRUFBRSxTQUFTO29CQUMzQixLQUFLLEVBQUU7d0JBQ0wsTUFBTTtxQkFDUDtpQkFDRjthQUNGLENBQUM7WUFDRixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLFNBQVMsQ0FBQyxlQUFlLENBQUMsY0FBYzthQUNyRDtZQUNELGFBQWEsRUFBRSxHQUFHO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0sZUFBZSxHQUFHLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3BELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDM0YsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUU3RixNQUFNLFFBQVEsR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUMzRCxZQUFZLEVBQUUsNEJBQTRCO1lBQzFDLGNBQWMsRUFBRSx3QkFBd0I7WUFDeEMsTUFBTSxFQUFFO2dCQUNOO29CQUNFLFNBQVMsRUFBRSxRQUFRO29CQUNuQixPQUFPLEVBQUU7d0JBQ1AsSUFBSSxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQzs0QkFDOUMsVUFBVSxFQUFFLG1CQUFtQjs0QkFDL0IsVUFBVSxFQUFFLDRCQUE0Qjs0QkFDeEMsTUFBTSxFQUFFLGVBQWU7eUJBQ3hCLENBQUM7cUJBQ0g7aUJBQ0Y7Z0JBQ0Q7b0JBQ0UsU0FBUyxFQUFFLE9BQU87b0JBQ2xCLE9BQU8sRUFBRTt3QkFDUCxJQUFJLG9CQUFvQixDQUFDLGVBQWUsQ0FBQzs0QkFDdkMsVUFBVSxFQUFFLFdBQVc7NEJBQ3ZCLE9BQU8sRUFBRSxvQkFBb0I7NEJBQzdCLEtBQUssRUFBRSxlQUFlOzRCQUN0QixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQzt5QkFDdEMsQ0FBQzt3QkFDSCxJQUFJLG9CQUFvQixDQUFDLGVBQWUsQ0FBQzs0QkFDdEMsVUFBVSxFQUFFLGVBQWU7NEJBQzNCLE9BQU8sRUFBRSxxQkFBcUI7NEJBQzlCLEtBQUssRUFBRSxlQUFlOzRCQUN0QixPQUFPLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQzt5QkFDdkMsQ0FBQztxQkFDSDtpQkFDRjtnQkFDRDtvQkFDRSxTQUFTLEVBQUUsWUFBWTtvQkFDdkIsT0FBTyxFQUFFO3dCQUNQLElBQUksb0JBQW9CLENBQUMscUNBQXFDLENBQUM7NEJBQzdELFVBQVUsRUFBRSxXQUFXOzRCQUN2QixZQUFZLEVBQUUsMEJBQTBCLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxDQUFDOzRCQUNqRyxTQUFTLEVBQUUsK0JBQStCOzRCQUMxQyxnQkFBZ0IsRUFBRSxJQUFJOzRCQUN0Qjs7OztnQ0FJSTs0QkFDSjs7K0JBRUc7NEJBQ0gsa0JBQWtCLEVBQUM7Z0NBQ2pCLDZDQUE2QyxFQUFFLDJCQUEyQixDQUFDLFVBQVU7Z0NBQ3JGLDRDQUE0QyxFQUFFLDJCQUEyQixDQUFDLFNBQVM7NkJBQ3BGOzRCQUNGLFdBQVcsRUFBRTtnQ0FDWiwyQkFBMkI7NkJBQzFCO3lCQUVGLENBQUM7cUJBQ0g7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUksZ0JBQVMsQ0FBQyxJQUFJLEVBQUUsZ0NBQWdDLEVBQUU7WUFDcEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNO1lBQ2pCLFVBQVUsRUFBRSw2QkFBNkI7U0FDMUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUNGO0FBdkxELHNFQXVMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb2RlYnVpbGQgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtY29kZWJ1aWxkJyk7XG5pbXBvcnQgY29kZWNvbW1pdCA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1jb2RlY29tbWl0Jyk7XG5pbXBvcnQgY29kZXBpcGVsaW5lID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWNvZGVwaXBlbGluZScpO1xuaW1wb3J0IGNvZGVwaXBlbGluZV9hY3Rpb25zID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWNvZGVwaXBlbGluZS1hY3Rpb25zJyk7XG5pbXBvcnQgczMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMnKTtcbmltcG9ydCBpYW0gPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtaWFtJyk7XG5pbXBvcnQga21zID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWttcycpO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnOyBcbmltcG9ydCB7IEFwcCwgU3RhY2ssIFN0YWNrUHJvcHMsIFJlbW92YWxQb2xpY3ksIENmbk91dHB1dH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFEZXBsb3ltZW50UGlwZWxpbmVTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gICBzdGFnZU5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYURlcGxveW1lbnRQaXBlbGluZVN0YWNrIGV4dGVuZHMgU3RhY2t7XG4gICAvL2xhbWJkYUNvZGU6IGxhbWJkYS5DZm5QYXJhbWV0ZXJzQ29kZTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYURlcGxveW1lbnRQaXBlbGluZVN0YWNrUHJvcHMpIHtcblxuICAgIHN1cGVyKGFwcCwgaWQsIHByb3BzKTtcbiAgXG4gICAgY29uc3QgbGFtYmRhX2RlcGxveW1lbnRfcmVwb3NpdG9yeSA9IGNvZGVjb21taXQuUmVwb3NpdG9yeS5mcm9tUmVwb3NpdG9yeU5hbWUodGhpcywgJ0NvZGVDb21taXRSZXBvJywgXCJMYW1iZGEtZGVwbG95bWVudFwiKTtcbiAgICBcbiAgICBjb25zdCBrZXkgPSBuZXcga21zLktleSh0aGlzLCAnTGFtYmRhRGVwbG95bWVudC1BcnRpZmFjdEtleScsIHtcbiAgICAgIGFsaWFzOiAna2V5L2xhbWJkYS1kZXBsb3ltZW50LWFydGlmYWN0LWtleScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBsYW1iZGFEZXBfYXJ0aWZhY3RCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdMYW1iZGFBcnRpZmFjdEJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6ICdsYW1iZGEtZGVwbG95LWFydGlmYWN0b3J5JyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxuICAgICAgZW5jcnlwdGlvbktleToga2V5XG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgTGFtYmRhRGVwbG95bWVudF9jZGsgPSBuZXcgY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCh0aGlzLCAnTGFtYmRhRGVwbG95bWVudEJ1aWxkLUNkaycsIHtcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tT2JqZWN0KHtcbiAgICAgICAgdmVyc2lvbjogJzAuMicsXG4gICAgICAgIHBoYXNlczoge1xuICAgICAgICAgIGluc3RhbGw6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgICdwd2QnLFxuICAgICAgICAgICAgICAnbHMgLWx0cicsXG4gICAgICAgICAgICAgICducG0gaW5zdGFsbCdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgY29tbWFuZHM6IFtcbiAgICAgICAgICAgICAgJ25wbSBydW4gYnVpbGQnLFxuICAgICAgICAgICAgICAnbnBtIHJ1biBjZGsgc3ludGggLS0gLW8gZGlzdCcsXG4gICAgICAgICAgICAgICdwd2QnLFxuICAgICAgICAgICAgICAnbHMgLWx0cicsXG4gICAgICAgICAgICAgICdjZCBkaXN0JyxcbiAgICAgICAgICAgICAgJ2xzIC1sdHInXG5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICAnYmFzZS1kaXJlY3RvcnknOiAnZGlzdCcsXG4gICAgICAgICAgZmlsZXM6IFtcbiAgICAgICAgICAgIFwiKlwiLFxuICAgICAgICAgICAgJyoudGVtcGxhdGUuanNvbicsICdtYW5pZmVzdC5qc29uJyxcbiAgICAgICAgICAgIFwiYmluLypcIiwgXCJsaWIvKlwiLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuQU1BWk9OX0xJTlVYXzIsXG4gICAgICB9LFxuICAgICAgZW5jcnlwdGlvbktleToga2V5XG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgTGFtYmRhRGVwbG95bWVudF9Db2RlID0gbmV3IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3QodGhpcywgJ0xhbWJkYURlcGxveW1lbnRCdWlsZC1Db2RlJywge1xuICAgICAgYnVpbGRTcGVjOiBjb2RlYnVpbGQuQnVpbGRTcGVjLmZyb21PYmplY3Qoe1xuICAgICAgICB2ZXJzaW9uOiAnMC4yJyxcbiAgICAgICAgcGhhc2VzOiB7XG4gICAgICAgICAgaW5zdGFsbDoge1xuICAgICAgICAgICAgY29tbWFuZHM6IFtcbiAgICAgICAgICAgICAgJ3B3ZCcsXG4gICAgICAgICAgICAgICdscyAtbHRyJyxcbiAgICAgICAgICAgICAgJ3l1bSAteSBpbnN0YWxsIHVuemlwJyxcbiAgICAgICAgICAgICAgJ3l1bSAteSBpbnN0YWxsIGphdmEtMS44LjAtYW1hem9uLWNvcnJldHRvJyxcbiAgICAgICAgICAgICAgJ3l1bSAteSBpbnN0YWxsIGphdmEtMS44LjAtYW1hem9uLWNvcnJldHRvLWRldmVsJyxcbiAgICAgICAgICAgICAgJ25wbSBpbnN0YWxsJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAnbnBtIHJ1biBidWlsZCcsXG4gICAgICAgICAgICAgIC8vJ2NkIGxhbWJkYS0xJyxcbiAgICAgICAgICAgICAgLy8nY2QgZWJ1cycsXG4gICAgICAgICAgICAgICdjZCBsYW1iZGFzJ1xuXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcG9zdF9idWlsZDoge1xuICAgICAgICAgICAgY29tbWFuZHM6IFtcbiAgICAgICAgICAgICAgJ3B3ZCcsXG4gICAgICAgICAgICAgICdscyAtbHRyJyxcbiAgICAgICAgICAgICAgJ2F3cyAtLXZlcnNpb24nLFxuICAgICAgICAgICAgICAnamF2YSAtLXZlcnNpb24nLFxuICAgICAgICAgICAgICAnZWNobyBVcGRhdGluZyBmdW5jdGlvbiBjb2RlLi4uJyxcbiAgICAgICAgICAgICAgLyonYXdzIGxhbWJkYSB1cGRhdGUtZnVuY3Rpb24tY29kZSAtLWZ1bmN0aW9uLW5hbWUgRGV2QXBwbGljYXRpb25EZXBsb3ltZW50U3RhY2stTGFtYmRhRDI0NzU0NUItUjVTRkxRRk1BU0g2IC0temlwLWZpbGUgZmlsZWI6Ly8uL2xhbWJkYS56aXAnLFxuICAgICAgICAgICAgICAndW56aXAgbGFtYmRhLnppcCcsXG4gICAgICAgICAgICAgICdybSAtcmYgbGFtYmRhLnppcCcqL1xuICAgICAgICAgICAgICAvLydhd3MgbGFtYmRhIHVwZGF0ZS1mdW5jdGlvbi1jb2RlIC0tZnVuY3Rpb24tbmFtZSBEZXZBcHBsaWNhdGlvbkRlcGxveW1lbnRTdGFjay1MYW1iZGFEMjQ3NTQ1Qi1SNVNGTFFGTUFTSDYgLS16aXAtZmlsZSBmaWxlYjovLy4vZWJ1cy1pbnRlZ3JhdG9yLTEuMC4wLmphcicsXG4gICAgICAgICAgICAgIC8vJ2phdmEgLWphciBlYnVzLWludGVncmF0b3ItMS4wLjAuamFyJyxcbiAgICAgICAgICAgICAgLy8ncm0gLXJmIGVidXMtaW50ZWdyYXRvci0xLjAuMC5qYXInXG4gICAgICAgICAgICAgICdhd3MgbGFtYmRhIHVwZGF0ZS1mdW5jdGlvbi1jb2RlIC0tZnVuY3Rpb24tbmFtZSBEZXZBcHBsaWNhdGlvbkRlcGxveW1lbnRTdGFjay1MYW1iZGFEMjQ3NTQ1Qi1SNVNGTFFGTUFTSDYgLS16aXAtZmlsZSBmaWxlYjovLy4vbGFtYmRhLTAuMS5qYXInLFxuXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICAnYmFzZS1kaXJlY3RvcnknOiAnbGFtYmRhcycsXG4gICAgICAgICAgZmlsZXM6IFtcbiAgICAgICAgICAgIFwiKi8qKlwiLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuQU1BWk9OX0xJTlVYXzIsXG4gICAgICB9LFxuICAgICAgZW5jcnlwdGlvbktleToga2V5XG4gICAgfSk7XG5cbiAgICBjb25zdCBjZGtTb3VyY2VPdXRwdXQgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCk7XG4gICAgY29uc3QgY2RrTGFtYmRhRGVwbG95QnVpbGRPdXRwdXQgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCdjZGtMYW1iZGFEZXBsb3lCdWlsZE91dHB1dCcpO1xuICAgIGNvbnN0IGNvZGVMYW1iZGFEZXBsb3lCdWlsZE91dHB1dCA9IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoJ2NvZGVMYW1iZGFEZXBsb3lCdWlsZE91dHB1dCcpO1xuXG4gICAgY29uc3QgcGlwZWxpbmUgPSBuZXcgY29kZXBpcGVsaW5lLlBpcGVsaW5lKHRoaXMsICdQaXBlbGluZScsIHtcbiAgICAgIHBpcGVsaW5lTmFtZTogJ2xhbWJkYS1kZXBsb3ltZW50LXBpcGVsaW5lJyxcbiAgICAgIGFydGlmYWN0QnVja2V0OiBsYW1iZGFEZXBfYXJ0aWZhY3RCdWNrZXQsXG4gICAgICBzdGFnZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YWdlTmFtZTogJ1NvdXJjZScsXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVDb21taXRTb3VyY2VBY3Rpb24oe1xuICAgICAgICAgICAgICBhY3Rpb25OYW1lOiAnQ29kZUNvbW1pdF9Tb3VyY2UnLFxuICAgICAgICAgICAgICByZXBvc2l0b3J5OiBsYW1iZGFfZGVwbG95bWVudF9yZXBvc2l0b3J5LFxuICAgICAgICAgICAgICBvdXRwdXQ6IGNka1NvdXJjZU91dHB1dCxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGFnZU5hbWU6ICdCdWlsZCcsXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVCdWlsZEFjdGlvbih7XG4gICAgICAgICAgICAgIGFjdGlvbk5hbWU6ICdDREtfQnVpbGQnLFxuICAgICAgICAgICAgICBwcm9qZWN0OiBMYW1iZGFEZXBsb3ltZW50X2NkayxcbiAgICAgICAgICAgICAgaW5wdXQ6IGNka1NvdXJjZU91dHB1dCxcbiAgICAgICAgICAgICAgb3V0cHV0czogW2Nka0xhbWJkYURlcGxveUJ1aWxkT3V0cHV0XSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuQ29kZUJ1aWxkQWN0aW9uKHtcbiAgICAgICAgICAgICAgYWN0aW9uTmFtZTogJ0FwcENvZGVfQnVpbGQnLFxuICAgICAgICAgICAgICBwcm9qZWN0OiBMYW1iZGFEZXBsb3ltZW50X0NvZGUsXG4gICAgICAgICAgICAgIGlucHV0OiBjZGtTb3VyY2VPdXRwdXQsXG4gICAgICAgICAgICAgIG91dHB1dHM6IFtjb2RlTGFtYmRhRGVwbG95QnVpbGRPdXRwdXRdLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhZ2VOYW1lOiAnQ0RLX0RlcGxveScsXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNsb3VkRm9ybWF0aW9uQ3JlYXRlVXBkYXRlU3RhY2tBY3Rpb24oe1xuICAgICAgICAgICAgICBhY3Rpb25OYW1lOiAnQ0RLRGVwbG95JyxcbiAgICAgICAgICAgICAgdGVtcGxhdGVQYXRoOiBjZGtMYW1iZGFEZXBsb3lCdWlsZE91dHB1dC5hdFBhdGgoJ0xhbWJkYURlcGxveW1lbnRTdGFja0FwcGxpY2F0aW9uLnRlbXBsYXRlLmpzb24nKSxcbiAgICAgICAgICAgICAgc3RhY2tOYW1lOiAnRGV2QXBwbGljYXRpb25EZXBsb3ltZW50U3RhY2snLFxuICAgICAgICAgICAgICBhZG1pblBlcm1pc3Npb25zOiB0cnVlLFxuICAgICAgICAgICAgICAvKnBhcmFtZXRlck92ZXJyaWRlczp7XG4gICAgICAgICAgICAgICAgW2FydGlmYWN0QnVja2V0LmJ1Y2tldE5hbWVdOiBjZGtCdWlsZE91dHB1dC5idWNrZXROYW1lLFxuICAgICAgICAgICAgICAgIFthcnRpZmFjdEJ1Y2tldC5idWNrZXROYW1lXTogY2RrQnVpbGRPdXRwdXQub2JqZWN0S2V5LFxuICAgICAgICAgICAgICAgIFthcnRpZmFjdEJ1Y2tldC5idWNrZXROYW1lXTogXCIxXCJcbiAgICAgICAgICAgICAgfSwqL1xuICAgICAgICAgICAgICAvKnBhcmFtZXRlck92ZXJyaWRlczp7XG4gICAgICAgICAgICAgICAgLi4ucHJvcHMubGFtYmRhQ29kZS5hc3NpZ24oY29kZUxhbWJkYURlcGxveUJ1aWxkT3V0cHV0LnMzTG9jYXRpb24pXG4gICAgICAgICAgICAgIH0qL1xuICAgICAgICAgICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6e1xuICAgICAgICAgICAgICAgIExhbWJkYUxhbWJkYVNvdXJjZUJ1Y2tldE5hbWVQYXJhbWV0ZXIxNTk0NzNGQzogY29kZUxhbWJkYURlcGxveUJ1aWxkT3V0cHV0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICAgICAgTGFtYmRhTGFtYmRhU291cmNlT2JqZWN0S2V5UGFyYW1ldGVyMDY1NzNGMUQ6IGNvZGVMYW1iZGFEZXBsb3lCdWlsZE91dHB1dC5vYmplY3RLZXlcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBleHRyYUlucHV0czogW1xuICAgICAgICAgICAgICBjb2RlTGFtYmRhRGVwbG95QnVpbGRPdXRwdXQsXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnQXJ0aWZhY3RCdWNrZXRFbmNyeXB0aW9uS2V5QXJuJywge1xuICAgICAgdmFsdWU6IGtleS5rZXlBcm4sXG4gICAgICBleHBvcnROYW1lOiAnQXJ0aWZhY3RCdWNrZXRFbmNyeXB0aW9uS2V5J1xuICAgIH0pO1xuXG4gIH1cbn0iXX0=