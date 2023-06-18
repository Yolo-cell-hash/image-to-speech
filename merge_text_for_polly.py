import boto3

def lambda_handler(event, context):
    # Get the key of the newly created text file in Bucket 5
    key = event['Records'][0]['s3']['object']['key']
    
    # Extract the filename and extension
    filename, extension = key.split('.')
    
    # Retrieve the contents of text files from Bucket 2 to Bucket 4
    s3_client = boto3.client('s3')
    
    merged_content = ''
    
    # Headline - The image file contains
    merged_content += 'The image file can be captioned as: \n'
    
    # Bucket 4 - image-caption-text-files
    bucket_name = 'image-caption-text-files'
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=f'{filename}.{extension}')
        content = response['Body'].read().decode('utf-8')
        merged_content += content + '\n'
    except s3_client.exceptions.NoSuchKey:
        # Handle the case when the file does not exist in the bucket
        pass
    
    # Headline - Caption
    merged_content += '\nThe image contains the following elements: \n'
    
    # Bucket 3 - rekognition-text-storage-bucket
    bucket_name = 'rekognition-text-storage-bucket'
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=f'{filename}.{extension}')
        content = response['Body'].read().decode('utf-8')
        merged_content += content + '\n'
    except s3_client.exceptions.NoSuchKey:
        # Handle the case when the file does not exist in the bucket
        pass
    
    # Headline - Text
    merged_content += '\n'
    
    # Bucket 2 - text-bucket-detected-images
    bucket_name = 'text-bucket-detected-images'
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=f'{filename}.{extension}')
        content = response['Body'].read().decode('utf-8')
        if content.strip() == '':
            merged_content += 'No Text recognised in the file\n'
        else:
            merged_content += 'The image has following text\n' + content + '\n'
    except s3_client.exceptions.NoSuchKey:
        # Handle the case when the file does not exist in the bucket
        pass
    
    # Create a new merged text file in the "merge-text-for-polly" bucket
    merged_bucket = 'merge-text-for-polly'
    merged_key = f'{filename}_merged.{extension}'
    s3_client.put_object(Body=merged_content.encode('utf-8'), Bucket=merged_bucket, Key=merged_key)
