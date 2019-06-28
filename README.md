# aws-lambda-unzip-js
Node.js function for AWS Lambda to extract zip files uploaded to S3. The zip file will be deleted at the end of the operation.

This is a fork of the project of [Carlos Carcamo](https://github.com/carloscarcamo/aws-lambda-unzip-js) that was changed to be used into a CodePipeline continuous deploy process.

In this code the S3 input file (and bucket) is provided by CodePipeline input artifact, the output folder that will store the decompressed files is retrieved by the Lambda function by a enviorment variable.

Finally the lambda function calls the CodePipeline result in order to notify the job ending.

## Permissions

To remove the uploaded zip file, the role configured in your Lambda function should have a policy similar to this:

```json
{
    "Effect": "Allow",
    "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
    ],
    "Resource": [
        "arn:aws:s3:::mybucket"
    ]
}
```

To allow the lambda function to mark a CodePipeline job as "success" or "failure", it should have the permission:

```json
{
    "Version": "2012-10-17", 
    "Statement": [
    {
        "Action": [ 
        "logs:*"
        ],
        "Effect": "Allow", 
        "Resource": "arn:aws:logs:*:*:*"
    },
    {
        "Action": [
        "codepipeline:PutJobSuccessResult",
        "codepipeline:PutJobFailureResult"
        ],
        "Effect": "Allow",
        "Resource": "*"
        }
    ]
} 
```


# Acknowledgment

Special thanks for the project to [Carlos Carcamo](https://github.com/carloscarcamo) by providing the inicial project that this one was based on.
