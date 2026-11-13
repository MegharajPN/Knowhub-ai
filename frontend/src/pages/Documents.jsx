
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  CloudUpload,
  PictureAsPdf,
  DeleteOutline,
  Refresh,
  Search,
  Description,
  CheckCircleOutline,
  Schedule,
  ErrorOutline,
  UploadFile,
  FolderOpen,
} from "@mui/icons-material";

import documentService from "../services/documentService";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} Bytes`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusConfig(status) {
  const configs = {
    completed: {
      label: "Completed",
      color: "success",
      icon: <CheckCircleOutline fontSize="small" />,
    },
    processing: {
      label: "Processing",
      color: "warning",
      icon: <Schedule fontSize="small" />,
    },
    uploaded: {
      label: "Uploaded",
      color: "info",
      icon: <UploadFile fontSize="small" />,
    },
    failed: {
      label: "Failed",
      color: "error",
      icon: <ErrorOutline fontSize="small" />,
    },
  };

  return configs[status] || {
    label: status || "Unknown",
    color: "default",
    icon: <Description fontSize="small" />,
  };
}

export default function Documents() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dragging, setDragging] = useState(false);

  const loadDocuments = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      setError("");

      const data = await documentService.getDocuments();

      const documentList = Array.isArray(data)
        ? data
        : data.results || [];

      setDocuments(documentList);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (file) => {
    if (!file) return;

    setError("");
    setSuccess("");

    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      (file.type && file.type !== "application/pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("PDF size cannot exceed 20 MB.");
      return;
    }

    try {
      setUploading(true);

      await documentService.uploadDocument(file);

      setSuccess("Document uploaded successfully.");

      await loadDocuments(false);
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.file?.[0] ||
        data?.detail ||
        "Document upload failed."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];
    handleUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (uploading) return;

    const file = event.dataTransfer.files?.[0];
    handleUpload(file);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this document?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

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

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const matchesSearch = (document.title || "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        document.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [documents, search, statusFilter]);

  const completedCount = documents.filter(
    (document) => document.status === "completed"
  ).length;

  const processingCount = documents.filter(
    (document) => document.status === "processing"
  ).length;

  const failedCount = documents.filter(
    (document) => document.status === "failed"
  ).length;

  const statistics = [
    {
      label: "Total Documents",
      value: documents.length,
      icon: <Description />,
      color: "#2563EB",
      background: "#DBEAFE",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: <CheckCircleOutline />,
      color: "#16A34A",
      background: "#DCFCE7",
    },
    {
      label: "Processing",
      value: processingCount,
      icon: <Schedule />,
      color: "#D97706",
      background: "#FEF3C7",
    },
    {
      label: "Failed",
      value: failedCount,
      icon: <ErrorOutline />,
      color: "#DC2626",
      background: "#FEE2E2",
    },
  ];

  return (
    <Box sx={{ maxWidth: 1250, mx: "auto" }}>

      {/* Page heading */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Documents
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Manage your documents and build your AI knowledge base.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            loading ? (
              <CircularProgress size={16} />
            ) : (
              <Refresh />
            )
          }
          onClick={() => loadDocuments()}
          disabled={loading || uploading}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Notifications */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      {/* Statistics */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 4,
        }}
      >
        {statistics.map((stat) => (
          <Card
            key={stat.label}
            elevation={0}
            sx={{
              border: "1px solid #E2E8F0",
              borderRadius: 3,
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {stat.label}
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ mt: 1 }}
                  >
                    {stat.value}
                  </Typography>
                </Box>

                <Avatar
                  sx={{
                    bgcolor: stat.background,
                    color: stat.color,
                    width: 46,
                    height: 46,
                  }}
                >
                  {stat.icon}
                </Avatar>
              </Stack>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Upload area */}
      <Paper
        variant="outlined"
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={handleDrop}
        sx={{
          p: { xs: 3, md: 5 },
          mb: 4,
          textAlign: "center",
          borderRadius: 3,
          borderStyle: "dashed",
          borderWidth: 2,
          borderColor: dragging ? "#2563EB" : "#CBD5E1",
          bgcolor: dragging ? "#EFF6FF" : "#FFFFFF",
          transition: "all 0.2s ease",
        }}
      >
        <Avatar
          sx={{
            width: 62,
            height: 62,
            mx: "auto",
            mb: 2,
            bgcolor: "#DBEAFE",
            color: "#2563EB",
          }}
        >
          <CloudUpload sx={{ fontSize: 32 }} />
        </Avatar>

        <Typography variant="h6" fontWeight={700}>
          Upload your documents
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Drag and drop your PDF here, or browse files from your computer.
        </Typography>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={handleFileInput}
        />

        <Button
          variant="contained"
          startIcon={
            uploading ? (
              <CircularProgress size={17} color="inherit" />
            ) : (
              <CloudUpload />
            )
          }
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          sx={{
            mt: 2.5,
            px: 3,
            py: 1.2,
            borderRadius: 2,
            textTransform: "none",
            boxShadow: "none",
          }}
        >
          {uploading ? "Uploading document..." : "Choose PDF"}
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 2 }}
        >
          PDF files only · Maximum file size 20 MB
        </Typography>

        {uploading && (
          <Box sx={{ maxWidth: 350, mx: "auto", mt: 2 }}>
            <CircularProgress
              variant="indeterminate"
              size={20}
            />
            <Typography variant="caption" color="text.secondary">
              Processing your upload...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Document list heading */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Your Knowledge Base
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
          </Typography>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            placeholder="Search documents..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: { sm: 220 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Select
            size="small"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            sx={{ minWidth: 145 }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="uploaded">Uploaded</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </Stack>
      </Stack>

      {/* Documents */}
      {loading ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
          }}
        >
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Loading your documents...
          </Typography>
        </Paper>
      ) : filteredDocuments.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
          }}
        >
          <FolderOpen
            sx={{ fontSize: 48, color: "#94A3B8", mb: 1 }}
          />

          <Typography variant="h6" fontWeight={700}>
            {documents.length === 0
              ? "Your knowledge base is empty"
              : "No matching documents found"}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {documents.length === 0
              ? "Upload your first PDF to start asking questions with AI."
              : "Try changing your search or status filter."}
          </Typography>

          {documents.length > 0 && (
            <Button
              sx={{ mt: 2 }}
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </Paper>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Stack spacing={0}>
              {filteredDocuments.map((document, index) => {
                const status = getStatusConfig(document.status);

                return (
                  <Box key={document.id}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={{ xs: 1.2, sm: 2 }}
                      sx={{ py: 2 }}
                    >
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 46,
                          height: 46,
                          bgcolor: "#FEF2F2",
                          color: "#DC2626",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      >
                        <PictureAsPdf />
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          fontWeight={700}
                          fontSize={14}
                          noWrap
                        >
                          {document.title}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {formatFileSize(document.file_size)} ·{" "}
                          {formatDate(document.created_at)}
                        </Typography>
                      </Box>

                      <Stack
                        alignItems="flex-end"
                        spacing={0.8}
                        sx={{ flexShrink: 0 }}
                      >
                        <Chip
                          size="small"
                          icon={status.icon}
                          label={status.label}
                          color={status.color}
                          sx={{
                            fontWeight: 600,
                            "& .MuiChip-icon": { fontSize: 15 },
                          }}
                        />

                        <Tooltip title="Delete document">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(document.id)}
                            aria-label="Delete document"
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    {index !== filteredDocuments.length - 1 && (
                      <Divider />
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Paper>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mt: 3 }}
      >
        Your documents are securely associated with your account.
      </Typography>
    </Box>
  );
}
