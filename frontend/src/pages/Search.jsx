import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import searchDocuments from "../services/searchService";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const data = await searchDocuments(query.trim(), 5);
      setResults(data.results || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to search documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Search Knowledge
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Search your uploaded PDFs using natural language.
      </Typography>

      <Box component="form" onSubmit={handleSearch}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            fullWidth
            placeholder="Ask something about your documents..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchIcon />}
            disabled={loading || !query.trim()}
          >
            Search
          </Button>
        </Stack>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mt: 3 }}>
          {error}
        </Typography>
      )}

      {!loading && results.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Search Results ({results.length})
          </Typography>

          <Stack spacing={2}>
            {results.map((result) => (
              <Card key={result.chunk_id} variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography fontWeight={600}>
                      {result.document_title}
                    </Typography>

                    <Chip
                      size="small"
                      label={`Page ${result.page_number}`}
                    />
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
                  >
                    {result.content}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 2 }}
                  >
                    Similarity score: {result.similarity}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {!loading && query && !error && results.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 4 }}>
          No matching document content found.
        </Typography>
      )}
    </Container>
  );
}