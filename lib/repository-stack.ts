// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import codecommit = require('@aws-cdk/aws-codecommit');
import { App, Stack, StackProps } from '@aws-cdk/core';

interface RepositoryProps extends StackProps{
  readonly repoName: string,
  readonly repositoryDescription: string
}
export class RepositoryStack extends Stack {
  constructor(app: App, id: string, props: RepositoryProps) {

    super(app, id, props);

    new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: props.repoName,
      description: props.repositoryDescription,
    });

  }
}