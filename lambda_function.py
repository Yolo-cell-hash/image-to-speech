import boto3
import json

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    textract = boto3.client('textract')
    destination_bucket_name = 'text-bucket-detected-images'

    for record in event['Records']:
        source_bucket_name = record['s3']['bucket']['name']
        source_key_name = record['s3']['object']['key']

        response = textract.analyze_document(
            Document={
                'S3Object': {
                    'Bucket': source_bucket_name,
                    'Name': source_key_name,
                }
            },
            FeatureTypes=['FORMS', 'TABLES']
        )

        extracted_text = ""
        blocks = response['Blocks']
        for block in blocks:
            if block['BlockType'] == 'LINE':
                extracted_text += block['Text'] + '\n\n'

        destination_key_name = source_key_name.rsplit('.', 1)[0] + '.txt'
        s3.put_object(Body=extracted_text, Bucket=destination_bucket_name, Key=destination_key_name)

    return {
        'statusCode': 200,
        'body': json.dumps('Extracted text stored in a file!')
    }
