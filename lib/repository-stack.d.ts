import { App, Stack, StackProps } from '@aws-cdk/core';
interface RepositoryProps extends StackProps {
    readonly repoName: string;
    readonly repositoryDescription: string;
}
export declare class RepositoryStack extends Stack {
    constructor(app: App, id: string, props: RepositoryProps);
}
export {};
