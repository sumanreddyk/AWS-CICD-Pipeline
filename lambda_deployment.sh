# DEPRECATED. We use CDK in this house, now! Left around for posterity
cd lambda-1
rm lambda.zip
zip -r lambda.zip index.js
echo "/-------------------------"
echo "|UPLOADING TO LAMBDA LAND|"
echo "-------------------------/"
aws lambda update-function-code --function-name DevApplicationDeploymentStack-LambdaD247545B-R5SFLQFMASH6 --zip-file fileb://./lambda.zip

aws lambda update-function-code --function-name IL_Other_02_CheckTime --s3-bucket jcoinbiz-dev-s3-resources-for-lambda --s3-key Lambda/Function/Infra/IL_Other_02_CheckTime.zip

build: {
   commands: [
       `zip ${process.env.S3_OBJECT} *`,
        `aws s3 cp ${process.env.S3_OBJECT} s3://${process.env.S3_BUCKET}/`,
    ],
  },
 post_build: {
    commands: [
       'echo Updating function code...',
       `aws lambda update-function-code --function-name ${lambdaName} --s3-bucket ${process.env.S3_BUCKET} --s3-key ${process.env.S3_OBJECT}`,
   ],
 },
 