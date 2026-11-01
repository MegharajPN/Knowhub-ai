
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";

import documentService from "../services/documentService";

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Documents() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await documentService.getDocuments();
      setDocuments(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("PDF size cannot exceed 20 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      await documentService.uploadDocument(file);

      setSuccess("Document uploaded successfully.");
      await loadDocuments();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.file?.[0] ||
        data?.detail ||
        "Document upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) return;

    try {
      setError("");
      await documentService.deleteDocument(id);

      setDocuments((previous) =>
        previous.filter((document) => document.id !== id)
      );

      setSuccess("Document deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to delete document."
      );
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Documents
          </Typography>

          <Typography color="text.secondary" mt={1}>
            Upload and manage your knowledge base PDFs.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDocuments}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 5,
          textAlign: "center",
          borderStyle: "dashed",
          borderWidth: 2,
          borderColor: "primary.light",
          mb: 4,
          borderRadius: 3,
        }}
      >
        <CloudUploadIcon
          sx={{ fontSize: 52, color: "primary.main", mb: 1 }}
        />

        <Typography variant="h6" fontWeight={600}>
          Upload your PDF documents
        </Typography>

        <Typography color="text.secondary" sx={{ my: 1 }}>
          Select a PDF file up to 20 MB.
        </Typography>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={handleUpload}
        />

        <Button
          variant="contained"
          startIcon={
            uploading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <CloudUploadIcon />
            )
          }
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          sx={{ mt: 2 }}
        >
          {uploading ? "Uploading..." : "Choose PDF"}
        </Button>
      </Paper>

      <Typography variant="h6" fontWeight={700} mb={2}>
        Your documents ({documents.length})
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
          <Typography color="text.secondary">
            No documents uploaded yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {documents.map((document) => (
            <Paper
              key={document.id}
              variant="outlined"
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRadius: 2,
              }}
            >
              <PictureAsPdfIcon
                sx={{ fontSize: 38, color: "#DC2626" }}
              />

              <Box flex={1} minWidth={0}>
                <Typography fontWeight={600} noWrap>
                  {document.title}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(document.file_size)} ·{" "}
                  {new Date(document.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              <Typography
                variant="caption"
                sx={{ textTransform: "capitalize" }}
              >
                {document.status}
              </Typography>

              <IconButton
                color="error"
                onClick={() => handleDelete(document.id)}
                aria-label="Delete document"
              >
                <DeleteIcon />
              </IconButton>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}