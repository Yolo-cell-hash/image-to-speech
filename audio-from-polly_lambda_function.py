import boto3
import os

def lambda_handler(event, context):
    # Get the input text file path and name from the event
    input_bucket = 'merge-text-for-polly'  # Update with the correct input bucket name
    input_key = event['Records'][0]['s3']['object']['key']

    # Set the output audio file name to be the same as input file name without extension
    input_file_name = os.path.splitext(input_key)[0]
    output_key = f"{input_file_name}.mp3"

    # Create an AWS Polly client
    polly = boto3.client('polly')

    # Retrieve the content of the input text file
    s3 = boto3.resource('s3')
    obj = s3.Object(input_bucket, input_key)
    text = obj.get()['Body'].read().decode('utf-8')

    # Use Polly to synthesize speech from the text
    response = polly.synthesize_speech(
        OutputFormat='mp3',
        Text=text,
        VoiceId='Joanna'  # Customize the voice as needed
    )

    # Save the synthesized speech to the output S3 bucket
    output_bucket = 'audio-file-from-polly'  # Update with the correct output bucket name
    s3.Object(output_bucket, output_key).put(Body=response['AudioStream'].read())

    return {
        'statusCode': 200,
        'body': 'Speech synthesized and saved to S3'
    }
