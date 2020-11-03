import { App, Stack, StackProps } from '@aws-cdk/core';
export interface StaticWebUIPipelineStackProps extends StackProps {
    stageName: string;
}
export declare class StaticWebUIPipelineStack extends Stack {
    constructor(app: App, id: string, props: StaticWebUIPipelineStackProps);
}
