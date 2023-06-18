import boto3
import os

def lambda_handler(event, context):
    # Initialize Rekognition and S3 clients
    client = boto3.client("rekognition")
    s3 = boto3.client("s3")

    # List objects in the source bucket
    response = s3.list_objects_v2(Bucket="file-store-bucket-for-image-text-app")

    # Retrieve the most recently uploaded image
    objects = response["Contents"]
    objects.sort(key=lambda obj: obj["LastModified"], reverse=True)

    if objects:
        latest_object = objects[0]
        object_key = latest_object["Key"]
        file_name_with_extension = os.path.basename(object_key)
        file_name = os.path.splitext(file_name_with_extension)[0]

        # Read the image file from the source bucket as bytes
        fileObj = s3.get_object(Bucket="file-store-bucket-for-image-text-app", Key=object_key)
        file_content = fileObj["Body"].read()

        # Detect labels in the image
        response = client.detect_labels(
            Image={"Bytes": file_content},
            MaxLabels=10,
            MinConfidence=60
        )

        # Extract the "Name" attribute from each label
        labels = [label["Name"] for label in response["Labels"]]

        # Join the label names into a string
        labels_str = "\n".join(labels)

        # Save the label names to a .txt file in the destination bucket
        output_key = f"{file_name}.txt"
        s3.put_object(Body=labels_str.encode(), Bucket="rekognition-text-storage-bucket", Key=output_key)

    return "Thanks"
