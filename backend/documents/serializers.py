
import os
from rest_framework import serializers
from .models import Document

class DocumentAskSerializer(serializers.Serializer):
    question = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=1000,
    )

    top_k = serializers.IntegerField(
        required=False,
        default=5,
        min_value=1,
        max_value=10,
    )
    
class DocumentSearchSerializer(serializers.Serializer):
    query = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=1000,
    )

    top_k = serializers.IntegerField(
        required=False,
        default=5,
        min_value=1,
        max_value=10,
    )
    
class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "file_size",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "title",
            "file_size",
            "status",
            "created_at",
        ]

    def validate_file(self, uploaded_file):
        extension = os.path.splitext(uploaded_file.name)[1].lower()

        if extension != ".pdf":
            raise serializers.ValidationError(
                "Only PDF documents are allowed."
            )

        if uploaded_file.size > 20 * 1024 * 1024:
            raise serializers.ValidationError(
                "PDF size cannot exceed 20 MB."
            )

        signature = uploaded_file.read(5)
        uploaded_file.seek(0)

        if signature != b"%PDF-":
            raise serializers.ValidationError(
                "The uploaded file is not a valid PDF."
            )

        return uploaded_file

    def create(self, validated_data):
        uploaded_file = validated_data["file"]

        validated_data["title"] = os.path.splitext(
            uploaded_file.name
        )[0]

        validated_data["file_size"] = uploaded_file.size

        return super().create(validated_data)


# for reference, here is the previous version of the DocumentSerializer without the file_url field and its corresponding method:
# class DocumentSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Document
#         fields = [
#             "id",
#             "title",
#             "file",
#             "file_size",
#             "status",
#             "created_at",
#         ]
#         read_only_fields = [
#             "id",
#             "title",
#             "file_size",
#             "status",
#             "created_at",
#         ]

#     def validate_file(self, uploaded_file):
#         extension = os.path.splitext(uploaded_file.name)[1].lower()

#         if extension != ".pdf":
#             raise serializers.ValidationError(
#                 "Only PDF documents are allowed."
#             )

#         if uploaded_file.size > 20 * 1024 * 1024:
#             raise serializers.ValidationError(
#                 "PDF size cannot exceed 20 MB."
#             )

#         signature = uploaded_file.read(5)
#         uploaded_file.seek(0)

#         if signature != b"%PDF-":
#             raise serializers.ValidationError(
#                 "The uploaded file is not a valid PDF."
#             )

#         return uploaded_file

#     def create(self, validated_data):
#         uploaded_file = validated_data["file"]

#         validated_data["title"] = os.path.splitext(
#             uploaded_file.name
#         )[0]

#         validated_data["file_size"] = uploaded_file.size

#         return super().create(validated_data)