import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  AddLink,
  DeleteOutline,
  Language,
  OpenInNew,
  Refresh,
  ExpandMore,
  ExpandLess,
  ArticleOutlined,
} from "@mui/icons-material";

import webSourceService from "../services/webSourceService";

function WebSources() {
  const [sources, setSources] = useState([]);
  const [rootUrl, setRootUrl] = useState("");
  const [maxPages, setMaxPages] = useState(5);

  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSources = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await webSourceService.getWebSources();

      const results = Array.isArray(data)
        ? data
        : data.results || [];

      setSources(results);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load website sources."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleAddWebsite = async (event) => {
    event.preventDefault();

    if (!rootUrl.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    try {
      setCrawling(true);
      setError("");
      setSuccess("");

      await webSourceService.createWebSource(
        rootUrl.trim(),
        Number(maxPages)
      );

      setRootUrl("");
      setMaxPages(5);

      await loadSources();

      setSuccess("Website crawled and indexed successfully.");
    } catch (err) {
      const responseData = err.response?.data;

      setError(
        responseData?.detail ||
        responseData?.root_url?.[0] ||
        responseData?.error ||
        "Website crawling failed. Please check the URL and try again."
      );
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this website source and its indexed pages?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      await webSourceService.deleteWebSource(id);

      setSources((previous) =>
        previous.filter((source) => source.id !== id)
      );

      setSuccess("Website source deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to delete website source."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "processing":
        return "info";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const totalPages = sources.reduce(
    (total, source) => total + (source.pages_count || 0),
    0
  );

  return (
    <Box>
      {/* Page heading */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
            color="#0F172A"
          >
            Web Sources
          </Typography>

          <Typography color="#64748B" fontSize={14} mt={0.5}>
            Crawl websites and add their content to your AI knowledge base.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadSources}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Box>

      {/* Notifications */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
        >
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

      {/* Statistics */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="#64748B" fontSize={13}>
              Total Websites
            </Typography>
            <Typography variant="h4" fontWeight={800} mt={1}>
              {sources.length}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="#64748B" fontSize={13}>
              Indexed Pages
            </Typography>
            <Typography variant="h4" fontWeight={800} mt={1}>
              {totalPages}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="#64748B" fontSize={13}>
              Completed Crawls
            </Typography>
            <Typography variant="h4" fontWeight={800} mt={1}>
              {sources.filter(
                (source) => source.status === "completed"
              ).length}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Add website form */}
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <AddLink color="primary" />
            <Typography fontWeight={700} fontSize={17}>
              Add Website
            </Typography>
          </Stack>

          <Typography color="#64748B" fontSize={13} mb={3}>
            Enter a public website URL. KnowHub AI will crawl its pages,
            extract content, and generate embeddings for AI search.
          </Typography>

          <Box component="form" onSubmit={handleAddWebsite}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                fullWidth
                label="Website URL"
                placeholder="https://example.com"
                value={rootUrl}
                onChange={(event) => setRootUrl(event.target.value)}
                disabled={crawling}
                required
                size="small"
              />

              <TextField
                label="Maximum pages"
                type="number"
                size="small"
                value={maxPages}
                onChange={(event) => setMaxPages(event.target.value)}
                disabled={crawling}
                inputProps={{ min: 1, max: 20 }}
                sx={{ minWidth: { sm: 140 } }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={
                  crawling ||
                  !rootUrl.trim() ||
                  Number(maxPages) < 1 ||
                  Number(maxPages) > 20
                }
                startIcon={
                  crawling ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AddLink />
                  )
                }
                sx={{
                  minWidth: 145,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                {crawling ? "Crawling..." : "Add Website"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Website list */}
      <Box>
        <Typography fontWeight={700} fontSize={17} mb={2}>
          Your Websites
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : sources.length === 0 ? (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Language
                sx={{ fontSize: 48, color: "#94A3B8", mb: 1 }}
              />

              <Typography fontWeight={700}>
                No websites added yet
              </Typography>

              <Typography color="#64748B" fontSize={13} mt={1}>
                Add your first website to expand your knowledge base.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {sources.map((source) => {
              const pages = source.pages || [];
              const expanded = expandedId === source.id;

              return (
                <Card
                  key={source.id}
                  sx={{ borderRadius: 3 }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      spacing={2}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2,
                          bgcolor: "#EFF6FF",
                          color: "#2563EB",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Language />
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          {source.title || source.root_url}
                        </Typography>

                        <Link
                          href={source.root_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          fontSize={12}
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            wordBreak: "break-all",
                          }}
                        >
                          {source.root_url}
                          <OpenInNew sx={{ fontSize: 13 }} />
                        </Link>

                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                          mt={1.5}
                        >
                          <Chip
                            size="small"
                            label={source.status || "unknown"}
                            color={getStatusColor(source.status)}
                          />

                          <Chip
                            size="small"
                            variant="outlined"
                            icon={<ArticleOutlined />}
                            label={`${source.pages_count || 0} pages`}
                          />
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedId(expanded ? null : source.id)
                          }
                          title="View crawled pages"
                        >
                          {expanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          disabled={deletingId === source.id}
                          onClick={() => handleDelete(source.id)}
                          title="Delete website"
                        >
                          {deletingId === source.id ? (
                            <CircularProgress size={18} />
                          ) : (
                            <DeleteOutline />
                          )}
                        </IconButton>
                      </Stack>
                    </Stack>

                    {source.error_message && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {source.error_message}
                      </Alert>
                    )}

                    <Collapse in={expanded}>
                      <Divider sx={{ my: 2 }} />

                      <Typography
                        fontWeight={700}
                        fontSize={13}
                        mb={1.5}
                      >
                        Crawled Pages ({pages.length})
                      </Typography>

                      {pages.length === 0 ? (
                        <Typography color="#64748B" fontSize={13}>
                          No page details available.
                        </Typography>
                      ) : (
                        <Stack spacing={1.5}>
                          {pages.map((page) => (
                            <Box
                              key={page.id}
                              sx={{
                                p: 1.5,
                                bgcolor: "#F8FAFC",
                                borderRadius: 2,
                              }}
                            >
                              <Typography fontWeight={600} fontSize={13}>
                                {page.title || page.url}
                              </Typography>

                              <Link
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                fontSize={12}
                                underline="hover"
                                sx={{ wordBreak: "break-all" }}
                              >
                                {page.url}
                              </Link>

                              {page.content && (
                                <Typography
                                  color="#64748B"
                                  fontSize={12}
                                  mt={1}
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {page.content}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default WebSources;