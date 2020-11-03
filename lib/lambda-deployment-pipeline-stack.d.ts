import { App, Stack, StackProps } from '@aws-cdk/core';
export interface LambdaDeploymentPipelineStackProps extends StackProps {
    stageName: string;
}
export declare class LambdaDeploymentPipelineStack extends Stack {
    constructor(app: App, id: string, props: LambdaDeploymentPipelineStackProps);
}
