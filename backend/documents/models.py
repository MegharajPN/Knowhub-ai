import os

from django.conf import settings
from django.db import models


def document_upload_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()
    return f"documents/user_{instance.uploaded_by_id}/{instance.id}{extension}"


class Document(models.Model):
    STATUS_CHOICES = [
        ("uploaded", "Uploaded"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    title = models.CharField(max_length=255)

    file = models.FileField(
        upload_to=document_upload_path,
    )

    file_size = models.PositiveBigIntegerField(default=0)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="uploaded",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
    
class DocumentChunk(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
    )

    chunk_number = models.PositiveIntegerField()
    page_number = models.PositiveIntegerField()

    content = models.TextField()

    embedding = models.JSONField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["chunk_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "chunk_number"],
                name="unique_document_chunk",
            )
        ]
        indexes = [
            models.Index(
                fields=["document", "page_number"],
                name="document_page_idx",
            )
        ]

    def __str__(self):
        return (
            f"{self.document.title} - "
            f"Chunk {self.chunk_number}"
        )