'use strict'

let AWS = require('aws-sdk')
let Rx = require('rx')
let AdmZip = require('adm-zip')
let mime = require('mime-types')

let s3 = new AWS.S3({ apiVersion: '2006-03-01' })
var codepipeline = new AWS.CodePipeline()

// It`s up to you config a environment variable into the lambda update form
let destinationBucket = process.env.DESTINATION_BUCKET || 'my-default-bucket'

exports.handler = (event, context, callback) => {
  // Notify AWS CodePipeline of a successful job
  var putJobSuccess = (message) => {
    var params = {
      jobId: jobId
    }
    codepipeline.putJobSuccessResult(params, (err, data) => {
      if (err) {
        context.fail(err)
      } else {
        context.succeed(message)
      }
    })
  }

  // Notify AWS CodePipeline of a failed job
  var putJobFailure = (message) => {
    var params = {
      jobId: jobId,
      failureDetails: {
        message: JSON.stringify(message),
        type: 'JobFailed',
        externalExecutionId: context.invokeid
      }
    }
    codepipeline.putJobFailureResult(params, (err, data) => {
      if (err) {
        context.fail(err)
      } else {
        context.fail(message)
      }
    })
  }

  // Here you take the ZIP file, generated from CodeBuild, for example
  try {
    console.log(event['CodePipeline.job'])

    var jobId = event['CodePipeline.job'].id
    let originBucket = event['CodePipeline.job'].data.inputArtifacts[0].location.s3Location.bucketName
    let fileKey = event['CodePipeline.job'].data.inputArtifacts[0].location.s3Location.objectKey

    // console.log(`BEFORE: Load ${originBucket}/${fileKey}`)

    let params = { Bucket: originBucket, Key: fileKey }

    s3.getObject(params, (err, data) => {
      if (err) {
        console.log(`ERR: onloading: ${originBucket}/${fileKey}`)

        putJobFailure(err)
      } else {
        if (!data) callback(null, 'No Data!')
        let zip = new AdmZip(data.Body)
        let zipEntries = zip.getEntries() // ZipEntry objects
        let source = Rx.Observable.from(zipEntries)
        let results = []

        source.subscribe(
          (zipEntry) => {
            let params = {
              // The Content-type is required if you are publishing a website.
              // If not, you may comment the following line in order to keep
              // the Content-disposition as 'attachment'
              ContentType: mime.lookup(zipEntry.name),
              Bucket: destinationBucket,
              Key: zipEntry.entryName, // Keeps the full path (folders)
              Body: zipEntry.getData() // decompressed file as buffer
            }
            // console.log(`BEFORE: putObject ${destinationBucket}/${zipEntry.entryName}`)
            // upload decompressed file
            s3.putObject(params, (err, data) => {
              if (err) putJobFailure(err) // an error occurred
              else results.push(data) // successful response
            })
          },
          (err) => {
            console.log(`ERR: onUploading:`)
            putJobFailure(err)
          },
          () => {
            let params = { Bucket: originBucket, Key: fileKey };
            // Delete zip file
            s3.deleteObject(params, (err, data) => {
              if (err) {
                putJobFailure(err)
              } else {
                putJobSuccess('Finished')
              }
            })
          }
        )
      }
    })
  } catch (e) {
    putJobFailure(e)
  }
}
