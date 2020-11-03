"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
Object.defineProperty(exports, "__esModule", { value: true });
const codebuild = require("@aws-cdk/aws-codebuild");
const codecommit = require("@aws-cdk/aws-codecommit");
const codepipeline = require("@aws-cdk/aws-codepipeline");
const codepipeline_actions = require("@aws-cdk/aws-codepipeline-actions");
const s3 = require("@aws-cdk/aws-s3");
const kms = require("@aws-cdk/aws-kms");
const core_1 = require("@aws-cdk/core");
class StaticWebUIPipelineStack extends core_1.Stack {
    //readonly lambdaCode: lambda.CfnParametersCode;
    constructor(app, id, props) {
        super(app, id, props);
        const staticWebUi_repository = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepo', "StaticWebUI");
        const staticWebUi_repository_url = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepoUrl', "StaticWebUI").repositoryCloneUrlHttp;
        const key = new kms.Key(this, 'StaticWeb-ArtifactKey', {
            alias: 'key/static-web-artifact-key',
        });
        const artifactBucket = new s3.Bucket(this, 'StaticArtifactBucket', {
            bucketName: 'static-web-ui-artifact',
            removalPolicy: core_1.RemovalPolicy.DESTROY,
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
                        })
                    ],
                }
            ],
        });
        new core_1.CfnOutput(this, 'ArtifactBucketEncryptionKeyArn', {
            value: key.keyArn,
            exportName: 'StaticWeb-ArtifactBucket-EncryptionKey'
        });
    }
}
exports.StaticWebUIPipelineStack = StaticWebUIPipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljLXdlYlVpLXBpcGVsaW5lLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdGljLXdlYlVpLXBpcGVsaW5lLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxRUFBcUU7QUFDckUsaUNBQWlDOztBQUdqQyxvREFBcUQ7QUFDckQsc0RBQXVEO0FBQ3ZELDBEQUEyRDtBQUMzRCwwRUFBMkU7QUFDM0Usc0NBQXVDO0FBRXZDLHdDQUF5QztBQUV6Qyx3Q0FBNkc7QUFPN0csTUFBYSx3QkFBeUIsU0FBUSxZQUFLO0lBQ2pELGdEQUFnRDtJQUVoRCxZQUFZLEdBQVEsRUFBRSxFQUFVLEVBQUUsS0FBb0M7UUFFcEUsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEIsTUFBTSxzQkFBc0IsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRyxNQUFNLDBCQUEwQixHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO1FBQzdJLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDckQsS0FBSyxFQUFFLDZCQUE2QjtTQUNyQyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ2pFLFVBQVUsRUFBRSx3QkFBd0I7WUFDcEMsYUFBYSxFQUFFLG9CQUFhLENBQUMsT0FBTztZQUNwQyxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUc7WUFDbkMsYUFBYSxFQUFFLEdBQUc7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQy9FLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQztnQkFDeEMsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRTt3QkFDUCxRQUFRLEVBQUU7NEJBQ1QsNkNBQTZDOzRCQUM1QyxtQkFBbUI7NEJBQ25CLGFBQWE7eUJBQ2Q7cUJBQ0Y7b0JBQ0QsS0FBSyxFQUFFO3dCQUNMLFFBQVEsRUFBRTs0QkFDUixlQUFlOzRCQUNmLDhCQUE4Qjt5QkFDL0I7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULGdCQUFnQixFQUFFLE1BQU07b0JBQ3hCLEtBQUssRUFBRTt3QkFDTCxHQUFHO3dCQUNILGlDQUFpQyxFQUFFLGVBQWU7d0JBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCO3FCQUNwQztpQkFDRjthQUNGLENBQUM7WUFDRixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLFNBQVMsQ0FBQyxlQUFlLENBQUMsY0FBYzthQUNyRDtZQUNELGFBQWEsRUFBRSxHQUFHO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFbkYsTUFBTSxRQUFRLEdBQUcsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDM0QsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxjQUFjLEVBQUUsY0FBYztZQUM5QixNQUFNLEVBQUU7Z0JBQ047b0JBQ0UsU0FBUyxFQUFFLFFBQVE7b0JBQ25CLE9BQU8sRUFBRTt3QkFDUCxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDOzRCQUM5QyxVQUFVLEVBQUUsbUJBQW1COzRCQUMvQixVQUFVLEVBQUUsc0JBQXNCOzRCQUNsQyxNQUFNLEVBQUUsWUFBWTt5QkFDckIsQ0FBQztxQkFDSDtpQkFDRjtnQkFDRDtvQkFDRSxTQUFTLEVBQUUsT0FBTztvQkFDbEIsT0FBTyxFQUFFO3dCQUNQLElBQUksb0JBQW9CLENBQUMsZUFBZSxDQUFDOzRCQUN2QyxVQUFVLEVBQUUsbUJBQW1COzRCQUMvQixPQUFPLEVBQUUsZ0JBQWdCOzRCQUN6QixLQUFLLEVBQUUsWUFBWTs0QkFDbkIsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQUM7eUJBQ2xDLENBQUM7cUJBQ0g7aUJBQ0Y7Z0JBQ0Q7b0JBQ0UsU0FBUyxFQUFFLGdCQUFnQjtvQkFDM0IsT0FBTyxFQUFFO3dCQUNQLElBQUksb0JBQW9CLENBQUMscUNBQXFDLENBQUM7NEJBQzdELFVBQVUsRUFBRSxRQUFROzRCQUNwQixZQUFZLEVBQUUsc0JBQXNCLENBQUMsTUFBTSxDQUFDLDJDQUEyQyxDQUFDOzRCQUN4RixTQUFTLEVBQUUsNkJBQTZCOzRCQUN4QyxnQkFBZ0IsRUFBRSxJQUFJO3lCQVV2QixDQUFDO3FCQUNIO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsSUFBSSxFQUFFLGdDQUFnQyxFQUFFO1lBQ3BELEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTTtZQUNqQixVQUFVLEVBQUUsd0NBQXdDO1NBQ3JELENBQUMsQ0FBQztJQUVMLENBQUM7Q0FDRjtBQTlHRCw0REE4R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVQtMFxuXG5pbXBvcnQgY2xvdWRmb3JtYXRpb24gPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtY2xvdWRmb3JtYXRpb24nKTtcbmltcG9ydCBjb2RlYnVpbGQgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtY29kZWJ1aWxkJyk7XG5pbXBvcnQgY29kZWNvbW1pdCA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1jb2RlY29tbWl0Jyk7XG5pbXBvcnQgY29kZXBpcGVsaW5lID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWNvZGVwaXBlbGluZScpO1xuaW1wb3J0IGNvZGVwaXBlbGluZV9hY3Rpb25zID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWNvZGVwaXBlbGluZS1hY3Rpb25zJyk7XG5pbXBvcnQgczMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMnKTtcbmltcG9ydCBpYW0gPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtaWFtJyk7XG5pbXBvcnQga21zID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWttcycpO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnOyBcbmltcG9ydCB7IEFwcCwgU3RhY2ssIFN0YWNrUHJvcHMsIFJlbW92YWxQb2xpY3ksIENmbk91dHB1dCwgQ29uc3RydWN0Tm9kZSwgQ29uc3RydWN0LCAgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIFN0YXRpY1dlYlVJUGlwZWxpbmVTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gICBzdGFnZU5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRpY1dlYlVJUGlwZWxpbmVTdGFjayBleHRlbmRzIFN0YWNre1xuICAvL3JlYWRvbmx5IGxhbWJkYUNvZGU6IGxhbWJkYS5DZm5QYXJhbWV0ZXJzQ29kZTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgaWQ6IHN0cmluZywgcHJvcHM6IFN0YXRpY1dlYlVJUGlwZWxpbmVTdGFja1Byb3BzKSB7XG5cbiAgICBzdXBlcihhcHAsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBzdGF0aWNXZWJVaV9yZXBvc2l0b3J5ID0gY29kZWNvbW1pdC5SZXBvc2l0b3J5LmZyb21SZXBvc2l0b3J5TmFtZSh0aGlzLCAnQ29kZUNvbW1pdFJlcG8nLCBcIlN0YXRpY1dlYlVJXCIpO1xuICAgIGNvbnN0IHN0YXRpY1dlYlVpX3JlcG9zaXRvcnlfdXJsID0gY29kZWNvbW1pdC5SZXBvc2l0b3J5LmZyb21SZXBvc2l0b3J5TmFtZSh0aGlzLCAnQ29kZUNvbW1pdFJlcG9VcmwnLCBcIlN0YXRpY1dlYlVJXCIpLnJlcG9zaXRvcnlDbG9uZVVybEh0dHA7XG4gICAgY29uc3Qga2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1N0YXRpY1dlYi1BcnRpZmFjdEtleScsIHtcbiAgICAgIGFsaWFzOiAna2V5L3N0YXRpYy13ZWItYXJ0aWZhY3Qta2V5JyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGFydGlmYWN0QnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnU3RhdGljQXJ0aWZhY3RCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiAnc3RhdGljLXdlYi11aS1hcnRpZmFjdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNUyxcbiAgICAgIGVuY3J5cHRpb25LZXk6IGtleVxuICAgIH0pO1xuICAgIFxuICAgIGNvbnN0IFN0YXRpY1dlYlVpQnVpbGQgPSBuZXcgY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCh0aGlzLCAnU3RhdGljV2ViVWlCdWlsZCcsIHtcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tT2JqZWN0KHtcbiAgICAgICAgdmVyc2lvbjogJzAuMicsXG4gICAgICAgIHBoYXNlczoge1xuICAgICAgICAgIGluc3RhbGw6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgLy8gYGdpdCBjbG9uZSAke3N0YXRpY1dlYlVpX3JlcG9zaXRvcnlfdXJsfWAsXG4gICAgICAgICAgICAgIC8vJ2NkIFN0YXRpY1dlYlVJJyxcbiAgICAgICAgICAgICAgJ25wbSBpbnN0YWxsJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAnbnBtIHJ1biBidWlsZCcsXG4gICAgICAgICAgICAgICducG0gcnVuIGNkayBzeW50aCAtLSAtbyBkaXN0J1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICAnYmFzZS1kaXJlY3RvcnknOiAnZGlzdCcsXG4gICAgICAgICAgZmlsZXM6IFtcbiAgICAgICAgICAgIFwiKlwiLFxuICAgICAgICAgICAgJypBcHBsaWNhdGlvblN0YWNrLnRlbXBsYXRlLmpzb24nLCAnbWFuaWZlc3QuanNvbicsXG4gICAgICAgICAgICBcImJpbi8qXCIsIFwibGliLypcIiwgXCJleGFtcGxlLWJ1aWxkLypcIlxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuQU1BWk9OX0xJTlVYXzIsXG4gICAgICB9LFxuICAgICAgZW5jcnlwdGlvbktleToga2V5XG4gICAgfSk7XG5cbiAgICBjb25zdCBzb3VyY2VPdXRwdXQgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCk7XG4gICAgY29uc3Qgc3RhdGljV2ViVUlCdWlsZE91dHB1dCA9IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoJ1N0YXRpY1dlYlVJQnVpbGRPdXRwdXQnKTtcblxuICAgIGNvbnN0IHBpcGVsaW5lID0gbmV3IGNvZGVwaXBlbGluZS5QaXBlbGluZSh0aGlzLCAnUGlwZWxpbmUnLCB7XG4gICAgICBwaXBlbGluZU5hbWU6ICdzdGF0aWMtd2ViVWktcGlwZWxpbmUnLFxuICAgICAgYXJ0aWZhY3RCdWNrZXQ6IGFydGlmYWN0QnVja2V0LFxuICAgICAgc3RhZ2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGFnZU5hbWU6ICdTb3VyY2UnLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlQ29tbWl0U291cmNlQWN0aW9uKHtcbiAgICAgICAgICAgICAgYWN0aW9uTmFtZTogJ0NvZGVDb21taXRfU291cmNlJyxcbiAgICAgICAgICAgICAgcmVwb3NpdG9yeTogc3RhdGljV2ViVWlfcmVwb3NpdG9yeSxcbiAgICAgICAgICAgICAgb3V0cHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhZ2VOYW1lOiAnQnVpbGQnLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlQnVpbGRBY3Rpb24oe1xuICAgICAgICAgICAgICBhY3Rpb25OYW1lOiAnQXBwbGljYXRpb25fQnVpbGQnLFxuICAgICAgICAgICAgICBwcm9qZWN0OiBTdGF0aWNXZWJVaUJ1aWxkLFxuICAgICAgICAgICAgICBpbnB1dDogc291cmNlT3V0cHV0LFxuICAgICAgICAgICAgICBvdXRwdXRzOiBbc3RhdGljV2ViVUlCdWlsZE91dHB1dF0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGFnZU5hbWU6ICdEZXBsb3lfY2RrX0RldicsXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNsb3VkRm9ybWF0aW9uQ3JlYXRlVXBkYXRlU3RhY2tBY3Rpb24oe1xuICAgICAgICAgICAgICBhY3Rpb25OYW1lOiAnRGVwbG95JyxcbiAgICAgICAgICAgICAgdGVtcGxhdGVQYXRoOiBzdGF0aWNXZWJVSUJ1aWxkT3V0cHV0LmF0UGF0aCgnU3RhdGljV2ViVWlBcHBsaWNhdGlvblN0YWNrLnRlbXBsYXRlLmpzb24nKSxcbiAgICAgICAgICAgICAgc3RhY2tOYW1lOiAnU3RhdGljV2ViVWlBcHBsaWNhdGlvblN0YWNrJyxcbiAgICAgICAgICAgICAgYWRtaW5QZXJtaXNzaW9uczogdHJ1ZSxcbiAgICAgICAgICAgICAgLypwYXJhbWV0ZXJPdmVycmlkZXM6e1xuICAgICAgICAgICAgICAgIFthcnRpZmFjdEJ1Y2tldC5idWNrZXROYW1lXTogY2RrQnVpbGRPdXRwdXQuYnVja2V0TmFtZSxcbiAgICAgICAgICAgICAgICBbYXJ0aWZhY3RCdWNrZXQuYnVja2V0TmFtZV06IGNka0J1aWxkT3V0cHV0Lm9iamVjdEtleSxcbiAgICAgICAgICAgICAgICBbYXJ0aWZhY3RCdWNrZXQuYnVja2V0TmFtZV06IFwiMVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHBhcmFtZXRlck92ZXJyaWRlczp7XG4gICAgICAgICAgICAgICAgLi4udGhpcy5sYW1iZGFDb2RlLmFzc2lnbihzdGF0aWNXZWJVSUJ1aWxkT3V0cHV0LnMzTG9jYXRpb24pXG4gICAgICAgICAgICAgIH0qL1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXSxcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ0FydGlmYWN0QnVja2V0RW5jcnlwdGlvbktleUFybicsIHtcbiAgICAgIHZhbHVlOiBrZXkua2V5QXJuLFxuICAgICAgZXhwb3J0TmFtZTogJ1N0YXRpY1dlYi1BcnRpZmFjdEJ1Y2tldC1FbmNyeXB0aW9uS2V5J1xuICAgIH0pO1xuXG4gIH1cbn0iXX0=